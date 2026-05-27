import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioStates } from './audioStates.js';

const transcriptionStoreMock = vi.hoisted(() => ({
	disconnect: vi.fn(),
	reset: vi.fn(),
	finish: vi.fn()
}));

const transcriptionModeMock = vi.hoisted(() => ({
	getTranscriptionMode: vi.fn(() => ({ useLiveDeepgram: false, useOfflineWhisper: false }))
}));

vi.mock('$lib/stores/transcriptionStore', () => ({
	transcriptionStore: transcriptionStoreMock
}));

vi.mock('$app/environment', () => ({
	browser: true,
	dev: false,
	building: false,
	version: 'test'
}));

vi.mock('$lib/services/transcription/mode.js', () => ({
	getTranscriptionMode: transcriptionModeMock.getTranscriptionMode
}));

import { STORAGE_KEYS } from '$lib/constants';
import {
	getCompletedTranscriptionMethod,
	RecordingControlsService,
	saveLastTranscriptionMethod
} from './recordingControlsService.js';
import {
	audioActions,
	audioState,
	isRecording,
	isTranscribing,
	resetStores,
	transcriptionText
} from '../infrastructure/stores.js';

function createService(overrides = {}) {
	const audioService = {
		startRecording: vi.fn().mockResolvedValue(true),
		stopRecording: vi.fn(),
		cleanup: vi.fn().mockResolvedValue(),
		...overrides.audioService
	};
	const transcriptionService = {
		transcribeAudio: vi.fn().mockResolvedValue('batch transcript'),
		clearPendingRecordingDraft: vi.fn().mockResolvedValue(),
		copyToClipboard: vi.fn().mockResolvedValue(),
		...overrides.transcriptionService
	};

	return new RecordingControlsService({
		audioService,
		transcriptionService,
		hapticService: null,
		pwaService: {
			incrementTranscriptionCount: vi.fn()
		},
		uiActions: {
			clearErrorMessage: vi.fn(),
			setErrorMessage: vi.fn(),
			setScreenReaderMessage: vi.fn()
		},
		stores: {
			isRecording,
			isTranscribing,
			transcriptionText
		}
	});
}

describe('RecordingControlsService', () => {
	let service;
	let localStorageMock;

	beforeEach(() => {
		resetStores();
		localStorageMock = {
			setItem: vi.fn()
		};
		vi.stubGlobal('localStorage', localStorageMock);
	});

	afterEach(() => {
		service?.cleanup();
		service = null;
		vi.clearAllMocks();
		transcriptionModeMock.getTranscriptionMode.mockReturnValue({
			useLiveDeepgram: false,
			useOfflineWhisper: false
		});
		transcriptionStoreMock.finish.mockResolvedValue({
			text: '',
			hasFinal: false,
			usedInterim: false,
			finalizeAcknowledged: false
		});
		vi.unstubAllGlobals();
		resetStores();
	});

	it('resolves completion method from the effective transcription mode', () => {
		expect(
			getCompletedTranscriptionMethod({
				useLiveDeepgram: true,
				usedLiveTranscript: true
			})
		).toBe('deepgram-live');
		expect(getCompletedTranscriptionMethod({ useOfflineWhisper: true })).toBe('whisper');
		expect(getCompletedTranscriptionMethod({ useLiveDeepgram: true })).toBe('cloud-batch');
		expect(getCompletedTranscriptionMethod()).toBe('cloud-batch');
	});

	it('persists the completion method when storage is available', () => {
		const storage = { setItem: vi.fn() };

		saveLastTranscriptionMethod('whisper', storage);

		expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD, 'whisper');
	});

	it('stops recording once when the recording time limit is reached', async () => {
		audioState.update((current) => ({
			...current,
			state: AudioStates.RECORDING,
			timeLimit: false
		}));

		service = createService();
		const stopRecording = vi.spyOn(service, 'stopRecording').mockResolvedValue();

		audioActions.recordingTimeLimitReached();
		audioActions.recordingTimeLimitReached();
		await Promise.resolve();

		expect(stopRecording).toHaveBeenCalledTimes(1);
	});

	it('clears stale time-limit signals when audio state changes', () => {
		audioState.update((current) => ({
			...current,
			state: AudioStates.RECORDING,
			timeLimit: true
		}));

		audioActions.updateState(AudioStates.IDLE);

		expect(get(audioState).timeLimit).toBe(false);
	});

	it('disconnects stale Deepgram live streams without waiting when stopped after switching offline', async () => {
		const audioBlob = new Blob(['x'.repeat(1200)], { type: 'audio/webm' });
		const audioService = {
			stopRecording: vi.fn().mockResolvedValue(audioBlob)
		};
		const transcriptionService = {
			transcribeAudio: vi.fn().mockResolvedValue('offline transcript')
		};

		audioActions.updateState(AudioStates.RECORDING);
		service = createService({ audioService, transcriptionService });

		await service.stopRecording();

		expect(transcriptionStoreMock.finish).not.toHaveBeenCalled();
		expect(transcriptionStoreMock.disconnect).toHaveBeenCalledTimes(1);
		expect(transcriptionService.transcribeAudio).toHaveBeenCalledWith(audioBlob, {
			mode: {
				useLiveDeepgram: false,
				useOfflineWhisper: false
			},
			durationSeconds: expect.any(Number)
		});
	});

	it('uses finalized Deepgram live text without batch transcription in live mode', async () => {
		const audioBlob = new Blob(['x'.repeat(1200)], { type: 'audio/webm' });
		const audioService = {
			stopRecording: vi.fn().mockResolvedValue(audioBlob)
		};
		const transcriptionService = {
			transcribeAudio: vi.fn().mockResolvedValue('batch transcript'),
			clearPendingRecordingDraft: vi.fn().mockResolvedValue(),
			copyToClipboard: vi.fn().mockResolvedValue()
		};

		transcriptionModeMock.getTranscriptionMode.mockReturnValue({
			useLiveDeepgram: true,
			useOfflineWhisper: false
		});
		transcriptionStoreMock.finish.mockResolvedValue({
			text: 'hello world',
			hasFinal: true,
			usedInterim: false,
			finalizeAcknowledged: true
		});
		audioActions.updateState(AudioStates.RECORDING);
		service = createService({ audioService, transcriptionService });

		await service.stopRecording();

		expect(transcriptionStoreMock.finish).toHaveBeenCalledTimes(1);
		expect(transcriptionStoreMock.disconnect).not.toHaveBeenCalled();
		expect(transcriptionService.transcribeAudio).not.toHaveBeenCalled();
		expect(transcriptionService.clearPendingRecordingDraft).toHaveBeenCalledTimes(1);
		expect(transcriptionService.copyToClipboard).toHaveBeenCalledWith('hello world', {
			silent: true
		});
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD,
			'deepgram-live'
		);
	});

	it('records Offline Mode completions as whisper, not cloud batch', async () => {
		const audioBlob = new Blob(['x'.repeat(1200)], { type: 'audio/webm' });
		const audioService = {
			stopRecording: vi.fn().mockResolvedValue(audioBlob)
		};
		const transcriptionService = {
			transcribeAudio: vi.fn().mockResolvedValue('offline transcript'),
			clearPendingRecordingDraft: vi.fn().mockResolvedValue(),
			copyToClipboard: vi.fn().mockResolvedValue()
		};

		transcriptionModeMock.getTranscriptionMode.mockReturnValue({
			useLiveDeepgram: false,
			useOfflineWhisper: true
		});
		audioActions.updateState(AudioStates.RECORDING);
		service = createService({ audioService, transcriptionService });

		await service.stopRecording();

		expect(transcriptionStoreMock.finish).not.toHaveBeenCalled();
		expect(transcriptionStoreMock.disconnect).toHaveBeenCalledTimes(1);
		expect(transcriptionService.transcribeAudio).toHaveBeenCalledWith(audioBlob, {
			mode: {
				useLiveDeepgram: false,
				useOfflineWhisper: true
			},
			durationSeconds: expect.any(Number)
		});
		expect(transcriptionService.copyToClipboard).not.toHaveBeenCalled();
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD,
			'whisper'
		);
	});

	it('keeps the start-time Offline Mode when the setting changes before stop', async () => {
		const audioBlob = new Blob(['x'.repeat(1200)], { type: 'audio/webm' });
		const audioService = {
			startRecording: vi.fn().mockResolvedValue(true),
			stopRecording: vi.fn().mockResolvedValue(audioBlob)
		};
		const transcriptionService = {
			transcribeAudio: vi.fn().mockResolvedValue('offline transcript'),
			clearPendingRecordingDraft: vi.fn().mockResolvedValue(),
			copyToClipboard: vi.fn().mockResolvedValue()
		};
		const offlineMode = {
			useLiveDeepgram: false,
			useOfflineWhisper: true
		};

		transcriptionModeMock.getTranscriptionMode.mockReturnValueOnce(offlineMode).mockReturnValue({
			useLiveDeepgram: false,
			useOfflineWhisper: false
		});
		service = createService({ audioService, transcriptionService });

		await service.startRecording();
		audioActions.updateState(AudioStates.RECORDING);
		await service.stopRecording();

		expect(audioService.startRecording).toHaveBeenCalledWith({ transcriptionMode: offlineMode });
		expect(transcriptionService.transcribeAudio).toHaveBeenCalledWith(audioBlob, {
			mode: offlineMode,
			durationSeconds: expect.any(Number)
		});
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD,
			'whisper'
		);
	});

	it('does not mark live mode as live when it falls back to batch transcription', async () => {
		const audioBlob = new Blob(['x'.repeat(1200)], { type: 'audio/webm' });
		const audioService = {
			stopRecording: vi.fn().mockResolvedValue(audioBlob)
		};
		const transcriptionService = {
			transcribeAudio: vi.fn().mockResolvedValue('same words'),
			clearPendingRecordingDraft: vi.fn().mockResolvedValue(),
			copyToClipboard: vi.fn().mockResolvedValue()
		};

		transcriptionModeMock.getTranscriptionMode.mockReturnValue({
			useLiveDeepgram: true,
			useOfflineWhisper: false
		});
		transcriptionStoreMock.finish.mockResolvedValue({
			text: 'same words',
			hasFinal: false,
			usedInterim: true,
			finalizeAcknowledged: true
		});
		audioActions.updateState(AudioStates.RECORDING);
		service = createService({ audioService, transcriptionService });

		await service.stopRecording();

		expect(transcriptionStoreMock.finish).toHaveBeenCalledTimes(1);
		expect(transcriptionService.transcribeAudio).toHaveBeenCalledWith(audioBlob, {
			mode: {
				useLiveDeepgram: true,
				useOfflineWhisper: false
			},
			durationSeconds: expect.any(Number)
		});
		expect(transcriptionService.copyToClipboard).not.toHaveBeenCalled();
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD,
			'cloud-batch'
		);
	});

	it('stays busy while waiting for Deepgram live finalization', async () => {
		const audioBlob = new Blob(['x'.repeat(1200)], { type: 'audio/webm' });
		const audioService = {
			stopRecording: vi.fn().mockResolvedValue(audioBlob)
		};
		const transcriptionService = {
			transcribeAudio: vi.fn().mockResolvedValue('batch transcript'),
			clearPendingRecordingDraft: vi.fn().mockResolvedValue(),
			copyToClipboard: vi.fn().mockResolvedValue()
		};
		let resolveFinish;
		const finishPromise = new Promise((resolve) => {
			resolveFinish = resolve;
		});

		transcriptionModeMock.getTranscriptionMode.mockReturnValue({
			useLiveDeepgram: true,
			useOfflineWhisper: false
		});
		transcriptionStoreMock.finish.mockReturnValue(finishPromise);
		audioActions.updateState(AudioStates.RECORDING);
		service = createService({ audioService, transcriptionService });

		const stopPromise = service.stopRecording();
		await vi.waitFor(() => expect(transcriptionStoreMock.finish).toHaveBeenCalledTimes(1));

		expect(get(isTranscribing)).toBe(true);

		resolveFinish({
			text: 'hello again',
			hasFinal: true,
			usedInterim: false,
			finalizeAcknowledged: true
		});
		await stopPromise;

		expect(get(isTranscribing)).toBe(false);
		expect(get(transcriptionText)).toBe('hello again');
	});

	it('keeps batch stop failures inside the recording error path', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const uiActions = {
			clearErrorMessage: vi.fn(),
			setErrorMessage: vi.fn(),
			setScreenReaderMessage: vi.fn()
		};

		audioActions.updateState(AudioStates.RECORDING);
		service = new RecordingControlsService({
			audioService: {
				stopRecording: vi.fn().mockRejectedValue(new Error('recorder failed')),
				cleanup: vi.fn().mockResolvedValue()
			},
			transcriptionService: {
				transcribeAudio: vi.fn(),
				clearPendingRecordingDraft: vi.fn(),
				copyToClipboard: vi.fn()
			},
			hapticService: null,
			pwaService: {
				incrementTranscriptionCount: vi.fn()
			},
			uiActions,
			stores: {
				isRecording,
				isTranscribing,
				transcriptionText
			}
		});

		try {
			await expect(service.stopRecording()).resolves.toBeUndefined();
			expect(uiActions.setErrorMessage).toHaveBeenCalledWith("Let's try that recording again.");
		} finally {
			consoleError.mockRestore();
		}
	});
});
