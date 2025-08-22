import { simpleHybridService } from './simpleHybridService';
import { transcriptionState, transcriptionActions, uiActions } from '../infrastructure/stores';
import { COPY_MESSAGES, ATTRIBUTION, getRandomFromArray } from '$lib/constants';
import { get } from 'svelte/store';

export const TranscriptionEvents = {
	TRANSCRIPTION_STARTED: 'transcription:started',
	TRANSCRIPTION_PROGRESS: 'transcription:progress',
	TRANSCRIPTION_COMPLETED: 'transcription:completed',
	TRANSCRIPTION_ERROR: 'transcription:error',
	TRANSCRIPTION_COPIED: 'transcription:copied',
	TRANSCRIPTION_SHARED: 'transcription:shared'
};

export class TranscriptionService {
	constructor(dependencies = {}) {
		this.hybridService = dependencies.hybridService || simpleHybridService;
		this.browser = typeof window !== 'undefined';
		this.lastTranscriptionTimestamp = null;
	}

	async transcribeAudio(audioBlob) {
		try {
			if (!audioBlob || !(audioBlob instanceof Blob)) {
				// Friendly error message
				const message = 'Hmm, no audio to work with. Try recording something first?';
				transcriptionActions.setTranscriptionError(message);
				throw new Error(message);
			}

			// Update transcription state to show in-progress
			transcriptionActions.startTranscribing();
			this.lastTranscriptionTimestamp = Date.now();

			// Start progress animation
			this.startProgressAnimation();

			// Use hybrid service (API while Whisper loads, then Whisper when ready)
			const transcriptText = await this.hybridService.transcribeAudio(audioBlob);

			// Complete progress animation with smooth transition
			this.completeProgressAnimation();

			// Update transcription state with completed text
			transcriptionActions.completeTranscription(transcriptText);

			// Auto-copy to clipboard after successful transcription
			setTimeout(() => {
				this.copyToClipboard(transcriptText);
			}, 100); // Small delay to ensure UI updates first

			return transcriptText;
		} catch (error) {
			console.error('Transcription hiccup:', error);

			// Friendly error message
			let friendlyMessage = error.message;
			if (error.message.includes('fetch')) {
				friendlyMessage = "Can't reach the transcription service. Check your connection?";
			} else if (error.message.includes('load model')) {
				friendlyMessage =
					'Loading the transcription model. This happens once and enables offline magic!';
			}

			// Update state to show error
			transcriptionActions.setTranscriptionError(friendlyMessage);

			throw error;
		}
	}

	startProgressAnimation() {
		let progress = 0;
		const animate = () => {
			if (!get(transcriptionState).inProgress) return;

			progress = Math.min(95, progress + 1);

			// Update store with current progress
			transcriptionActions.updateProgress(progress);

			if (progress < 95) {
				setTimeout(animate, 50);
			}
		};

		// Start animation loop
		animate();
	}

	completeProgressAnimation() {
		let progress = 95;

		const complete = () => {
			progress = Math.min(100, progress + (100 - progress) * 0.2);

			// Update store with current progress
			transcriptionActions.updateProgress(progress);

			if (progress < 99.5) {
				requestAnimationFrame(complete);
			} else {
				transcriptionActions.updateProgress(100);
			}
		};

		// Start completion animation
		requestAnimationFrame(complete);
	}

	async copyToClipboard(text) {
		if (!text) {
			text = get(transcriptionState).text;
		}

		if (!text || text.trim() === '') {
			uiActions.setErrorMessage('Nothing to copy yet - record something first!');
			return false;
		}

		try {
			// Add attribution
			const textWithAttribution = `${text}\n\n${ATTRIBUTION.SIMPLE_TAG}`;

			// Try the modern clipboard API first
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(textWithAttribution);
				uiActions.showClipboardSuccess();
				uiActions.setScreenReaderMessage('Transcript copied to clipboard');
				return true;
			}

			// Fallback: Use document.execCommand (legacy method)
			const textArea = document.createElement('textarea');
			textArea.value = textWithAttribution;
			textArea.style.position = 'fixed';
			textArea.style.opacity = '0';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();

			const success = document.execCommand('copy');
			document.body.removeChild(textArea);

			if (success) {
				uiActions.showClipboardSuccess();
				uiActions.setScreenReaderMessage('Transcript copied to clipboard');
			} else {
				uiActions.setScreenReaderMessage(
					'Unable to copy. Please try clicking in the window first.'
				);
			}

			return success;
		} catch (error) {
			console.error('Clipboard copy error:', error);

			const friendlyMessage = "Couldn't copy to clipboard. Try clicking somewhere first?";
			uiActions.setErrorMessage(friendlyMessage);
			uiActions.setScreenReaderMessage(
				'Click somewhere in the window first, then try copying again.'
			);

			return false;
		}
	}

	async shareTranscript(text) {
		if (!text) {
			text = get(transcriptionState).text;
		}

		if (!text || text.trim() === '') {
			uiActions.setErrorMessage('Nothing to share yet - record something first!');
			return false;
		}

		try {
			// Check if Web Share API is available
			if (!navigator.share) {
				throw new Error('Web Share API not supported');
			}

			// Add attribution
			const textWithAttribution = `${text}${ATTRIBUTION.SHARE_POSTFIX}`;

			// Share using Web Share API
			await navigator.share({
				title: 'TalkType Transcription',
				text: textWithAttribution
			});

			uiActions.showClipboardSuccess();
			uiActions.setScreenReaderMessage('Transcript shared successfully');
			return true;
		} catch (error) {
			// Don't treat user cancellation as an error
			if (error.name === 'AbortError') {
				return false;
			}

			console.error('Share error:', error);

			// Try fallback to clipboard if sharing fails
			if (error.message === 'Web Share API not supported') {
				return this.copyToClipboard(text);
			}

			uiActions.setErrorMessage(
				'Sharing not available on this device - copied to clipboard instead!'
			);
			return false;
		}
	}

	isTranscribing() {
		return get(transcriptionState).inProgress;
	}

	getCurrentTranscript() {
		return get(transcriptionState).text;
	}

	clearTranscript() {
		transcriptionActions.completeTranscription('');
	}

	getRandomCopyMessage() {
		return getRandomFromArray(COPY_MESSAGES);
	}

	isShareSupported() {
		return (
			this.browser &&
			typeof navigator !== 'undefined' &&
			navigator.share &&
			typeof navigator.share === 'function'
		);
	}
}

export const transcriptionService = new TranscriptionService();
