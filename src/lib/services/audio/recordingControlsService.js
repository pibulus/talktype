// ===================================================================
// RECORDING CONTROLS SERVICE
// Handles high-level recording control logic and UI interactions
// ===================================================================

import { get } from 'svelte/store';
import { browser } from '$app/environment';
import { CTA_PHRASES, ANIMATION } from '$lib/constants';
import { scrollToBottomIfNeeded } from '$lib/utils/scrollUtils';
import { transcriptionState, transcriptionActions } from '../infrastructure/stores';
import { analytics } from '../analytics';
import { liveMode } from '$lib';
import { transcriptionStore } from '$lib/stores/transcriptionStore';
import { createLogger } from '$lib/utils/logger';

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
		this.onPreloadRequest = null;
	}

	setGhostComponent(ghostComponent) {
		this.ghostComponent = ghostComponent;
	}

	setPreloadHandler(onPreloadRequest) {
		this.onPreloadRequest = onPreloadRequest;
	}

	preloadSpeechModel() {
		if (this.onPreloadRequest) {
			this.onPreloadRequest();
		}
	}

	getCurrentCta() {
		return CTA_PHRASES[this.currentCtaIndex];
	}

	rotateToCta() {
		const newIndex = (this.currentCtaIndex + 1) % CTA_PHRASES.length;
		this.currentCtaIndex = newIndex;
		return CTA_PHRASES[this.currentCtaIndex];
	}

	async startRecording() {
		const { isRecording, transcriptionText } = this.stores;

		// Don't start if we're already recording
		if (get(isRecording)) return;

		// Try to preload the speech model if not already done
		this.preloadSpeechModel();

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
			const friendlyMessage = err.message.includes('permission')
				? 'Need microphone access - click allow when asked!'
				: 'Recording hiccup - mind trying again?';
			this.uiActions.setErrorMessage(friendlyMessage);
		}
	}

	async stopRecording() {
		const { isRecording } = this.stores;

		try {
			// Get current recording state
			if (!get(isRecording)) {
				return;
			}

			// Make the ghost look like it's thinking hard
			if (this.ghostComponent && typeof this.ghostComponent.startThinking === 'function') {
				this.ghostComponent.startThinking();
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
						'Recording too short - try speaking for at least a second!'
					);
					return;
				}

				// Check if Live Mode already captured a transcript
				const liveModeEnabled = get(liveMode) === 'true';
				const liveTranscript = liveModeEnabled ? transcriptionStore.getTranscript() : '';

				// Skip batch transcription if Live Mode has valid content
				if (liveModeEnabled && liveTranscript.trim().length > 0) {
					log.log('Live Mode captured transcript - skipping batch');

					// Complete transcription so history gets saved via transcriptionCompletedEvent
					transcriptionActions.completeTranscription(liveTranscript);

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
				}

				// Transcribe the audio with proper error handling (batch mode)
				try {
					const transcriptText = await this.transcriptionService.transcribeAudio(audioBlob);
					log.log('Transcription result:', transcriptText);

					// Stop ghost thinking animation after successful transcription
					if (this.ghostComponent && typeof this.ghostComponent.stopThinking === 'function') {
						this.ghostComponent.stopThinking();
					}

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
						? "Can't reach the transcription service - check your connection?"
						: 'The ghost got tongue-tied - give it another shot?';
					this.uiActions.setErrorMessage(friendlyMessage);

					// Stop ghost thinking animation on error
					// COMMENTED OUT: These methods don't exist on ghost component
					// if (this.ghostComponent && typeof this.ghostComponent.stopThinking === 'function') {
					// 	this.ghostComponent.stopThinking();
					// }
				}
			} else {
				// If no audio data, revert UI state
				this.uiActions.setErrorMessage("Didn't catch that - try recording again?");
			}
		} catch (err) {
			log.error('Error in stopRecording:', err);
			const friendlyMessage = "Something went sideways - let's try that again!";
			this.uiActions.setErrorMessage(friendlyMessage);
		}
	}

	async toggleRecording() {
		const { isRecording, transcriptionText } = this.stores;
		const currentlyRecording = get(isRecording);

		log.log('toggleRecording called, currently recording:', currentlyRecording);

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

				await this.startRecording();
				// Screen reader announcement
				this.uiActions.setScreenReaderMessage('Recording started. Speak now.');
			}
		} catch (err) {
			log.error('Recording operation failed:', err);

			// Show error message
			const friendlyMessage = err.message.includes('permission')
				? 'Need microphone access - click allow when asked!'
				: 'Recording hiccup - mind trying again?';
			this.uiActions.setErrorMessage(friendlyMessage);

			// Haptic feedback for error
			if (this.hapticService) {
				this.hapticService.error();
			}

			// Update screen reader status
			this.uiActions.setScreenReaderMessage('Recording failed. Please try again.');
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
		this.ghostComponent = null;
		this.onPreloadRequest = null;
	}
}

export function createRecordingControlsService(dependencies) {
	return new RecordingControlsService(dependencies);
}
