/**
 * Simple Hybrid Transcription Service
 * Uses Gemini API for instant results while Whisper loads in background
 */

import { get } from 'svelte/store';
import { whisperService, whisperStatus } from './whisper/whisperService';
import { userPreferences } from '../infrastructure/stores';
import { browser } from '$app/environment';
import { STORAGE_KEYS } from '$lib/constants';

class SimpleHybridService {
	constructor() {
		this.whisperReady = false;
		this.whisperLoadPromise = null;
		this.isDesktop = this.detectDesktop();
		this.geminiQueue = Promise.resolve();

		// Subscribe to whisper status
		if (browser) {
			whisperStatus.subscribe((status) => {
				this.whisperReady = status.isLoaded;
			});
		}
	}

	/**
	 * Detect if device is desktop (not mobile) for offline Whisper support
	 * Mobile has memory constraints and iOS has known memory leaks
	 */
	detectDesktop() {
		if (!browser) return false;
		const ua = navigator.userAgent;
		const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
		return !isMobile;
	}

	/**
	 * Start loading Whisper in the background (only called when privacy mode enabled)
	 * Only works on desktop - mobile uses Gemini API
	 */
	async startBackgroundLoad() {
		if (this.whisperLoadPromise || this.whisperReady) {
			return; // Already loading or loaded
		}

		// Desktop-only: Mobile has memory constraints
		if (!this.isDesktop) {
			console.log('📱 Mobile device detected - offline mode not available (use online API)');
			return { success: false, error: 'Mobile not supported' };
		}

		console.log('🖥️  Desktop detected - Loading Whisper model for offline transcription...');
		this.whisperLoadPromise = whisperService
			.preloadModel()
			.then((result) => {
				if (result.success) {
					console.log('✅ Whisper model ready for offline use!');
				}
				return result;
			})
			.catch((err) => {
				console.warn('Whisper load failed:', err);
				return { success: false, error: err };
			})
			.finally(() => {
				this.whisperLoadPromise = null;
			});
	}

	/**
	 * Transcribe audio using best available method
	 */
	async transcribeAudio(audioBlob) {
		// Check privacy mode preference
		const privacyMode = localStorage.getItem(STORAGE_KEYS.PRIVACY_MODE) === 'true';

		// Privacy mode: Use offline Whisper only (desktop only)
		if (privacyMode) {
			// Check if desktop
			if (!this.isDesktop) {
				throw new Error(
					'Offline mode not available on mobile. Mobile has memory constraints that prevent reliable offline transcription. Please disable offline mode or use a desktop browser.'
				);
			}

			// Start loading Whisper if not already
			if (!this.whisperReady && !this.whisperLoadPromise) {
				this.startBackgroundLoad();
			}

			if (this.whisperReady) {
				console.log('🔒 Privacy Mode: Using offline Whisper');
				localStorage.setItem(STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD, 'whisper');
				return await whisperService.transcribeAudio(audioBlob);
			} else if (this.whisperLoadPromise) {
				console.log('🔒 Privacy Mode: Waiting for Whisper to load...');
				const result = await this.whisperLoadPromise;
				if (result.success) {
					localStorage.setItem(STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD, 'whisper');
					return await whisperService.transcribeAudio(audioBlob);
				}
				throw new Error('Privacy mode enabled but offline model failed to load');
			} else {
				throw new Error('Privacy mode enabled but offline model not available');
			}
		}

		// Normal mode: Use Gemini API (fast, reliable, works)
		console.log('☁️ Using Gemini API for transcription');
		localStorage.setItem(STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD, 'gemini');
		return await this.transcribeWithGemini(audioBlob);
	}

	/**
	 * Transcribe using Gemini API
	 */
	async transcribeWithGemini(audioBlob) {
		this.geminiQueue = this.geminiQueue
			.catch(() => {})
			.then(() => this._transcribeWithGeminiInternal(audioBlob));

		return this.geminiQueue;
	}

	async _transcribeWithGeminiInternal(audioBlob) {
		try {
			const promptStyle = get(userPreferences).promptStyle || 'standard';
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000);

			try {
				const formData = new FormData();
				formData.append('audio_file', audioBlob, `recording-${Date.now()}.webm`);
				formData.append('prompt_style', promptStyle);

				const response = await fetch('/api/transcribe', {
					method: 'POST',
					body: formData,
					signal: controller.signal,
					keepalive: true
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					const error = await response.json().catch(() => ({}));
					throw new Error(error.error || 'API transcription failed');
				}

				const { transcription } = await response.json();
				return transcription;
			} catch (fetchError) {
				clearTimeout(timeoutId);
				if (fetchError.name === 'AbortError') {
					throw new Error('Transcription took too long (30s timeout). Try a shorter recording?');
				}
				throw fetchError;
			}
		} catch (error) {
			console.error('Gemini API transcription error:', error);

			if (this.whisperLoadPromise && !this.whisperReady) {
				console.log('⏳ API failed, waiting for Whisper to load...');
				const result = await this.whisperLoadPromise;
				if (result.success) {
					return await whisperService.transcribeAudio(audioBlob);
				}
			}

			throw error;
		}
	}

	/**
	 * Check current status
	 */
	getStatus() {
		return {
			whisperReady: this.whisperReady,
			usingAPI: !this.whisperReady,
			method: this.whisperReady ? 'Offline (Whisper)' : 'Online (Gemini API)'
		};
	}
}

// Export singleton instance
export const simpleHybridService = new SimpleHybridService();
