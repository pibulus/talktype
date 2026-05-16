import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioStates } from './audioStates.js';
import { RecordingControlsService } from './recordingControlsService.js';
import {
	audioActions,
	audioState,
	isRecording,
	isTranscribing,
	resetStores,
	transcriptionText
} from '../infrastructure/stores.js';

function createService() {
	return new RecordingControlsService({
		audioService: {
			cleanup: vi.fn().mockResolvedValue()
		},
		transcriptionService: {},
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
});
