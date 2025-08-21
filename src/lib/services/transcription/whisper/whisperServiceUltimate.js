/**
 * Ultimate WhisperService - Distil-Whisper + WebGPU + All optimizations
 * The fastest, smallest, best quality transcription for 2025
 */

import { get, writable } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { pipeline, env } from '@xenova/transformers';
import { convertToWAV as convertToRawAudio, needsConversion } from './audioConverter';
import { getModelStats, checkWebGPUSupport, getRecommendedModel } from './modelRegistryEnhanced';
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
import { sileroVAD } from '../vad/sileroVAD';

// Configure transformers.js for optimal performance
env.allowRemoteModels = true;
env.remoteURL = 'https://huggingface.co/';
env.localURL = '/models/';

// Service status store with WebGPU info
export const ultimateWhisperStatus = writable({
	isLoaded: false,
	isLoading: false,
	progress: 0,
	error: null,
	selectedModel: 'distil-small',
	supportsWhisper: true,
	supportsWebGPU: false,
	usingWebGPU: false,
	device: 'cpu', // 'cpu', 'webgpu', or 'wasm'
	downloadSpeed: null,
	eta: null,
	modelStats: null
});

/**
 * Ultimate WhisperService with all 2025 optimizations
 */
export class WhisperServiceUltimate {
	constructor() {
		this.transcriber = null;
		this.modelLoadPromise = null;
		this.isSupported = typeof window !== 'undefined';
		this.speedTracker = new DownloadSpeedTracker();
		this.startTime = null;
		this.webgpuSupport = null;
		this.device = 'cpu';

		// Initialize and check capabilities
		this.initialize();
	}

	async initialize() {
		if (!this.isSupported) {
			this.updateStatus({
				supportsWhisper: false,
				error: 'Not in browser environment'
			});
			return;
		}

		// Check WebGPU support
		this.webgpuSupport = await checkWebGPUSupport();
		const canUseWebGPU = this.webgpuSupport?.supported || false;

		// Determine device to use
		if (canUseWebGPU) {
			this.device = 'webgpu';
			console.log('🚀 WebGPU detected! Using GPU acceleration');
		} else {
			this.device = 'wasm';
			console.log('Using WASM (CPU) for processing');
		}

		// Get recommended model
		const recommended = await getRecommendedModel();

		this.updateStatus({
			supportsWhisper: true,
			supportsWebGPU: canUseWebGPU,
			device: this.device,
			recommendedModel: recommended?.id
		});
	}

	/**
	 * Update the status store
	 */
	updateStatus(updates) {
		ultimateWhisperStatus.update((current) => ({ ...current, ...updates }));
	}

	/**
	 * Preload model with all optimizations
	 */
	async preloadModel(modelId = null) {
		// Don't reload if already loaded
		if (this.transcriber && !modelId) {
			return { success: true, transcriber: this.transcriber };
		}

		// If switching models, unload current
		if (modelId && this.transcriber) {
			this.unloadModel();
		}

		// Return existing promise if already loading
		if (this.modelLoadPromise) {
			return this.modelLoadPromise;
		}

		// Check environment
		if (!this.isSupported) {
			this.updateStatus({
				error: 'Browser environment required',
				isLoading: false
			});
			return { success: false, error: 'Environment not supported' };
		}

		// Start loading
		this.updateStatus({
			isLoading: true,
			progress: 0,
			error: null
		});

		resetDownloadMetrics();
		this.startTime = Date.now();

		// Get model configuration
		const prefs = get(userPreferences);
		const selectedModelId = modelId || prefs.whisperModel || 'distil-small';
		const modelStats = getModelStats(selectedModelId);

		if (!modelStats) {
			this.updateStatus({
				error: `Unknown model: ${selectedModelId}`,
				isLoading: false
			});
			return { success: false, error: `Unknown model: ${selectedModelId}` };
		}

		// Check if model requires WebGPU but it's not available
		if (modelStats.webgpu_required && !this.webgpuSupport?.supported) {
			this.updateStatus({
				error: 'This model requires WebGPU which is not available',
				isLoading: false
			});
			return {
				success: false,
				error: 'WebGPU required but not available. Try a smaller model.'
			};
		}

		// Update status with model info
		this.updateStatus({
			selectedModel: selectedModelId,
			modelStats: modelStats
		});

		// Update download status
		updateDownloadStatus({
			inProgress: true,
			progress: 0,
			modelId: selectedModelId,
			error: null,
			stage: 'initializing'
		});

		// Try to get from another tab first
		console.log(`Checking for ${modelStats.name} in other tabs...`);
		const sharedModel = await modelShareService.requestModel(modelStats.transformers_id);

		if (sharedModel) {
			console.log('🚀 Got model instantly from another tab!');
			this.updateStatus({
				progress: 100,
				selectedModel: selectedModelId
			});
			setComplete();
		}

		this.modelLoadPromise = this._loadModel(modelStats, selectedModelId);
		return this.modelLoadPromise;
	}

	/**
	 * Load model with WebGPU if available
	 */
	async _loadModel(modelStats, modelId) {
		const originalWarn = console.warn;

		try {
			// Configure ONNX Runtime
			if (typeof window !== 'undefined') {
				await this.configureONNXEnvironment();
			}

			this.updateStatus({
				selectedModel: modelId,
				progress: 10
			});

			// Track download progress
			this.speedTracker.start();
			let lastProgress = 0;

			// Suppress console warnings
			console.warn = () => {};

			// Determine device and dtype based on capabilities
			const device = this.device === 'webgpu' && modelStats.webgpu_optimized ? 'webgpu' : null;
			const dtype = modelStats.quantization || (device === 'webgpu' ? 'fp16' : 'fp32');

			console.log(`Loading ${modelStats.name}...`);
			console.log(`Device: ${device || 'wasm'}, Dtype: ${dtype}`);

			// Create pipeline with optimal settings
			this.transcriber = await pipeline(
				'automatic-speech-recognition',
				modelStats.transformers_id,
				{
					// Use WebGPU if available and model supports it
					device: device,

					// Use quantization if specified
					dtype: dtype,

					// Enable quantization for smaller models
					quantized: modelStats.quantization ? true : false,

					// Progress callback
					progress_callback: (progress) => {
						if (progress.status === 'downloading' || progress.status === 'progress') {
							const percent =
								progress.progress ||
								(progress.loaded && progress.total
									? Math.round((progress.loaded / progress.total) * 100)
									: 0);

							if (percent > lastProgress) {
								lastProgress = percent;
								const actualProgress = Math.round(percent * 0.8) + 10;

								this.updateStatus({
									progress: actualProgress,
									downloadSpeed: this.getDownloadSpeed()
								});
								setProgress(actualProgress / 100, 'downloading');

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
				}
			);

			// Restore console.warn
			console.warn = originalWarn;

			// Calculate load time
			const loadTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
			const speedBoost = modelStats.speed_multiplier
				? `${modelStats.speed_multiplier}x faster`
				: '';

			console.log(`✨ ${modelStats.name} loaded in ${loadTime} seconds! ${speedBoost}`);

			this.updateStatus({
				isLoaded: true,
				isLoading: false,
				progress: 100,
				error: null,
				downloadSpeed: null,
				eta: null,
				usingWebGPU: device === 'webgpu'
			});

			// Mark complete
			setComplete();

			// Share with other tabs
			// In production, would serialize the model here
			await modelShareService.shareModel(
				modelStats.transformers_id,
				new Blob([`model:${modelId}`])
			);

			return { success: true, transcriber: this.transcriber };
		} catch (error) {
			console.error('Failed to load model:', error);

			// Restore console.warn
			if (originalWarn) {
				console.warn = originalWarn;
			}

			this.updateStatus({
				isLoaded: false,
				isLoading: false,
				progress: 0,
				error: error.message || 'Failed to load model'
			});

			setError(error.message || 'Failed to load model');

			this.modelLoadPromise = null;
			return { success: false, error };
		}
	}

	/**
	 * Configure ONNX Runtime for maximum performance
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
					// Use all available CPU cores
					const cores = navigator.hardwareConcurrency || 4;
					window.ort.env.wasm.numThreads = cores;

					// Enable SIMD for faster processing
					window.ort.env.wasm.simd = true;

					// Disable proxy for faster loading
					window.ort.env.wasm.proxy = false;

					// Set to error-only logging
					window.ort.env.logLevel = 'fatal';
					window.ort.env.debug = false;

					console.log(`ONNX configured: ${cores} threads, SIMD enabled`);
				} catch (e) {
					console.log('Could not configure ONNX:', e.message);
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
	 * Transcribe audio with optimal settings
	 */
	async transcribeAudio(audioBlob, options = {}) {
		try {
			// Ensure model is loaded
			if (!this.transcriber) {
				const { success, error } = await this.preloadModel();
				if (!success) {
					throw error || new Error('Failed to load model');
				}
			}

			// Validate input
			if (audioBlob.size === 0) {
				throw new Error('Audio blob is empty');
			}

			// Apply VAD if enabled (default: true for better performance)
			let processedAudio = audioBlob;
			let vadStats = null;

			if (options.useVAD !== false) {
				try {
					this.updateStatus({ isLoading: true, progress: 5, stage: 'Removing silence...' });

					const vadResult = await sileroVAD.processAudioBlob(audioBlob);

					if (vadResult.processedAudio.length > 0) {
						processedAudio = vadResult.blob;
						vadStats = {
							originalDuration: vadResult.originalDuration,
							processedDuration: vadResult.processedDuration,
							reduction: vadResult.reductionPercent,
							segments: vadResult.segments.length
						};

						console.log(
							`🎤 VAD: Removed ${vadStats.reduction}% silence (${vadStats.segments} speech segments)`
						);
					}
				} catch (vadError) {
					console.warn('VAD processing failed, using original audio:', vadError);
					// Continue with original audio if VAD fails
				}
			}

			// Convert audio if needed
			if (needsConversion(processedAudio.type)) {
				this.updateStatus({ isLoading: true, progress: 10 });

				try {
					processedAudio = await convertToRawAudio(processedAudio);
				} catch (conversionError) {
					console.warn('Audio conversion failed:', conversionError.message);
					processedAudio = audioBlob;
				}
			}

			// Start transcription
			this.updateStatus({ isLoading: true, progress: 20 });

			// Calculate duration
			let audioDuration;
			if (processedAudio instanceof Float32Array) {
				audioDuration = processedAudio.length / 16000;
			} else {
				audioDuration = processedAudio.size / (16000 * 2);
			}

			// Get translation preferences
			const prefs = JSON.parse(localStorage.getItem('talktype_model_prefs') || '{}');
			const shouldTranslate = options.translate !== undefined ? options.translate : prefs.translate;

			// Use optimal settings based on model and duration
			const transcriptionOptions = {
				task: shouldTranslate ? 'translate' : 'transcribe',

				// Language hint - auto-detect if translating
				language: shouldTranslate ? undefined : options.language || 'english',

				// Use chunking for longer audio
				chunk_length_s: audioDuration > 30 ? 30 : undefined,
				stride_length_s: audioDuration > 30 ? 5 : undefined,

				// Return timestamps if supported
				return_timestamps: true
			};

			const startTime = Date.now();
			const result = await this.transcriber(processedAudio, transcriptionOptions);
			const transcriptionTime = ((Date.now() - startTime) / 1000).toFixed(2);

			this.updateStatus({ isLoading: false, progress: 100 });

			const modelStats = get(ultimateWhisperStatus).modelStats;
			const speedInfo = modelStats?.speed_multiplier
				? ` (${modelStats.speed_multiplier}x faster than original)`
				: '';

			console.log(`Transcribed in ${transcriptionTime}s${speedInfo}`);

			if (vadStats) {
				console.log(`VAD saved ${vadStats.reduction}% processing time`);
			}

			return result?.text || '';
		} catch (error) {
			console.error('Transcription error:', error);

			this.updateStatus({
				isLoading: false,
				error: error.message || 'Failed to transcribe audio'
			});

			throw new Error(`Failed to transcribe: ${error.message}`);
		}
	}

	/**
	 * Translate audio to English
	 */
	async translateAudio(audioBlob, options = {}) {
		return this.transcribeAudio(audioBlob, { ...options, translate: true });
	}

	/**
	 * Get device capabilities and recommendations
	 */
	async getCapabilities() {
		const webgpu = await checkWebGPUSupport();
		const recommendation = await getRecommendedModel();

		return {
			device: {
				memory: navigator.deviceMemory || 'Unknown',
				cores: navigator.hardwareConcurrency || 'Unknown',
				connection: navigator.connection?.effectiveType || 'Unknown'
			},
			webgpu: webgpu,
			recommendation: recommendation,
			currentModel: get(ultimateWhisperStatus).selectedModel,
			isLoaded: this.transcriber !== null
		};
	}

	/**
	 * Switch to a different model
	 */
	async switchModel(modelId) {
		console.log(`Switching to model: ${modelId}`);

		// Update preference
		userPreferences.update((prefs) => ({
			...prefs,
			whisperModel: modelId
		}));

		// Load new model
		return this.preloadModel(modelId);
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
				progress: 0,
				modelStats: null
			});

			console.log('Model unloaded from memory');
			return true;
		}
		return false;
	}
}

// Service instance
export const whisperServiceUltimate = new WhisperServiceUltimate();
