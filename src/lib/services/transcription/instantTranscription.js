// ===================================================================
// INSTANT TRANSCRIPTION - Progressive Quality Enhancement
// ===================================================================
// ARCHITECTURE:
// 1. ALWAYS loads tiny model (20MB) invisibly on app start (2-3 sec)
// 2. User chooses target quality: Simple/Balanced/Pro (or Auto)
// 3. Progressive chain: Web Speech → Tiny → Target Model
// 4. User NEVER waits - transcription starts immediately
// ===================================================================

import { whisperServiceUltimate } from './whisper/whisperServiceUltimate';
// Lazy import webSpeechService to avoid SSR issues
// import { webSpeechService } from './webSpeechService';
import { writable } from 'svelte/store';

// Store for transcription quality status
export const transcriptionQuality = writable({
	quality: 'loading',
	message: '',
	isUpgrading: false
});

class InstantTranscriptionService {
	constructor() {
		this.whisperReady = false;
		this.lastAudioBlob = null;
		this.targetModel = 'whisper-small-en'; // 154MB English-optimized
		this.currentModel = null;
		this.isInitializing = false;
		this.hasStartedInitialization = false; // Track if we've ever started
		this._webSpeechService = null; // Lazy-loaded reference
	}

	// Lazy load webSpeechService to avoid SSR issues
	async getWebSpeechService() {
		if (!this._webSpeechService && typeof window !== 'undefined') {
			const { webSpeechService } = await import('./webSpeechService');
			this._webSpeechService = webSpeechService;
		}
		return this._webSpeechService;
	}

	async initialize() {
		if (this.isInitializing || this.hasStartedInitialization) return;
		this.isInitializing = true;
		this.hasStartedInitialization = true;

		console.log('[InstantTranscription] Starting lazy initialization on first interaction');

		// Load user preference (only in browser)
		if (typeof localStorage !== 'undefined') {
			const saved = localStorage.getItem('talktype_model_prefs');
			if (saved) {
				const prefs = JSON.parse(saved);
				this.targetModel = this.getModelIdFromPreference(prefs.model);
			}
		}

		// Start loading Whisper in background
		this.loadWhisperInBackground();
	}

	getModelIdFromPreference(pref) {
		// Pro users get multilingual support
		if (pref === 'pro') {
			// For Pro: Use whisper-small which supports 100+ languages
			return 'whisper-small'; // 154MB multilingual
		}

		// Everyone else gets English-optimized model
		return 'whisper-small-en'; // 154MB English-only (slightly better for English)
	}

	async loadWhisperInBackground() {
		// Skip tiny model - go straight to the working model
		try {
			console.log('⚡ Loading model...');
			transcriptionQuality.set({
				quality: 'loading',
				message: 'Loading transcription model...',
				isUpgrading: true
			});

			// Load the working model directly (whisper-small-en)
			await whisperServiceUltimate.preloadModel('whisper-small-en');
			this.whisperReady = true;
			this.currentModel = 'whisper-small-en';

			console.log('✅ Model ready! You can transcribe now.');
			transcriptionQuality.set({
				quality: 'good',
				message: 'Ready to transcribe',
				isUpgrading: false
			});

			// Re-transcribe if we have audio waiting
			if (this.lastAudioBlob && this.onUpgradeReady) {
				this.upgradeLastTranscription();
			}
		} catch (error) {
			console.error('Model loading failed:', error);
			transcriptionQuality.set({
				quality: 'error',
				message: 'Failed to load model',
				isUpgrading: false
			});
		}
	}

	async loadTargetModel() {
		// Load the user's preferred model after tiny is ready
		try {
			if (this.currentModel === this.targetModel) return; // Already at target

			console.log(`📈 Upgrading to ${this.targetModel}...`);
			transcriptionQuality.set({
				quality: 'good',
				message: 'Loading better quality...',
				isUpgrading: true
			});

			await whisperServiceUltimate.preloadModel(this.targetModel);
			this.currentModel = this.targetModel;

			console.log('✅ High-quality model ready!');
			transcriptionQuality.set({
				quality: 'high',
				message: 'High-quality ready',
				isUpgrading: false
			});

			// Final quality upgrade
			if (this.lastAudioBlob && this.onUpgradeReady) {
				this.upgradeLastTranscription();
			}
		} catch (error) {
			console.warn('Target model load failed', error);
			transcriptionQuality.set({
				quality: 'good',
				message: 'Using fast model',
				isUpgrading: false
			});
		}
	}

	async transcribeAudio(audioBlob, options = {}) {
		this.lastAudioBlob = audioBlob;

		// If Whisper is ready, use it
		if (this.whisperReady) {
			console.log('🎯 Using Whisper for high-quality transcription');
			try {
				const result = await whisperServiceUltimate.transcribeAudio(audioBlob, options);
				return {
					text: result.text,
					quality: 'high',
					provisional: false
				};
			} catch (error) {
				console.warn('Whisper failed:', error);
				throw error;
			}
		}

		// Skip Web Speech - users deserve quality from the start
		// Just wait for Whisper to load (tiny model loads in 2-3 seconds)
		if (!this.whisperReady) {
			console.log('⏳ Waiting for Whisper to load...');
			transcriptionQuality.set({
				quality: 'loading',
				message: 'Loading transcription engine...',
				isUpgrading: true
			});

			// Initialize if not already
			if (!this.isInitializing) {
				await this.initialize();
			}

			// Wait up to 30 seconds for Whisper
			const timeout = 30000;
			const start = Date.now();
			while (!this.whisperReady && Date.now() - start < timeout) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}

			if (this.whisperReady) {
				const result = await whisperServiceUltimate.transcribeAudio(audioBlob, options);
				return {
					text: result.text,
					quality: 'high',
					provisional: false
				};
			}
		}

		throw new Error('No transcription service available');
	}

	async upgradeLastTranscription() {
		if (!this.lastAudioBlob || !this.whisperReady) return;

		console.log('📈 Upgrading transcription with Whisper...');
		try {
			const result = await whisperServiceUltimate.transcribeAudio(this.lastAudioBlob);

			if (this.onUpgradeReady) {
				this.onUpgradeReady({
					text: result.text,
					quality: 'high',
					upgraded: true
				});
			}

			transcriptionQuality.set({
				quality: 'high',
				message: 'Upgraded to high quality',
				isUpgrading: false
			});
		} catch (error) {
			console.warn('Upgrade failed:', error);
		}
	}

	// Callback for when transcription is upgraded
	onUpgradeReady = null;

	async getStatus() {
		const webSpeech = await this.getWebSpeechService();
		const isWebSpeechSupported = webSpeech?.isSupported || false;

		return {
			whisperReady: this.whisperReady,
			webSpeechAvailable: isWebSpeechSupported,
			targetModel: this.targetModel,
			ready: this.whisperReady || isWebSpeechSupported
		};
	}
}

// Export singleton
export const instantTranscription = new InstantTranscriptionService();
