// ===================================================================
// RECORDING CONTROLS SERVICE
// Handles high-level recording control logic and UI interactions
// ===================================================================

import { get } from 'svelte/store';
import { browser } from '$app/environment';
import { CTA_PHRASES, ANIMATION, STORAGE_KEYS } from '$lib/constants';
import { scrollToBottomIfNeeded } from '$lib/utils/scrollUtils';
import {
	audioState,
	recordingState,
	transcriptionState,
	transcriptionActions
} from '../infrastructure/stores';
import { analytics } from '../analytics';
import { transcriptionStore } from '$lib/stores/transcriptionStore';
import { getTranscriptionMode } from '$lib/services/transcription/mode.js';
import { createLogger } from '$lib/utils/logger';
import { isPermissionError } from './permissionErrors.js';

const log = createLogger('RecordingControls');

export function getCompletedTranscriptionMethod({
	useLiveDeepgram = false,
	useOfflineWhisper = false,
	usedLiveTranscript = false
} = {}) {
	if (useLiveDeepgram && usedLiveTranscript) return 'deepgram-live';
	if (useOfflineWhisper) return 'whisper';
	return 'cloud-batch';
}

export function saveLastTranscriptionMethod(
	method,
	storage = globalThis.localStorage || globalThis.window?.localStorage || null
) {
	storage?.setItem?.(STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD, method);
}

export class RecordingControlsService {
	constructor(dependencies) {
		this.audioService = dependencies.audioService;
		this.transcriptionService = dependencies.transcriptionService;
		this.hapticService = dependencies.hapticService;
		this.pwaService = dependencies.pwaService;
		this.uiActions = dependencies.uiActions;
		this.stores = dependencies.stores;
		this.ghostComponent = null;
		this.activeTimeouts = [];
		this.currentCtaIndex = 0;
		this.toggleInFlight = false;
		this.timeLimitStopInFlight = false;
		this.activeRecordingMode = null;
		this.timeLimitUnsubscribe = audioState.subscribe((state) => {
			if (!state.timeLimit || this.timeLimitStopInFlight) return;
			const { isRecording } = this.stores;
			if (!isRecording || !get(isRecording)) return;

			this.timeLimitStopInFlight = true;
			this.uiActions.setScreenReaderMessage('Recording time limit reached. Stopping recording.');
			this.stopRecording().finally(() => {
				this.timeLimitStopInFlight = false;
			});
		});
	}

	setGhostComponent(ghostComponent) {
		this.ghostComponent = ghostComponent;
	}

	getCurrentCta() {
		return CTA_PHRASES[this.currentCtaIndex];
	}

	rotateToCta() {
		const newIndex = (this.currentCtaIndex + 1) % CTA_PHRASES.length;
		this.currentCtaIndex = newIndex;
		return CTA_PHRASES[this.currentCtaIndex];
	}

	async startRecording(options = {}) {
		const { isRecording, isTranscribing, transcriptionText } = this.stores;
		const isAutoStart = options.source === 'auto-start' || options.source === 'launch-shortcut';

		if (get(isRecording) || get(isTranscribing)) return;

		// Reset UI state
		this.uiActions.clearErrorMessage();

		// Clear previous transcription text for new recording
		if (get(transcriptionText)) {
			transcriptionState.update((current) => ({
				...current,
				text: '',
				error: null,
				progress: 0,
				inProgress: false
			}));
		}
		transcriptionStore.disconnect();
		transcriptionStore.reset();

		// Scroll to bottom if needed after starting recording
		scrollToBottomIfNeeded({
			threshold: 200,
			delay: ANIMATION.RECORDING.SCROLL_DELAY
		});

		try {
			this.activeRecordingMode = getTranscriptionMode();

			// Subtle pulse ghost icon when starting recording
			if (this.ghostComponent && typeof this.ghostComponent.pulse === 'function') {
				this.ghostComponent.pulse();
			}

			// Start recording using the AudioService
			await this.audioService.startRecording({ transcriptionMode: this.activeRecordingMode });

			// State is tracked through stores now
		} catch (err) {
			log.error('Error in startRecording:', err);
			const friendlyMessage = isPermissionError(err)
				? isAutoStart
					? 'Tap Start Recording to finish microphone setup.'
					: 'The mic needs permission before the ghost can listen.'
				: 'Recording needs one more try.';
			this.uiActions.setErrorMessage(friendlyMessage);
			throw err;
		}
	}

	async stopRecording() {
		const { isRecording } = this.stores;

		let thinkingStarted = false;
		const recordingMode = this.activeRecordingMode || getTranscriptionMode();
		const { useLiveDeepgram, useOfflineWhisper } = recordingMode;

		try {
			if (!get(isRecording)) return;

			if (this.ghostComponent && typeof this.ghostComponent.startThinking === 'function') {
				this.ghostComponent.startThinking();
				thinkingStarted = true;
			}

			if (useLiveDeepgram) {
				transcriptionActions.startTranscribing();
			}

			const audioBlob = await this.audioService.stopRecording();
			log.log('Got audio blob:', audioBlob);

			if (!audioBlob) {
				this.uiActions.setErrorMessage('Try one more recording.');
				if (useLiveDeepgram) transcriptionActions.completeTranscription('');
				return;
			}

			// Validate duration
			const estimatedDurationSeconds = audioBlob.size / 2000;
			if (estimatedDurationSeconds < 0.5) {
				log.warn(`Recording too short: ~${estimatedDurationSeconds.toFixed(2)}s`);
				this.uiActions.setErrorMessage('Speak for at least a second.');
				await this.transcriptionService.clearPendingRecordingDraft?.();
				if (useLiveDeepgram) transcriptionActions.completeTranscription('');
				return;
			}

			// Check if Live Mode already captured a complete transcript. If the user
			// switched away from Live Mode while recording, close any stale socket
			// without waiting for a Deepgram finalization grace period.
			const liveResult = useLiveDeepgram ? await transcriptionStore.finish() : null;
			if (!useLiveDeepgram) {
				transcriptionStore.disconnect();
			}
			const finalTranscript =
				useLiveDeepgram &&
				liveResult?.finalizeAcknowledged &&
				liveResult?.hasFinal &&
				!liveResult?.usedInterim &&
				liveResult.text.trim().length > 0
					? liveResult.text
					: await this.transcriptionService.transcribeAudio(audioBlob, {
							mode: recordingMode,
							durationSeconds: get(recordingState).duration || estimatedDurationSeconds
						});
			const usedLiveTranscript =
				useLiveDeepgram &&
				liveResult?.finalizeAcknowledged &&
				liveResult?.hasFinal &&
				!liveResult?.usedInterim &&
				finalTranscript === liveResult?.text;
			const completedMethod = getCompletedTranscriptionMethod({
				useLiveDeepgram,
				useOfflineWhisper,
				usedLiveTranscript
			});

			log.log('Transcription result:', finalTranscript);
			transcriptionActions.completeTranscription(finalTranscript);
			await this.transcriptionService.clearPendingRecordingDraft?.();

			if (usedLiveTranscript) {
				void this.transcriptionService.copyToClipboard(finalTranscript, { silent: true });
			}

			// Analytics & UI post-processing
			saveLastTranscriptionMethod(completedMethod);

			scrollToBottomIfNeeded({
				threshold: 300,
				delay: ANIMATION.RECORDING.POST_RECORDING_SCROLL_DELAY
			});

			const trimmedTranscript = finalTranscript.trim();
			const wordCount = trimmedTranscript ? trimmedTranscript.split(/\s+/).length : 0;
			analytics.completeTranscription(completedMethod, estimatedDurationSeconds, wordCount);

			if (browser && 'requestIdleCallback' in window)
				window.requestIdleCallback(() => this._incrementTranscriptionCount());
			else setTimeout(() => this._incrementTranscriptionCount(), 0);
		} catch (err) {
			log.error('Error in stopRecording:', err);
			this.uiActions.setErrorMessage("Let's try that recording again.");
			if (useLiveDeepgram) transcriptionActions.completeTranscription('');
		} finally {
			if (thinkingStarted && this.ghostComponent?.stopThinking) this.ghostComponent.stopThinking();
			this.activeRecordingMode = null;
		}
	}

	async toggleRecording() {
		const { isRecording, isTranscribing, transcriptionText } = this.stores;
		const currentlyRecording = get(isRecording);
		const currentlyTranscribing = get(isTranscribing);

		log.log('toggleRecording called, currently recording:', currentlyRecording);

		if (this.toggleInFlight) {
			this.uiActions.setScreenReaderMessage('Still working. Try again in a moment.');
			return;
		}

		this.toggleInFlight = true;

		try {
			if (currentlyRecording) {
				log.log('Stopping recording...');
				// Haptic feedback for stop - single tap
				if (this.hapticService) {
					this.hapticService.stopRecording();
				}

				await this.stopRecording();
				// Screen reader announcement
				this.uiActions.setScreenReaderMessage('Recording stopped.');
			} else if (currentlyTranscribing) {
				this.uiActions.setScreenReaderMessage('Still transcribing. Try again in a moment.');
			} else {
				log.log('Starting recording...');
				// Haptic feedback for start - double pulse
				if (this.hapticService) {
					this.hapticService.startRecording();
				}

				// When using "New Recording" button, rotate to next phrase immediately
				if (get(transcriptionText)) {
					this.rotateToCta();
				}

				await this.startRecording({ source: 'manual' });
				// Screen reader announcement
				this.uiActions.setScreenReaderMessage('Recording started. Speak now.');
			}
		} catch (err) {
			log.error('Recording operation failed:', err);

			// Show error message
			const friendlyMessage = isPermissionError(err)
				? 'The mic needs permission before the ghost can listen.'
				: 'Recording needs one more try.';
			this.uiActions.setErrorMessage(friendlyMessage);

			// Haptic feedback for error
			if (this.hapticService) {
				this.hapticService.error();
			}

			// Update screen reader status
			this.uiActions.setScreenReaderMessage('Recording is ready for one more try.');
		} finally {
			this.toggleInFlight = false;
		}
	}

	_incrementTranscriptionCount() {
		if (!browser) return;

		try {
			this.pwaService.incrementTranscriptionCount();
			// Could dispatch event here if needed
		} catch (error) {
			log.error('Error incrementing transcription count:', error);
		}
	}

	cleanup() {
		// Clear all active timeouts
		this.activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
		this.activeTimeouts = [];
		this.audioService?.cleanup?.().catch((error) => {
			log.warn('Audio cleanup failed:', error?.message || error);
		});
		this.timeLimitUnsubscribe?.();
		this.timeLimitUnsubscribe = null;
		this.ghostComponent = null;
	}
}

export function createRecordingControlsService(dependencies) {
	return new RecordingControlsService(dependencies);
}
