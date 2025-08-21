/**
 * Web Speech API Service - Native browser speech recognition
 * Zero download, instant transcription for Chrome/Edge users
 */

import { writable, get } from 'svelte/store';

// Service status store
export const webSpeechStatus = writable({
	isSupported: false,
	isListening: false,
	error: null,
	browserName: null
});

/**
 * Web Speech API Service for native browser transcription
 */
export class WebSpeechService {
	constructor() {
		this.recognition = null;
		this.isSupported = this.checkSupport();
		this.currentResolve = null;
		this.currentReject = null;
		this.finalTranscript = '';
		this.interimTranscript = '';

		this.updateStatus({
			isSupported: this.isSupported,
			browserName: this.getBrowserName()
		});

		if (this.isSupported) {
			this.initializeRecognition();
		}
	}

	/**
	 * Check if Web Speech API is supported
	 */
	checkSupport() {
		return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
	}

	/**
	 * Get browser name for user messaging
	 */
	getBrowserName() {
		const userAgent = navigator.userAgent.toLowerCase();
		if (userAgent.includes('chrome')) return 'Chrome';
		if (userAgent.includes('edge')) return 'Edge';
		if (userAgent.includes('safari')) return 'Safari';
		if (userAgent.includes('firefox')) return 'Firefox';
		return 'Browser';
	}

	/**
	 * Initialize the recognition object
	 */
	initializeRecognition() {
		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

		this.recognition = new SpeechRecognition();
		this.recognition.continuous = true;
		this.recognition.interimResults = true;
		this.recognition.lang = 'en-US';
		this.recognition.maxAlternatives = 1;

		// Handle results
		this.recognition.onresult = (event) => {
			this.interimTranscript = '';

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const transcript = event.results[i][0].transcript;

				if (event.results[i].isFinal) {
					this.finalTranscript += transcript + ' ';
				} else {
					this.interimTranscript += transcript;
				}
			}

			// Update progress with interim results
			if (this.onProgress) {
				this.onProgress(this.finalTranscript + this.interimTranscript);
			}
		};

		// Handle errors
		this.recognition.onerror = (event) => {
			console.error('Speech recognition error:', event.error);

			let errorMessage = 'Speech recognition error';

			switch (event.error) {
				case 'network':
					errorMessage = 'Network error - check your connection';
					break;
				case 'not-allowed':
					errorMessage = 'Microphone permission denied';
					break;
				case 'no-speech':
					errorMessage = 'No speech detected';
					break;
				case 'aborted':
					errorMessage = 'Recognition aborted';
					break;
				default:
					errorMessage = `Recognition error: ${event.error}`;
			}

			this.updateStatus({
				error: errorMessage,
				isListening: false
			});

			if (this.currentReject) {
				this.currentReject(new Error(errorMessage));
			}
		};

		// Handle end
		this.recognition.onend = () => {
			this.updateStatus({ isListening: false });

			if (this.currentResolve) {
				this.currentResolve(this.finalTranscript.trim());
			}
		};

		// Handle start
		this.recognition.onstart = () => {
			this.updateStatus({ isListening: true });
		};
	}

	/**
	 * Update the status store
	 */
	updateStatus(updates) {
		webSpeechStatus.update((current) => ({ ...current, ...updates }));
	}

	/**
	 * Start transcribing audio
	 */
	async startTranscription(onProgress = null) {
		if (!this.isSupported) {
			throw new Error('Web Speech API not supported in this browser');
		}

		this.finalTranscript = '';
		this.interimTranscript = '';
		this.onProgress = onProgress;

		return new Promise((resolve, reject) => {
			this.currentResolve = resolve;
			this.currentReject = reject;

			try {
				this.recognition.start();
			} catch (error) {
				if (error.message.includes('already started')) {
					// Already running, just continue
					return;
				}
				reject(error);
			}
		});
	}

	/**
	 * Stop transcription and return result
	 */
	stopTranscription() {
		if (this.recognition && this.isSupported) {
			this.recognition.stop();
		}

		return this.finalTranscript.trim();
	}

	/**
	 * Transcribe audio blob (compatibility method)
	 * Note: Web Speech API works with microphone stream, not blobs
	 */
	async transcribeAudio(audioBlob) {
		// Web Speech API doesn't work with audio blobs directly
		// This is here for API compatibility
		throw new Error(
			'Web Speech API requires microphone access, not audio blobs. Use Whisper for blob transcription.'
		);
	}

	/**
	 * Check if currently listening
	 */
	isListening() {
		return get(webSpeechStatus).isListening;
	}
}

// Service instance
export const webSpeechService = new WebSpeechService();
