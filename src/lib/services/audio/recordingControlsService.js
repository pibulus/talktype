// ===================================================================
// RECORDING CONTROLS SERVICE
// Handles high-level recording control logic and UI interactions
// ===================================================================

import { get } from 'svelte/store';
import { browser } from '$app/environment';
import { CTA_PHRASES, ANIMATION, STORAGE_KEYS } from '$lib/constants';
import { scrollToBottomIfNeeded } from '$lib/utils/scrollUtils';
import { audioState, transcriptionState, transcriptionActions } from '../infrastructure/stores';
import { analytics } from '../analytics';
import { transcriptionStore } from '$lib/stores/transcriptionStore';
import { getTranscriptionMode } from '$lib/services/transcription/mode.js';
import { createLogger } from '$lib/utils/logger';
import { isPermissionError } from './permissionErrors.js';

const log = createLogger('RecordingControls');

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
			// Subtle pulse ghost icon when starting recording
			if (this.ghostComponent && typeof this.ghostComponent.pulse === 'function') {
				this.ghostComponent.pulse();
			}

			// Start recording using the AudioService
			await this.audioService.startRecording();

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
		let liveStopInProgress = false;

		try {
			// Get current recording state
			if (!get(isRecording)) {
				return;
			}

			// Make the ghost look like it's thinking hard
			if (this.ghostComponent && typeof this.ghostComponent.startThinking === 'function') {
				this.ghostComponent.startThinking();
				thinkingStarted = true;
			}

			const { useLiveDeepgram } = getTranscriptionMode();
			if (useLiveDeepgram) {
				liveStopInProgress = true;
				transcriptionActions.startTranscribing();
			}

			// Stop recording and get the audio blob
			const audioBlob = await this.audioService.stopRecording();
			log.log('Got audio blob:', audioBlob);

			// Process the audio if we have data
			if (audioBlob) {
				log.log('Starting transcription with blob size:', audioBlob.size);

				// Validate minimum recording duration (prevent processing tiny clips)
				// Estimate duration: webm is roughly 16kbps = 2000 bytes/second
				const estimatedDurationSeconds = audioBlob.size / 2000;
				const MIN_DURATION_SECONDS = 0.5; // Minimum half second

				if (estimatedDurationSeconds < MIN_DURATION_SECONDS) {
					log.warn(`Recording too short: ~${estimatedDurationSeconds.toFixed(2)}s`);
					this.uiActions.setErrorMessage(
						'Speak for at least a second so the ghost has enough to transcribe.'
					);
					await this.transcriptionService.clearPendingRecordingDraft?.();
					if (useLiveDeepgram) {
						transcriptionActions.completeTranscription('');
					}
					return;
				}

				// Check if Live Mode already captured a complete transcript. If the user
				// switched away from Live Mode while recording, close any stale socket
				// without waiting for a Deepgram finalization grace period.
				const liveResult = useLiveDeepgram ? await transcriptionStore.finish() : null;
				if (!useLiveDeepgram) {
					transcriptionStore.disconnect();
				}
				const liveTranscript = liveResult?.text || '';
				const canUseLiveTranscript =
					useLiveDeepgram &&
					liveResult?.hasFinal &&
					!liveResult.usedInterim &&
					liveTranscript.trim().length > 0;

				// Skip batch transcription only when Deepgram finalized the whole live transcript.
				if (canUseLiveTranscript) {
					log.log('Live Mode captured transcript - skipping batch');

					// Complete transcription so history gets saved via transcriptionCompletedEvent
					if (browser) {
						localStorage.setItem(STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD, 'deepgram-live');
					}
					transcriptionActions.completeTranscription(liveTranscript);
					await this.transcriptionService.clearPendingRecordingDraft?.();
					void this.transcriptionService.copyToClipboard(liveTranscript, { silent: true });

					// Scroll to show transcript if needed
					scrollToBottomIfNeeded({
						threshold: 300,
						delay: ANIMATION.RECORDING.POST_RECORDING_SCROLL_DELAY
					});

					// Increment the transcription count for PWA prompt
					if (browser && 'requestIdleCallback' in window) {
						window.requestIdleCallback(() => this._incrementTranscriptionCount());
					} else {
						const timeoutId = setTimeout(() => this._incrementTranscriptionCount(), 0);
						this.activeTimeouts.push(timeoutId);
					}

					// Track successful transcription
					const wordCount = liveTranscript.trim().split(/\s+/).length;
					analytics.completeTranscription('deepgram-live', estimatedDurationSeconds, wordCount);
					return;
				} else if (useLiveDeepgram && liveTranscript.trim().length > 0) {
					log.log('Live Mode had unfinished interim text - using batch fallback');
				}

				// Transcribe the audio with proper error handling (batch mode)
				try {
					const transcriptText = await this.transcriptionService.transcribeAudio(audioBlob);
					log.log('Transcription result:', transcriptText);

					// Scroll to show transcript if needed

					scrollToBottomIfNeeded({
						threshold: 300,
						delay: ANIMATION.RECORDING.POST_RECORDING_SCROLL_DELAY
					});

					// Increment the transcription count for PWA prompt
					if (browser && 'requestIdleCallback' in window) {
						window.requestIdleCallback(() => this._incrementTranscriptionCount());
					} else {
						const timeoutId = setTimeout(() => this._incrementTranscriptionCount(), 0);
						this.activeTimeouts.push(timeoutId);
					}

					// Track successful transcription
					const wordCount = transcriptText.trim().split(/\s+/).length;
					analytics.completeTranscription('cloud-batch', estimatedDurationSeconds, wordCount);
				} catch (transcriptionError) {
					log.error('Transcription error:', transcriptionError);
					const friendlyMessage = transcriptionError.message.includes('network')
						? 'Check your connection, then try transcription again.'
						: 'The ghost needs one more pass. Give it another shot?';
					this.uiActions.setErrorMessage(friendlyMessage);
				}
			} else {
				// If no audio data, revert UI state
				this.uiActions.setErrorMessage('Try one more recording.');
				if (useLiveDeepgram) {
					transcriptionActions.completeTranscription('');
				}
			}
		} catch (err) {
			log.error('Error in stopRecording:', err);
			const friendlyMessage = "Let's try that recording again.";
			this.uiActions.setErrorMessage(friendlyMessage);
			if (liveStopInProgress) {
				transcriptionActions.completeTranscription('');
			}
		} finally {
			if (
				thinkingStarted &&
				this.ghostComponent &&
				typeof this.ghostComponent.stopThinking === 'function'
			) {
				this.ghostComponent.stopThinking();
			}
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
