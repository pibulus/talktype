/**
 * Hybrid Transcription Service
 * Intelligently chooses between Web Speech API (instant) and Whisper (offline)
 *
 * Priority:
 * 1. Web Speech API - Chrome/Edge (0MB, instant)
 * 2. Tiny Quantized Model - 10MB, loads in 1-2 seconds!
 * 3. Distil-Whisper Models - 20-166MB, 6x faster than original
 * 4. WebGPU Acceleration - 10-100x faster processing when available
 */

import { instantTranscription } from './instantTranscription';
import { whisperServiceUltimate } from './whisper/whisperServiceUltimate';
// Lazy import webSpeechService to avoid SSR issues
// import { webSpeechService } from './webSpeechService';
import { voskService } from './vosk/voskService';
import { writable, get } from 'svelte/store';

// Service configuration
export const transcriptionConfig = writable({
	preferredMode: 'auto', // 'auto', 'webspeech', 'whisper', 'vosk'
	privacyMode: false, // If true, always use offline
	modelSize: 'tiny', // 'tiny', 'base', 'small'
	offlineEngine: 'whisper', // 'whisper' or 'vosk' for offline mode
	initialized: false
});

// Service status
export const hybridStatus = writable({
	activeService: null,
	webSpeechAvailable: false,
	whisperAvailable: false,
	voskAvailable: false,
	webGPUAvailable: false,
	recommendation: null
});

export class HybridTranscriptionService {
	constructor() {
		this.activeService = null;
		this.webSpeechAvailable = false; // Will be checked lazily
		this.whisperReady = false;
		this.voskReady = false;
		this.instantReady = false;
		this.hasInitialized = false;
		this._webSpeechService = null; // Lazy-loaded reference
		// Don't auto-initialize - wait for first use (SEO optimization)
	}

	// Lazy load webSpeechService to avoid SSR issues
	async getWebSpeechService() {
		if (!this._webSpeechService && typeof window !== 'undefined') {
			const { webSpeechService } = await import('./webSpeechService');
			this._webSpeechService = webSpeechService;
		}
		return this._webSpeechService;
	}

	async checkWebSpeechSupport() {
		const service = await this.getWebSpeechService();
		return service?.isSupported || false;
	}

	async initializeServices() {
		// Only initialize once
		if (this.hasInitialized) return;
		this.hasInitialized = true;
		
		// Initialize instant transcription service for ultra-fast loading
		console.log('🚀 Initializing instant transcription on first use...');
		instantTranscription.initialize();

		// Set up callback for quality upgrades
		instantTranscription.onUpgradeReady = (result) => {
			console.log('📈 Transcription quality upgraded:', result.quality);
			// You could emit an event here to update UI if needed
		};

		// Check Web Speech support lazily
		this.webSpeechAvailable = await this.checkWebSpeechSupport();

		// Check what's available
		const status = {
			webSpeechAvailable: this.webSpeechAvailable,
			whisperAvailable: true, // Always available
			voskAvailable: true, // Always available (lighter alternative)
			webGPUAvailable: await this.checkWebGPU(),
			instantAvailable: true, // Our new instant service!
			recommendation: null
		};

		// Determine recommendation - now we always use instant service!
		status.recommendation = 'instant'; // Always use instant for progressive loading
		status.activeService = 'instant';

		// Update status
		hybridStatus.set(status);

		// Initialize based on preference
		const config = get(transcriptionConfig);
		if (config.preferredMode === 'auto') {
			this.activeService = 'instant'; // Always use instant for best experience
		} else if (config.preferredMode === 'webspeech') {
			this.activeService = 'webspeech';
		} else {
			this.activeService = 'instant'; // Default to instant
		}

		transcriptionConfig.update((c) => ({ ...c, initialized: true }));
		this.instantReady = true;
	}

	async checkWebGPU() {
		if (typeof navigator === 'undefined' || !navigator.gpu) return false;
		try {
			const adapter = await navigator.gpu.requestAdapter();
			return !!adapter;
		} catch {
			return false;
		}
	}

	/**
	 * Main transcription method - intelligently routes to best service
	 */
	async transcribeAudio(audioBlob) {
		console.log('[HybridTranscription] Starting transcription...');
		console.log('[HybridTranscription] Audio blob size:', audioBlob?.size, 'bytes');
		
		// Initialize services on first use (lazy loading for SEO)
		if (!this.hasInitialized) {
			console.log('[HybridTranscription] First use - initializing services...');
			await this.initializeServices();
		}
		
		const config = get(transcriptionConfig);
		const status = get(hybridStatus);
		
		console.log('[HybridTranscription] Config:', config);
		console.log('[HybridTranscription] Status:', status);

		// Privacy mode - always use offline with instant service
		if (config.privacyMode) {
			console.log('[HybridTranscription] Using instant service (privacy mode)');
			return this.transcribeWithInstant(audioBlob);
		}

		// Use preference if set
		if (config.preferredMode !== 'auto') {
			switch (config.preferredMode) {
				case 'webspeech':
					// Even with webspeech preference, instantTranscription can use it as fallback
					return this.transcribeWithInstant(audioBlob);
				case 'whisper':
					return this.transcribeWithInstant(audioBlob);
				case 'instant':
					return this.transcribeWithInstant(audioBlob);
				case 'vosk':
					return this.transcribeWithVosk(audioBlob);
			}
		}

		// Auto mode - always use instant for progressive loading experience
		console.log('[HybridTranscription] Using instant service (auto mode)');
		return this.transcribeWithInstant(audioBlob);
	}

	/**
	 * Transcribe using Instant Transcription Service
	 * This provides progressive quality: Web Speech → Tiny Model → Target Model
	 */
	async transcribeWithInstant(audioBlob) {
		try {
			console.log('[HybridTranscription] Calling instantTranscription.transcribeAudio...');
			const result = await instantTranscription.transcribeAudio(audioBlob);
			console.log('[HybridTranscription] Instant transcription result:', result);

			// Return just the text for compatibility
			if (typeof result === 'object' && result.text) {
				console.log('[HybridTranscription] Returning text from result object:', result.text);
				return result.text;
			}
			console.log('[HybridTranscription] Returning raw result:', result);
			return result;
		} catch (error) {
			console.error('[HybridTranscription] Instant transcription failed:', error);
			// Fallback to direct whisper if instant fails
			console.log('[HybridTranscription] Falling back to Whisper...');
			return this.transcribeWithWhisper(audioBlob);
		}
	}

	/**
	 * Check if we can use Web Speech API
	 * (It requires real-time microphone, not pre-recorded audio)
	 */
	canUseWebSpeech() {
		// Web Speech API doesn't work with blobs, only real-time
		// So we need to check if we're in a recording context
		return false; // For now, always use Whisper for blob transcription
	}

	/**
	 * Transcribe using Web Speech API
	 */
	async transcribeWithWebSpeech(audioBlob) {
		// Web Speech API doesn't support blob transcription
		// It only works with real-time microphone input
		throw new Error('Web Speech API requires real-time microphone access');
	}

	/**
	 * Transcribe using Whisper Ultimate (fallback method)
	 */
	async transcribeWithWhisper(audioBlob) {
		// Ensure Whisper Ultimate is loaded
		if (!this.whisperReady) {
			const result = await whisperServiceUltimate.preloadModel();
			if (!result.success) {
				throw new Error('Failed to load Whisper model');
			}
			this.whisperReady = true;
		}

		const result = await whisperServiceUltimate.transcribeAudio(audioBlob);
		return result.text || result;
	}

	/**
	 * Transcribe using Vosk (lightweight alternative)
	 */
	async transcribeWithVosk(audioBlob) {
		// Ensure Vosk is loaded
		if (!this.voskReady) {
			const result = await voskService.initialize();
			if (!result.success) {
				throw new Error('Failed to load Vosk model');
			}
			this.voskReady = true;
		}

		return voskService.transcribeAudio(audioBlob);
	}

	/**
	 * Get service statistics
	 */
	getStats() {
		const status = get(hybridStatus);
		const config = get(transcriptionConfig);

		return {
			mode: this.activeService,
			available: {
				webSpeech: status.webSpeechAvailable,
				whisper: status.whisperAvailable,
				vosk: status.voskAvailable,
				webGPU: status.webGPUAvailable
			},
			settings: {
				preferredMode: config.preferredMode,
				privacyMode: config.privacyMode,
				modelSize: config.modelSize,
				offlineEngine: config.offlineEngine
			},
			recommendation: status.recommendation,
			downloadSize: this.getDownloadSize()
		};
	}

	getDownloadSize() {
		const config = get(transcriptionConfig);
		const status = get(hybridStatus);

		// If using Web Speech, no download
		if (this.activeService === 'webspeech' && status.webSpeechAvailable) {
			return 0;
		}

		// If using Vosk
		if (this.activeService === 'vosk' || config.preferredMode === 'vosk') {
			return 15 * 1024 * 1024; // 15MB for Vosk small model
		}

		// Whisper model sizes
		const sizes = {
			tiny: 39 * 1024 * 1024,
			base: 74 * 1024 * 1024,
			small: 244 * 1024 * 1024
		};

		return sizes[config.modelSize] || sizes.tiny;
	}

	/**
	 * Switch transcription mode
	 */
	async switchMode(mode) {
		transcriptionConfig.update((c) => ({ ...c, preferredMode: mode }));
		this.activeService = mode;

		// Preload if switching to Whisper
		if (mode === 'whisper' && !this.whisperReady) {
			await whisperServiceUltimate.preloadModel();
			this.whisperReady = true;
		}

		// Preload if switching to Vosk
		if (mode === 'vosk' && !this.voskReady) {
			await voskService.initialize();
			this.voskReady = true;
		}
	}

	/**
	 * Toggle privacy mode
	 */
	togglePrivacyMode(enabled) {
		transcriptionConfig.update((c) => ({ ...c, privacyMode: enabled }));

		if (enabled) {
			this.activeService = 'whisper';
		} else {
			const status = get(hybridStatus);
			this.activeService = status.recommendation;
		}
	}
}

// Export singleton instance - lazily created on first access
let _hybridTranscriptionService;
export const hybridTranscriptionService = {
	get instance() {
		if (!_hybridTranscriptionService && typeof window !== 'undefined') {
			_hybridTranscriptionService = new HybridTranscriptionService();
		}
		return _hybridTranscriptionService;
	},
	// Proxy methods to the instance
	transcribeAudio(audioBlob) {
		if (!this.instance) {
			throw new Error('Hybrid Transcription Service not available in this environment');
		}
		return this.instance.transcribeAudio(audioBlob);
	},
	initializeServices() {
		return this.instance?.initializeServices();
	},
	cleanup() {
		return this.instance?.cleanup();
	}
};
