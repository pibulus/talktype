/**
 * Simple Hybrid Transcription Service
 * Routes offline recordings to Whisper and cloud recordings to the server transcription API.
 */

import { get } from 'svelte/store';
import { whisperService, whisperStatus } from './whisper/whisperService';
import { userPreferences } from '../infrastructure/stores';
import { customPrompt, privacyMode } from '$lib';
import { browser } from '$app/environment';
import { LEGACY_STORAGE_KEYS, PROMPT_STYLES, STORAGE_KEYS } from '$lib/constants';
import { readStorageValue } from '$lib/services/storage/localStorageMigration.js';
import { ensureApiSession } from '../apiSession.js';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('HybridService');

export class SimpleHybridService {
	constructor() {
		this.whisperReady = false;
		this.whisperLoadPromise = null;
		this.keepPendingOfflineLoad = false;
		this.deviceProfile = this.detectDeviceProfile();
		this.cloudQueue = Promise.resolve();
		this.unsubscribeWhisperStatus = null;

		if (browser) {
			this.unsubscribeWhisperStatus = whisperStatus.subscribe((status) => {
				this.whisperReady = status.isLoaded;
			});
		}
	}

	destroy() {
		if (this.unsubscribeWhisperStatus) {
			this.unsubscribeWhisperStatus();
			this.unsubscribeWhisperStatus = null;
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
	async startBackgroundLoad({ keepForPendingOfflineRecording = false } = {}) {
		if (this.whisperReady) {
			return { success: true, alreadyLoaded: true };
		}

		this.keepPendingOfflineLoad =
			this.keepPendingOfflineLoad || Boolean(keepForPendingOfflineRecording);

		if (this.whisperLoadPromise) {
			return this.whisperLoadPromise;
		}

		const logPrefix = this.deviceProfile.isMobile ? '📱' : '🖥️';
		log.log(
			`${logPrefix} Loading Whisper model for offline transcription...`,
			this.deviceProfile.description
		);
		this.whisperLoadPromise = whisperService
			.preloadModel()
			.then(async (result) => {
				if (result.success) {
					if (browser && get(privacyMode) !== 'true' && !this.keepPendingOfflineLoad) {
						await whisperService.unloadModel();
						return { success: false, unloaded: true };
					}
					log.log('✅ Whisper model ready for offline use!');
				}
				return result;
			})
			.catch((err) => {
				log.warn('Whisper load failed:', err);
				return { success: false, error: err };
			})
			.finally(() => {
				this.whisperLoadPromise = null;
				this.keepPendingOfflineLoad = false;
			});

		return this.whisperLoadPromise;
	}

	/**
	 * Are the current model's bytes already in the browser cache? Used by the
	 * offline controller to warm from disk at startup without triggering a
	 * surprise download.
	 */
	isOfflineModelCached() {
		return whisperService.refreshCachedModelStatus();
	}

	async releaseOfflineModel() {
		const pendingLoad = this.whisperLoadPromise;
		this.whisperLoadPromise = null;

		let pendingResult = null;
		if (pendingLoad) {
			pendingResult = await pendingLoad.catch(() => null);
		}

		if (browser && get(privacyMode) === 'true') {
			return;
		}

		if (!pendingResult?.unloaded) {
			await whisperService.unloadModel();
		}
	}

	/**
	 * Transcribe audio using best available method
	 */
	async transcribeAudio(audioBlob, options = {}) {
		// Check privacy mode preference
		const modeSnapshotWantsOffline = options.mode?.useOfflineWhisper === true;
		const privacyModeEnabled = modeSnapshotWantsOffline || (browser && get(privacyMode) === 'true');
		const releaseSnapshotLoadAfterUse =
			modeSnapshotWantsOffline && browser && get(privacyMode) !== 'true';

		// Privacy mode: Use offline Whisper only (desktop + mobile allowed)
		if (privacyModeEnabled) {
			// Start loading Whisper if not already
			if (!this.whisperReady && !this.whisperLoadPromise) {
				this.startBackgroundLoad({
					keepForPendingOfflineRecording: modeSnapshotWantsOffline
				});
			}

			if (this.whisperReady) {
				log.log('🔒 Privacy Mode: Using offline Whisper');
				if (browser) localStorage.setItem(STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD, 'whisper');
				return await this.#transcribeWithWhisper(audioBlob, {
					releaseAfterUse: releaseSnapshotLoadAfterUse
				});
			} else if (this.whisperLoadPromise) {
				log.log('🔒 Privacy Mode: Waiting for Whisper to load...');
				const result = await this.whisperLoadPromise;
				if (result.success) {
					if (browser) localStorage.setItem(STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD, 'whisper');
					return await this.#transcribeWithWhisper(audioBlob, {
						releaseAfterUse: releaseSnapshotLoadAfterUse
					});
				}
				throw new Error(
					this.deviceProfile.isMobile
						? 'Offline mode needs one more try on this device, or switch back to Live Text.'
						: 'Offline mode is still getting ready. Try again in a moment.'
				);
			} else {
				throw new Error(
					this.deviceProfile.isMobile
						? 'Offline mode needs one more try on this device, or switch back to Live Text.'
						: 'Offline mode is still getting ready. Try again in a moment.'
				);
			}
		}

		// Normal mode: Use Cloud API (Deepgram)
		log.log('☁️ Using Cloud API for transcription');
		if (browser) localStorage.setItem(STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD, 'cloud');
		return await this.transcribeWithCloud(audioBlob, options);
	}

	async #transcribeWithWhisper(audioBlob, { releaseAfterUse = false } = {}) {
		try {
			return await whisperService.transcribeAudio(audioBlob);
		} finally {
			if (releaseAfterUse && browser && get(privacyMode) !== 'true') {
				await whisperService.unloadModel();
			}
		}
	}

	/**
	 * Transcribe using Cloud API
	 */
	async transcribeWithCloud(audioBlob, options = {}) {
		this.cloudQueue = this.cloudQueue
			.catch(() => {})
			.then(() => this._transcribeWithCloudInternal(audioBlob, options));

		return this.cloudQueue;
	}

	async _transcribeWithCloudInternal(audioBlob, options = {}) {
		try {
			// Guard against a stale stored style (e.g. a preset that no longer
			// exists) — the server rejects unknown styles with a 400.
			const storedStyle = get(userPreferences).promptStyle || 'standard';
			const promptStyle = Object.values(PROMPT_STYLES).includes(storedStyle)
				? storedStyle
				: 'standard';
			const controller = new AbortController();
			// Increase timeout to 60s for longer recordings
			const timeoutId = setTimeout(() => controller.abort(), 60000);

			try {
				await ensureApiSession();
				const formData = new FormData();

				// Detect extension from blob type
				const mimeType = audioBlob.type || 'audio/webm';
				const ext = mimeType.split('/')[1]?.split(';')[0] || 'webm';
				const filename = `recording-${Date.now()}.${ext}`;

				formData.append('audio_file', audioBlob, filename);
				formData.append('prompt_style', promptStyle);
				if (Number.isFinite(options.durationSeconds)) {
					formData.append('duration_seconds', String(options.durationSeconds));
				}

				// Add custom prompt text if style is custom
				if (promptStyle === 'custom') {
					const customPromptText = get(customPrompt);
					if (customPromptText) {
						formData.append('custom_prompt', customPromptText);
					}
				}

				const headers = {};
				const supporterToken = browser
					? readStorageValue(STORAGE_KEYS.SUPPORTER_TOKEN, {
							legacyKeys: LEGACY_STORAGE_KEYS.SUPPORTER_TOKEN
						})
					: '';
				if (supporterToken) {
					headers['x-talktype-supporter-token'] = supporterToken;
				}

				const response = await fetch('/api/transcribe', {
					method: 'POST',
					headers,
					body: formData,
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					const error = await response.json().catch(() => ({}));
					throw new Error(error.error || 'Transcription needs one more try.');
				}

				const { transcription } = await response.json();
				return transcription;
			} catch (fetchError) {
				clearTimeout(timeoutId);
				if (fetchError.name === 'AbortError') {
					throw new Error('Try a shorter recording for this one.');
				}
				throw fetchError;
			}
		} catch (error) {
			log.error('Cloud API transcription error:', error);

			// Don't auto-fallback to Whisper - let user explicitly enable Privacy Mode if they want offline
			// This prevents unexpected downloads and keeps the cloud API as the default path.
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
			method: this.whisperReady ? 'Offline (Whisper)' : 'Online (Deepgram)'
		};
	}
}

// Export singleton instance
export const simpleHybridService = new SimpleHybridService();
