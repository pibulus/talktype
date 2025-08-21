/**
 * Fast WhisperService with optimized CDN loading
 * Uses transformers.js built-in CDN with optimizations
 */

import { get, writable } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { pipeline, env } from '@xenova/transformers';
import { convertToWAV as convertToRawAudio, needsConversion } from './audioConverter';
import { getModelInfo } from './modelRegistry';
import {
	updateDownloadStatus,
	setProgress,
	setComplete,
	setError,
	updateDownloadMetrics,
	resetDownloadMetrics
} from './modelDownloader';
import { DownloadSpeedTracker } from '../utils/parallelDownloader';
import { modelShareService } from '../utils/modelSharing';

// Configure transformers.js for optimal performance
env.allowRemoteModels = true;
env.remoteURL = 'https://huggingface.co/'; // Use HuggingFace CDN
env.localURL = '/models/'; // Fallback to local

// Disable unnecessary features for faster loading
if (typeof window !== 'undefined' && window.ort) {
	window.ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
	window.ort.env.wasm.simd = true;
	window.ort.env.wasm.proxy = false;
}

// Service status store
export const whisperStatus = writable({
	isLoaded: false,
	isLoading: false,
	progress: 0,
	error: null,
	selectedModel: 'tiny',
	supportsWhisper: true,
	downloadSpeed: null,
	eta: null
});

/**
 * Fast WhisperService with CDN optimizations
 */
export class WhisperServiceFast {
	constructor() {
		this.transcriber = null;
		this.modelLoadPromise = null;
		this.isSupported = typeof window !== 'undefined';
		this.speedTracker = new DownloadSpeedTracker();
		this.startTime = null;

		// Initialize status
		this.updateStatus({
			supportsWhisper: this.isSupported
		});
	}

	/**
	 * Update the status store with new values
	 */
	updateStatus(updates) {
		whisperStatus.update((current) => ({ ...current, ...updates }));
	}

	/**
	 * Preload the Whisper model with speed tracking
	 */
	async preloadModel() {
		// Don't reload if already loaded
		if (this.transcriber) {
			return { success: true, transcriber: this.transcriber };
		}

		// Return existing promise if already loading
		if (this.modelLoadPromise) {
			return this.modelLoadPromise;
		}

		// Check if running in browser environment
		if (!this.isSupported) {
			this.updateStatus({
				error: 'Transformers.js is not supported in this environment',
				isLoading: false
			});
			return { success: false, error: 'Environment not supported' };
		}

		// Start the loading process
		this.updateStatus({
			isLoading: true,
			progress: 0,
			error: null
		});

		resetDownloadMetrics();
		this.startTime = Date.now();

		// Get selected model
		const prefs = get(userPreferences);
		const modelKey = prefs.whisperModel || 'tiny';
		const modelConfig = getModelInfo(modelKey);

		// Update download status
		updateDownloadStatus({
			inProgress: true,
			progress: 0,
			modelId: modelKey,
			error: null,
			stage: 'initializing'
		});

		// First, try to get model from another tab
		console.log('Checking for model in other tabs...');
		const sharedModel = await modelShareService.requestModel(modelConfig.id);

		if (sharedModel) {
			console.log('🚀 Got model instantly from another tab!');
			this.updateStatus({
				progress: 100,
				selectedModel: modelKey
			});
			setComplete();

			// Still need to initialize the transcriber
			// In a full implementation, we'd load from the blob
		}

		this.modelLoadPromise = this._loadModel(modelConfig, modelKey);
		return this.modelLoadPromise;
	}

	/**
	 * Load model with progress tracking
	 */
	async _loadModel(modelConfig, modelKey) {
		const originalWarn = console.warn;

		try {
			// Configure ONNX Runtime environment
			if (typeof window !== 'undefined') {
				await this.configureONNXEnvironment();
			}

			this.updateStatus({
				selectedModel: modelKey,
				progress: 10
			});

			// Track download progress
			this.speedTracker.start();
			let lastProgress = 0;

			// Temporarily suppress console warnings
			console.warn = () => {};

			// Create transcription pipeline with progress tracking
			console.log(`Loading model: ${modelConfig.id}`);
			this.transcriber = await pipeline('automatic-speech-recognition', modelConfig.id, {
				// Use quantized models for faster loading if available
				quantized: true,

				// Progress callback for download tracking
				progress_callback: (progress) => {
					if (progress.status === 'downloading' || progress.status === 'progress') {
						const percent =
							progress.progress ||
							(progress.loaded && progress.total
								? Math.round((progress.loaded / progress.total) * 100)
								: 0);

						if (percent > lastProgress) {
							lastProgress = percent;
							const actualProgress = Math.round(percent * 0.8) + 10; // 10-90%

							this.updateStatus({
								progress: actualProgress,
								downloadSpeed: this.getDownloadSpeed()
							});
							setProgress(actualProgress / 100, 'downloading');

							// Update metrics
							if (progress.loaded && progress.total) {
								this.speedTracker.update(progress.loaded);
								updateDownloadMetrics(progress.loaded, progress.total);
							}
						}
					} else if (progress.status === 'ready') {
						this.updateStatus({ progress: 95 });
						setProgress(0.95, 'ready');
					} else if (progress.status === 'done') {
						this.updateStatus({ progress: 98 });
						setProgress(0.98, 'finalizing');
					}
				}
			});

			// Restore console.warn
			console.warn = originalWarn;

			// Model is loaded
			const loadTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
			console.log(`✨ Whisper model loaded in ${loadTime} seconds!`);

			this.updateStatus({
				isLoaded: true,
				isLoading: false,
				progress: 100,
				error: null,
				downloadSpeed: null,
				eta: null
			});

			// Mark download as complete
			setComplete();

			return { success: true, transcriber: this.transcriber };
		} catch (error) {
			console.error('Failed to load Whisper model:', error);

			// Restore console.warn
			if (originalWarn) {
				console.warn = originalWarn;
			}

			this.updateStatus({
				isLoaded: false,
				isLoading: false,
				progress: 0,
				error: error.message || 'Failed to load Whisper model'
			});

			setError(error.message || 'Failed to load Whisper model');

			this.modelLoadPromise = null;
			return { success: false, error };
		}
	}

	/**
	 * Configure ONNX Runtime environment
	 */
	async configureONNXEnvironment() {
		const waitForOrt = async () => {
			let attempts = 0;
			while (!window.ort && attempts < 10) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				attempts++;
			}

			if (window.ort) {
				try {
					// Configure for optimal performance
					window.ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
					window.ort.env.logLevel = 'fatal';
					window.ort.env.debug = false;

					if (window.ort.env.wasm) {
						window.ort.env.wasm.simd = true;
						window.ort.env.wasm.proxy = false;
					}
				} catch (e) {
					console.log('Could not configure ONNX environment:', e.message);
				}
			}
		};

		await waitForOrt();
	}

	/**
	 * Get formatted download speed
	 */
	getDownloadSpeed() {
		const speed = this.speedTracker.getFormattedSpeed();
		return speed === 'calculating...' ? null : speed;
	}

	/**
	 * Transcribe audio using the loaded model
	 */
	async transcribeAudio(audioBlob) {
		try {
			// Ensure model is loaded
			if (!this.transcriber) {
				const { success, error } = await this.preloadModel();
				if (!success) {
					throw error || new Error('Failed to load model');
				}
			}

			// Check if audio blob has content
			if (audioBlob.size === 0) {
				throw new Error('Audio blob is empty - no audio recorded');
			}

			// Convert audio to Float32Array if needed
			let processedAudio = audioBlob;
			if (needsConversion(audioBlob.type)) {
				this.updateStatus({ isLoading: true, progress: 10 });

				try {
					processedAudio = await convertToRawAudio(audioBlob);
				} catch (conversionError) {
					console.warn('Audio conversion failed, using original format:', conversionError.message);
					processedAudio = audioBlob;
				}
			}

			// Perform transcription
			this.updateStatus({ isLoading: true, progress: 20 });

			// Calculate audio duration
			let audioDuration;
			if (processedAudio instanceof Float32Array) {
				audioDuration = processedAudio.length / 16000;
			} else {
				audioDuration = processedAudio.size / (16000 * 2);
			}

			// Perform transcription with optimal configuration
			const transcriptionOptions = {
				task: 'transcribe',
				// Use larger chunk size for faster processing
				chunk_length_s: audioDuration > 30 ? 30 : undefined,
				stride_length_s: audioDuration > 30 ? 5 : undefined
			};

			const result = await this.transcriber(processedAudio, transcriptionOptions);

			this.updateStatus({ isLoading: false, progress: 100 });

			return result?.text || '';
		} catch (error) {
			console.error('Error transcribing with Whisper:', error);

			this.updateStatus({
				isLoading: false,
				error: error.message || 'Failed to transcribe audio with Whisper'
			});

			throw new Error(`Failed to transcribe audio with Whisper: ${error.message}`);
		}
	}

	/**
	 * Check device capability
	 */
	async checkDeviceCapability() {
		if (!this.isSupported) {
			return {
				capable: false,
				reason: 'Browser environment not supported'
			};
		}

		if (navigator?.deviceMemory) {
			if (navigator.deviceMemory < 2) {
				return {
					capable: true,
					performant: false,
					reason: 'Low device memory - use tiny model for best performance'
				};
			} else if (navigator.deviceMemory < 4) {
				return {
					capable: true,
					performant: true,
					reason: 'Medium device memory - base model recommended'
				};
			}
		}

		return {
			capable: true,
			performant: true,
			reason: 'Device appears to have sufficient resources'
		};
	}

	/**
	 * Clear model from memory
	 */
	unloadModel() {
		if (this.transcriber) {
			this.transcriber = null;
			this.modelLoadPromise = null;

			this.updateStatus({
				isLoaded: false,
				progress: 0
			});

			return true;
		}
		return false;
	}
}

// Service instance
export const whisperServiceFast = new WhisperServiceFast();
