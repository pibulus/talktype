/**
 * Simple Hybrid Transcription Service
 * Uses Gemini API for instant results while Whisper loads in background
 */

import { get } from 'svelte/store';
import { whisperService, whisperStatus } from './whisper/whisperService';
import { userPreferences } from '../infrastructure/stores';
import { browser } from '$app/environment';
import { STORAGE_KEYS } from '$lib/constants';
import { ensureApiSession } from '../apiSession.js';

class SimpleHybridService {
	constructor() {
		this.whisperReady = false;
		this.whisperLoadPromise = null;
		this.deviceProfile = this.detectDeviceProfile();
		this.geminiQueue = Promise.resolve();

		// Subscribe to whisper status
		if (browser) {
			whisperStatus.subscribe((status) => {
				this.whisperReady = status.isLoaded;
			});
		}
	}

	/**
	 * Detect device characteristics for offline mode decisions
	 */
	detectDeviceProfile() {
		if (!browser) {
			return {
				isMobile: false,
				memory: 4,
				description: 'SSR environment'
			};
		}

		const ua = navigator.userAgent;
		const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
		const memory = navigator.deviceMemory || 4;

		return {
			isMobile,
			memory,
			description: isMobile
				? 'Mobile device detected - forcing Tiny model for stability'
				: 'Desktop-class device',
			caution: isMobile || memory < 3
		};
	}

	/**
	 * Start loading Whisper in the background (only called when privacy mode enabled)
	 * Mobile devices are supported, but we always force the Tiny model for stability.
	 */
	async startBackgroundLoad() {
		if (this.whisperLoadPromise || this.whisperReady) {
			return; // Already loading or loaded
		}

		const logPrefix = this.deviceProfile.isMobile ? '📱' : '🖥️';
		console.log(
			`${logPrefix} Loading Whisper model for offline transcription...`,
			this.deviceProfile.description
		);
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

		return this.whisperLoadPromise;
	}

	/**
	 * Transcribe audio using best available method
	 */
	async transcribeAudio(audioBlob) {
		// Check privacy mode preference
		const privacyMode = localStorage.getItem(STORAGE_KEYS.PRIVACY_MODE) === 'true';

		// Privacy mode: Use offline Whisper only (desktop + mobile allowed)
		if (privacyMode) {
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
				throw new Error(
					this.deviceProfile.isMobile
						? 'Offline mode could not initialize on this device. Try again or disable Privacy Mode.'
						: 'Privacy mode enabled but offline model failed to load'
				);
			} else {
				throw new Error(
					this.deviceProfile.isMobile
						? 'Offline mode could not initialize on this device. Try again or disable Privacy Mode.'
						: 'Privacy mode enabled but offline model not available'
				);
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
				await ensureApiSession();
				const formData = new FormData();
				
				// Detect extension from blob type
				const mimeType = audioBlob.type || 'audio/webm';
				const ext = mimeType.split('/')[1]?.split(';')[0] || 'webm';
				const filename = `recording-${Date.now()}.${ext}`;
				
				formData.append('audio_file', audioBlob, filename);
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

			// Fallback to offline Whisper if API fails
			console.log('⚠️ API failed, falling back to offline Whisper...');
			
			// Ensure Whisper is loaded
			if (!this.whisperReady) {
				console.log('⏳ Waiting for Whisper to load...');
				if (!this.whisperLoadPromise) {
					this.startBackgroundLoad();
				}
				
				try {
					const result = await (this.whisperLoadPromise || Promise.resolve({ success: this.whisperReady }));
					if (!result.success && !this.whisperReady) {
						throw new Error('Offline fallback failed: Whisper model could not be loaded.');
					}
				} catch (loadError) {
					console.error('Whisper load failed during fallback:', loadError);
					throw error; // Throw original API error if fallback fails
				}
			}

			if (this.whisperReady) {
				console.log('✅ Whisper ready, starting offline transcription...');
				return await whisperService.transcribeAudio(audioBlob);
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
