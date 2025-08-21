// ===================================================================
// INSTANT TRANSCRIPTION - Use Web Speech as fallback for speed
// ===================================================================

import { whisperServiceUltimate } from './whisper/whisperServiceUltimate';
import { webSpeechService } from './webSpeechService';
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
		this.targetModel = 'distil-medium';
		this.currentModel = null;
		this.isInitializing = false;
	}

	async initialize() {
		if (this.isInitializing) return;
		this.isInitializing = true;

		// Load user preference
		const saved = localStorage.getItem('talktype_model_prefs');
		if (saved) {
			const prefs = JSON.parse(saved);
			this.targetModel = this.getModelIdFromPreference(prefs.model);
		}

		// Start loading Whisper in background
		this.loadWhisperInBackground();
	}

	getModelIdFromPreference(pref) {
		const mapping = {
			small: 'distil-small',
			medium: 'distil-medium',
			pro: 'distil-large-v3'
		};
		return mapping[pref] || 'distil-medium';
	}

	async loadWhisperInBackground() {
		// Phase 1: Load TINY model first (1-3 seconds!)
		setTimeout(async () => {
			try {
				console.log('⚡ Loading tiny model for super fast start...');
				transcriptionQuality.set({
					quality: 'loading',
					message: 'Loading fast model...',
					isUpgrading: true
				});

				// Try the 10MB quantized tiny first!
				await whisperServiceUltimate.preloadModel('tiny-q8');
				this.whisperReady = true;
				this.currentModel = 'tiny-q8';

				console.log('✅ Tiny model ready in seconds!');
				transcriptionQuality.set({
					quality: 'good',
					message: 'Fast transcription ready',
					isUpgrading: false
				});

				// Re-transcribe with tiny model
				if (this.lastAudioBlob && this.onUpgradeReady) {
					this.upgradeLastTranscription();
				}

				// Phase 2: Load target model in background
				this.loadTargetModel();
			} catch (error) {
				console.warn('Tiny model failed, loading target directly', error);
				this.loadTargetModel();
			}
		}, 100); // Start immediately
	}

	async loadTargetModel() {
		// Load the user's preferred model after tiny is ready
		setTimeout(async () => {
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
		}, 5000); // Wait 5 seconds before upgrading
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
				console.warn('Whisper failed, falling back to Web Speech', error);
			}
		}

		// Use Web Speech for instant response
		if (webSpeechService.isSupported()) {
			console.log('🎙️ Using Web Speech for instant transcription');
			transcriptionQuality.set({
				quality: 'instant',
				message: this.whisperReady ? 'Quick mode' : 'Loading better quality...',
				isUpgrading: !this.whisperReady
			});

			try {
				const result = await webSpeechService.transcribeAudio(audioBlob);
				return {
					text: result.text,
					quality: 'instant',
					provisional: true,
					message: this.whisperReady ? null : 'Better quality loading...'
				};
			} catch (error) {
				console.warn('Web Speech failed', error);
			}
		}

		// Wait for Whisper if nothing else works
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

	getStatus() {
		return {
			whisperReady: this.whisperReady,
			webSpeechAvailable: webSpeechService.isSupported(),
			targetModel: this.targetModel,
			ready: this.whisperReady || webSpeechService.isSupported()
		};
	}
}

// Export singleton
export const instantTranscription = new InstantTranscriptionService();
