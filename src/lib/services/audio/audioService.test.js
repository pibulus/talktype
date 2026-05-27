import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { liveMode, privacyMode } from '$lib';
import { resetStores, transcriptionState, uiState } from '../infrastructure/stores.js';
import { transcriptionStore } from '$lib/stores/transcriptionStore';
import {
	appendRecordingDraftJournalChunk,
	beginRecordingDraftJournal,
	saveRecordingDraft,
	updateRecordingDraftJournalMetadata
} from './recordingRecoveryStore.js';
import { AudioService } from './audioService.js';

vi.mock('$app/environment', () => ({
	browser: true,
	dev: false,
	building: false,
	version: 'test'
}));

vi.mock('./recordingRecoveryStore.js', () => ({
	beginRecordingDraftJournal: vi.fn(async (_sessionId, metadata) => ({
		id: 'latest',
		createdAt: Date.now(),
		metadata
	})),
	appendRecordingDraftJournalChunk: vi.fn(async (_sessionId, _sequence, _blob, metadata) => ({
		id: 'latest',
		createdAt: Date.now(),
		metadata
	})),
	updateRecordingDraftJournalMetadata: vi.fn(async (_sessionId, metadata) => ({
		id: 'latest',
		createdAt: Date.now(),
		metadata
	})),
	saveRecordingDraft: vi.fn(async (_blob, metadata) => ({
		id: 'latest',
		createdAt: Date.now(),
		metadata
	}))
}));

describe('AudioService', () => {
	let service;
	let originalMediaRecorder;
	let originalAudioContext;
	let originalRequestAnimationFrame;
	let originalCancelAnimationFrame;
	let originalWakeLock;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.mocked(saveRecordingDraft).mockClear();
		vi.mocked(beginRecordingDraftJournal).mockClear();
		vi.mocked(appendRecordingDraftJournalChunk).mockClear();
		vi.mocked(updateRecordingDraftJournalMetadata).mockClear();
		resetStores();
		liveMode.set('false');
		privacyMode.set('false');
		service = new AudioService();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
		resetStores();
		liveMode.set('false');
		privacyMode.set('false');
		service = null;
		global.MediaRecorder = originalMediaRecorder;
		window.MediaRecorder = originalMediaRecorder;
		window.AudioContext = originalAudioContext;
		window.requestAnimationFrame = originalRequestAnimationFrame;
		window.cancelAnimationFrame = originalCancelAnimationFrame;
		global.requestAnimationFrame = originalRequestAnimationFrame;
		global.cancelAnimationFrame = originalCancelAnimationFrame;
		if (originalWakeLock === undefined) {
			delete navigator.wakeLock;
		} else {
			Object.defineProperty(navigator, 'wakeLock', {
				configurable: true,
				value: originalWakeLock
			});
		}
	});

	function installRecordingMocks() {
		const track = {
			readyState: 'live',
			stop: vi.fn(),
			onended: null
		};
		const stream = {
			active: true,
			getTracks: vi.fn(() => [track]),
			getAudioTracks: vi.fn(() => [track])
		};

		originalMediaRecorder = global.MediaRecorder;
		originalAudioContext = window.AudioContext;
		originalRequestAnimationFrame = window.requestAnimationFrame;
		originalCancelAnimationFrame = window.cancelAnimationFrame;
		originalWakeLock = navigator.wakeLock;

		class MockMediaRecorder {
			static last = null;
			static isTypeSupported = vi.fn(() => true);

			constructor() {
				this.state = 'inactive';
				this.mimeType = 'audio/webm';
				this.ondataavailable = null;
				this.onstop = null;
				this.onerror = null;
				this.start = vi.fn(() => {
					this.state = 'recording';
				});
				this.requestData = vi.fn(() => {
					this.ondataavailable?.({
						data: new Blob(['checkpoint'], { type: 'audio/webm' })
					});
				});
				this.stop = vi.fn(() => {
					this.state = 'inactive';
					return this.onstop?.();
				});
				MockMediaRecorder.last = this;
			}
		}

		global.MediaRecorder = MockMediaRecorder;
		window.MediaRecorder = MockMediaRecorder;
		const audioContext = {
			state: 'running',
			resume: vi.fn().mockResolvedValue(undefined),
			suspend: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			createMediaStreamSource: vi.fn(() => ({
				connect: vi.fn(),
				disconnect: vi.fn()
			})),
			createAnalyser: vi.fn(() => ({
				fftSize: 0,
				frequencyBinCount: 1,
				getByteFrequencyData: vi.fn(),
				disconnect: vi.fn()
			}))
		};

		window.AudioContext = vi.fn(() => audioContext);
		vi.spyOn(service, 'initializeAudioContext').mockImplementation(async () => {
			service.audioContext = audioContext;
			return true;
		});
		vi.spyOn(service, 'requestPermissions').mockResolvedValue({ granted: true, stream });
		window.requestAnimationFrame = vi.fn(() => 1);
		window.cancelAnimationFrame = vi.fn();
		global.requestAnimationFrame = window.requestAnimationFrame;
		global.cancelAnimationFrame = window.cancelAnimationFrame;

		return { MockMediaRecorder, stream, track };
	}

	it('requests a screen wake lock while recording and releases it on stop', async () => {
		const { MockMediaRecorder } = installRecordingMocks();
		const release = vi.fn().mockResolvedValue(undefined);
		const request = vi.fn().mockResolvedValue({
			release,
			addEventListener: vi.fn()
		});
		Object.defineProperty(navigator, 'wakeLock', {
			configurable: true,
			value: { request }
		});

		await service.startRecording();
		await Promise.resolve();

		expect(request).toHaveBeenCalledWith('screen');

		MockMediaRecorder.last.ondataavailable?.({
			data: new Blob(['wake lock audio'], { type: 'audio/webm' })
		});
		const stopPromise = service.stopRecording();
		await vi.advanceTimersByTimeAsync(100);
		await stopPromise;

		expect(release).toHaveBeenCalledTimes(1);
	});

	it('shares one in-flight MediaRecorder stop across repeated stop calls', async () => {
		const audioChunk = new Blob(['x'.repeat(1200)], { type: 'audio/webm' });
		const stop = vi.fn(() => {
			service.mediaRecorder.state = 'inactive';
			service.mediaRecorder.onstop?.();
		});
		const requestData = vi.fn();

		service.audioChunks = [audioChunk];
		service.mediaRecorder = {
			state: 'recording',
			mimeType: 'audio/webm',
			requestData,
			stop
		};

		const firstStop = service.stopRecording();
		const secondStop = service.stopRecording();

		vi.advanceTimersByTime(100);
		const [firstBlob, secondBlob] = await Promise.all([firstStop, secondStop]);

		expect(requestData).toHaveBeenCalledTimes(1);
		expect(stop).toHaveBeenCalledTimes(1);
		expect(firstBlob.size).toBe(audioChunk.size);
		expect(secondBlob.size).toBe(audioChunk.size);
		expect(service.mediaRecorder).toBeNull();
	});

	it('flushes active recording chunks into the local recovery journal', async () => {
		const { MockMediaRecorder } = installRecordingMocks();

		await service.startRecording();
		MockMediaRecorder.last.ondataavailable?.({
			data: new Blob(['seed'], { type: 'audio/webm' })
		});
		await vi.advanceTimersByTimeAsync(5000);

		expect(beginRecordingDraftJournal).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				mimeType: 'audio/webm',
				recovery: expect.objectContaining({
					isPartial: true,
					reason: 'recording-started'
				})
			})
		);
		expect(appendRecordingDraftJournalChunk).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(Number),
			expect.any(Blob),
			expect.objectContaining({
				mimeType: 'audio/webm',
				recovery: expect.objectContaining({
					isPartial: true,
					reason: 'timed-journal'
				})
			})
		);
		expect(get(transcriptionState).pendingRecording).toMatchObject({
			id: 'latest',
			recovery: expect.objectContaining({
				isPartial: true
			})
		});
	});

	it('connects Deepgram and streams chunks in Live Mode', async () => {
		const { MockMediaRecorder } = installRecordingMocks();
		const connectSpy = vi.spyOn(transcriptionStore, 'connect').mockResolvedValue();
		const sendSpy = vi.spyOn(transcriptionStore, 'send').mockImplementation(() => {});
		liveMode.set('true');
		privacyMode.set('false');

		await service.startRecording();
		MockMediaRecorder.last.ondataavailable?.({
			data: new Blob(['live chunk'], { type: 'audio/webm' })
		});

		expect(connectSpy).toHaveBeenCalledTimes(1);
		expect(sendSpy).toHaveBeenCalledWith(expect.any(Blob));
	});

	it('does not connect or stream to Deepgram when Offline Mode overrides Live Mode', async () => {
		const { MockMediaRecorder } = installRecordingMocks();
		const connectSpy = vi.spyOn(transcriptionStore, 'connect').mockResolvedValue();
		const sendSpy = vi.spyOn(transcriptionStore, 'send').mockImplementation(() => {});
		liveMode.set('true');
		privacyMode.set('true');

		await service.startRecording();
		MockMediaRecorder.last.ondataavailable?.({
			data: new Blob(['private chunk'], { type: 'audio/webm' })
		});

		expect(connectSpy).not.toHaveBeenCalled();
		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('uses a new journal sequence for each flushed recovery blob', async () => {
		const { MockMediaRecorder } = installRecordingMocks();

		await service.startRecording();
		MockMediaRecorder.last.ondataavailable?.({
			data: new Blob(['first'], { type: 'audio/webm' })
		});
		await vi.advanceTimersByTimeAsync(5000);

		MockMediaRecorder.last.ondataavailable?.({
			data: new Blob(['second'], { type: 'audio/webm' })
		});
		await vi.advanceTimersByTimeAsync(5000);

		expect(appendRecordingDraftJournalChunk).toHaveBeenNthCalledWith(
			1,
			expect.any(String),
			0,
			expect.any(Blob),
			expect.any(Object)
		);
		expect(appendRecordingDraftJournalChunk).toHaveBeenNthCalledWith(
			2,
			expect.any(String),
			1,
			expect.any(Blob),
			expect.any(Object)
		);
	});

	it('saves an interrupted recording when MediaRecorder stops unexpectedly', async () => {
		const { MockMediaRecorder } = installRecordingMocks();

		await service.startRecording();
		MockMediaRecorder.last.ondataavailable?.({
			data: new Blob(['interrupted'], { type: 'audio/webm' })
		});
		MockMediaRecorder.last.state = 'inactive';
		await MockMediaRecorder.last.onstop();

		expect(appendRecordingDraftJournalChunk).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(Number),
			expect.any(Blob),
			expect.objectContaining({
				recovery: expect.objectContaining({
					reason: 'recording-interrupted'
				})
			})
		);
		expect(saveRecordingDraft).toHaveBeenCalledWith(
			expect.any(Blob),
			expect.objectContaining({
				recovery: expect.objectContaining({
					isPartial: false,
					reason: 'recording-interrupted'
				})
			})
		);
		expect(get(uiState).errorMessage).toBe(
			'Recording was interrupted. Your saved draft is ready to retry.'
		);
		expect(get(transcriptionState).pendingRecording).toMatchObject({
			id: 'latest',
			recovery: expect.objectContaining({
				reason: 'recording-interrupted'
			})
		});
	});
});
