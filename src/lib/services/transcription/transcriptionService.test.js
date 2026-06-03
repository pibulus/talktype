import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { uiActions, uiState, resetStores } from '../infrastructure/stores.js';
import { TranscriptionService } from './transcriptionService.js';

vi.mock('$app/environment', () => ({
	browser: true,
	dev: false,
	building: false,
	version: 'test'
}));

vi.mock('./simpleHybridService', () => ({
	simpleHybridService: {
		transcribeAudio: vi.fn()
	}
}));

vi.mock('../audio/recordingRecoveryStore', () => ({
	getLatestRecordingDraft: vi.fn(),
	deleteRecordingDraft: vi.fn()
}));

describe('TranscriptionService clipboard fallback', () => {
	let service;

	beforeEach(() => {
		vi.useFakeTimers();
		resetStores();
		service = new TranscriptionService({
			hybridService: {
				transcribeAudio: vi.fn()
			}
		});
		Object.defineProperty(window, 'isSecureContext', {
			value: true,
			configurable: true
		});
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
		vi.restoreAllMocks();
		resetStores();
	});

	function setClipboard(writeText) {
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText },
			configurable: true
		});
	}

	it('marks silent auto-copy failures as needing a tap without showing an error', async () => {
		setClipboard(vi.fn().mockRejectedValue(new Error('NotAllowedError')));

		const copied = await service.copyToClipboard('hello world', { silent: true });
		const state = get(uiState);

		expect(copied).toBe(false);
		expect(state.copyNeedsGesture).toBe(true);
		expect(state.errorMessage).toBe('');
		expect(state.screenReaderMessage).toBe('Transcript ready. Use the copy button if needed.');
	});

	it('clears the tap-needed state after a user-initiated copy succeeds', async () => {
		setClipboard(vi.fn().mockResolvedValue(undefined));
		uiActions.setCopyNeedsGesture(true);

		const copied = await service.copyToClipboard('hello world');
		const state = get(uiState);

		expect(copied).toBe(true);
		expect(state.copyNeedsGesture).toBe(false);
		expect(state.clipboardSuccess).toBe(true);
	});
});
