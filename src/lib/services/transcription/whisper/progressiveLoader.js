// ===================================================================
// PROGRESSIVE MODEL LOADER - Instant transcription with quality upgrade
// ===================================================================

import { whisperServiceUltimate } from './whisperServiceUltimate';
import { webSpeechService } from '../webSpeechService';

class ProgressiveTranscriptionLoader {
	constructor() {
		this.currentTier = 0;
		this.isUpgrading = false;
		this.pendingUpgrade = null;
		this.lastAudioBlob = null;
		this.modelTiers = [
			{ id: 'webspeech', name: 'Instant', service: 'webspeech' },
			{ id: 'distil-tiny', name: 'Tiny', size: 39, service: 'whisper' },
			{ id: 'distil-small', name: 'Small', size: 83, service: 'whisper' },
			{ id: 'distil-medium', name: 'Medium', size: 166, service: 'whisper' },
			{ id: 'distil-large-v3', name: 'Large', size: 750, service: 'whisper' }
		];

		// User's target model from preferences
		this.targetModel = 'distil-medium';
		this.loadedModels = new Set();

		// Callbacks
		this.onModelUpgrade = null;
		this.onTranscriptionUpgrade = null;
	}

	async initialize() {
		// Load user preference
		const saved = localStorage.getItem('talktype_model_prefs');
		if (saved) {
			const prefs = JSON.parse(saved);
			this.targetModel = this.getModelIdFromPreference(prefs.model);
		}

		// Start loading chain immediately
		this.startProgressiveLoading();

		// Initialize Web Speech for instant fallback
		if (webSpeechService.isSupported()) {
			console.log('🚀 Web Speech ready for instant transcription');
			this.currentTier = 0;
		}
	}

	getModelIdFromPreference(pref) {
		const mapping = {
			small: 'distil-small',
			medium: 'distil-medium',
			pro: 'distil-large-v3'
		};
		return mapping[pref] || 'distil-medium';
	}

	async startProgressiveLoading() {
		// Phase 1: Load tiny model first (5-10 seconds)
		setTimeout(async () => {
			if (!this.loadedModels.has('distil-tiny')) {
				console.log('⏳ Loading tiny model in background...');
				try {
					await whisperServiceUltimate.preloadModel('distil-tiny');
					this.loadedModels.add('distil-tiny');
					this.currentTier = Math.max(this.currentTier, 1);
					console.log('✅ Tiny model ready!');

					// Re-transcribe if we have pending audio
					if (this.lastAudioBlob && this.onTranscriptionUpgrade) {
						this.upgradeTranscription(this.lastAudioBlob);
					}
				} catch (err) {
					console.warn('Tiny model load failed, continuing...', err);
				}
			}
		}, 1000); // Start after 1 second

		// Phase 2: Load small model (10-20 seconds)
		setTimeout(async () => {
			if (!this.loadedModels.has('distil-small')) {
				console.log('⏳ Loading small model in background...');
				try {
					await whisperServiceUltimate.preloadModel('distil-small');
					this.loadedModels.add('distil-small');
					this.currentTier = Math.max(this.currentTier, 2);
					console.log('✅ Small model ready!');

					// Re-transcribe if target is small
					if (this.targetModel === 'distil-small' && this.lastAudioBlob) {
						this.upgradeTranscription(this.lastAudioBlob);
					}
				} catch (err) {
					console.warn('Small model load failed, continuing...', err);
				}
			}
		}, 5000); // Start after 5 seconds

		// Phase 3: Load target model (20-60 seconds depending on size)
		setTimeout(async () => {
			if (!this.loadedModels.has(this.targetModel)) {
				console.log(`⏳ Loading target model (${this.targetModel}) in background...`);
				try {
					await whisperServiceUltimate.preloadModel(this.targetModel);
					this.loadedModels.add(this.targetModel);
					const targetTier = this.modelTiers.findIndex((m) => m.id === this.targetModel);
					this.currentTier = Math.max(this.currentTier, targetTier);
					console.log(`✅ Target model ready: ${this.targetModel}`);

					// Final quality upgrade
					if (this.lastAudioBlob && this.onTranscriptionUpgrade) {
						this.upgradeTranscription(this.lastAudioBlob);
					}

					// Notify UI that we're at full quality
					if (this.onModelUpgrade) {
						this.onModelUpgrade({
							model: this.targetModel,
							quality: 'full',
							message: 'High quality transcription ready!'
						});
					}
				} catch (err) {
					console.warn('Target model load failed', err);
				}
			}
		}, 10000); // Start after 10 seconds
	}

	async transcribeAudio(audioBlob, options = {}) {
		// Store for potential re-transcription
		this.lastAudioBlob = audioBlob;

		// Determine best available service
		const bestAvailable = this.getBestAvailableService();

		if (bestAvailable.service === 'webspeech') {
			// Use Web Speech for instant response
			console.log('🎙️ Using Web Speech for instant transcription');
			try {
				const result = await webSpeechService.transcribeAudio(audioBlob);

				// Mark as provisional
				return {
					text: result.text,
					provisional: true,
					quality: 'instant',
					message: 'Quick transcription (upgrading in background...)'
				};
			} catch (err) {
				console.warn('Web Speech failed, waiting for models...', err);
				// Fall through to whisper
			}
		}

		// Use best available Whisper model
		const modelToUse = bestAvailable.id;
		console.log(`🎯 Using ${modelToUse} for transcription`);

		try {
			await whisperServiceUltimate.switchModel(modelToUse);
			const result = await whisperServiceUltimate.transcribeAudio(audioBlob, options);

			const isFinalQuality = modelToUse === this.targetModel;
			return {
				text: result.text,
				provisional: !isFinalQuality,
				quality: isFinalQuality ? 'full' : 'good',
				message: isFinalQuality ? null : 'Good quality (still upgrading...)'
			};
		} catch (err) {
			console.error('Transcription failed:', err);
			throw err;
		}
	}

	getBestAvailableService() {
		// Return the best loaded model/service
		if (this.loadedModels.has(this.targetModel)) {
			return this.modelTiers.find((m) => m.id === this.targetModel);
		}

		// Check loaded models in order of quality
		const preferenceOrder = ['distil-large-v3', 'distil-medium', 'distil-small', 'distil-tiny'];
		for (const modelId of preferenceOrder) {
			if (this.loadedModels.has(modelId)) {
				return this.modelTiers.find((m) => m.id === modelId);
			}
		}

		// Fallback to Web Speech if available
		if (webSpeechService.isSupported()) {
			return this.modelTiers[0]; // webspeech
		}

		// Return tiny as last resort (will trigger loading)
		return this.modelTiers[1];
	}

	async upgradeTranscription(audioBlob) {
		// Re-transcribe with better model in background
		if (this.isUpgrading) return;

		this.isUpgrading = true;
		const bestModel = this.getBestAvailableService();

		if (bestModel.service === 'whisper') {
			console.log(`📈 Upgrading transcription with ${bestModel.id}`);
			try {
				await whisperServiceUltimate.switchModel(bestModel.id);
				const result = await whisperServiceUltimate.transcribeAudio(audioBlob);

				if (this.onTranscriptionUpgrade) {
					this.onTranscriptionUpgrade({
						text: result.text,
						quality: bestModel.id === this.targetModel ? 'full' : 'better',
						model: bestModel.id
					});
				}
			} catch (err) {
				console.warn('Upgrade transcription failed:', err);
			}
		}

		this.isUpgrading = false;
	}

	// Preload specific model on demand
	async ensureModelLoaded(modelId) {
		if (!this.loadedModels.has(modelId)) {
			console.log(`📥 Loading ${modelId} on demand...`);
			await whisperServiceUltimate.preloadModel(modelId);
			this.loadedModels.add(modelId);
		}
	}

	// Get loading status
	getStatus() {
		return {
			currentTier: this.currentTier,
			targetModel: this.targetModel,
			loadedModels: Array.from(this.loadedModels),
			bestAvailable: this.getBestAvailableService().id,
			isReady: this.loadedModels.size > 0 || webSpeechService.isSupported()
		};
	}
}

// Export singleton
export const progressiveLoader = new ProgressiveTranscriptionLoader();
