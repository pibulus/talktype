import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { uiActions, uiState, transcriptionState, resetStores } from '../infrastructure/stores.js';
import { TranscriptionService } from './transcriptionService.js';
import { getLatestRecordingDraft, deleteRecordingDraft } from '../audio/recordingRecoveryStore';

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

describe('TranscriptionService crash recovery', () => {
	let service;

	beforeEach(() => {
		resetStores();
		service = new TranscriptionService({ hybridService: { transcribeAudio: vi.fn() } });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		resetStores();
	});

	// The recovery card can only offer "Get text back" if the live transcript
	// snapshot survives the trip from IndexedDB metadata into pendingRecording.
	it('carries the saved live transcript into pendingRecording', async () => {
		getLatestRecordingDraft.mockResolvedValue({
			id: 'latest',
			createdAt: Date.now(),
			metadata: {
				duration: 220,
				liveTranscript: { text: 'three minutes of thoughts' }
			}
		});

		await service.restorePendingRecordingDraft();

		expect(get(transcriptionState).pendingRecording?.liveTranscript?.text).toBe(
			'three minutes of thoughts'
		);
	});
});

describe('TranscriptionService stale drafts', () => {
	let service;

	beforeEach(() => {
		resetStores();
		service = new TranscriptionService({ hybridService: { transcribeAudio: vi.fn() } });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		resetStores();
	});

	it('drops a draft older than a week instead of nagging forever', async () => {
		getLatestRecordingDraft.mockResolvedValue({
			id: 'latest',
			createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
			metadata: { duration: 12 }
		});

		await service.restorePendingRecordingDraft();

		expect(deleteRecordingDraft).toHaveBeenCalled();
		expect(get(transcriptionState).pendingRecording).toBeFalsy();
	});
});
