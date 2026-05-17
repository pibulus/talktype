import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioStates } from './audioStates.js';

const transcriptionStoreMock = vi.hoisted(() => ({
	disconnect: vi.fn(),
	reset: vi.fn(),
	finish: vi.fn()
}));

const transcriptionModeMock = vi.hoisted(() => ({
	getTranscriptionMode: vi.fn(() => ({ useLiveDeepgram: false }))
}));

vi.mock('$lib/stores/transcriptionStore', () => ({
	transcriptionStore: transcriptionStoreMock
}));

vi.mock('$lib/services/transcription/mode.js', () => ({
	getTranscriptionMode: transcriptionModeMock.getTranscriptionMode
}));

import { RecordingControlsService } from './recordingControlsService.js';
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

	beforeEach(() => {
		resetStores();
	});

	afterEach(() => {
		service?.cleanup();
		service = null;
		vi.clearAllMocks();
		transcriptionModeMock.getTranscriptionMode.mockReturnValue({ useLiveDeepgram: false });
		transcriptionStoreMock.finish.mockResolvedValue({
			text: '',
			hasFinal: false,
			usedInterim: false
		});
		resetStores();
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
		expect(transcriptionService.transcribeAudio).toHaveBeenCalledWith(audioBlob);
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

		transcriptionModeMock.getTranscriptionMode.mockReturnValue({ useLiveDeepgram: true });
		transcriptionStoreMock.finish.mockResolvedValue({
			text: 'hello world',
			hasFinal: true,
			usedInterim: false
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

		transcriptionModeMock.getTranscriptionMode.mockReturnValue({ useLiveDeepgram: true });
		transcriptionStoreMock.finish.mockReturnValue(finishPromise);
		audioActions.updateState(AudioStates.RECORDING);
		service = createService({ audioService, transcriptionService });

		const stopPromise = service.stopRecording();
		await vi.waitFor(() => expect(transcriptionStoreMock.finish).toHaveBeenCalledTimes(1));

		expect(get(isTranscribing)).toBe(true);

		resolveFinish({
			text: 'hello again',
			hasFinal: true,
			usedInterim: false
		});
		await stopPromise;

		expect(get(isTranscribing)).toBe(false);
		expect(get(transcriptionText)).toBe('hello again');
	});
});
