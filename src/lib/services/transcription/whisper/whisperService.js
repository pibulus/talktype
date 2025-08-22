/**
 * WhisperService - Client-side speech transcription using @xenova/transformers
 * Adapted for TalkType's transcription needs
 */

import { get, writable } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js environment for optimal performance
env.allowRemoteModels = true;
// Cache models locally in browser for instant subsequent loads
env.cacheDir = '.transformers-cache';
// Use default Hugging Face CDN (jsDelivr doesn't host the models)
// Models are cached after first download anyway
import { convertToWAV as convertToRawAudio, needsConversion } from './audioConverter';
import { getModelInfo } from './modelRegistry';
import { updateDownloadStatus, setProgress, setComplete, setError } from './modelDownloader';

// Service status store
export const whisperStatus = writable({
	isLoaded: false,
	isLoading: false,
	progress: 0,
	error: null,
	selectedModel: 'tiny',
	supportsWhisper: true
});

/**
 * WhisperService class for offline transcription
 */
export class WhisperService {
	constructor() {
		this.transcriber = null;
		this.modelLoadPromise = null;
		this.isSupported = typeof window !== 'undefined';

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
	 * Preload the Whisper model
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

		// Also update download status for UI tracking
		updateDownloadStatus({
			inProgress: true,
			progress: 0,
			modelId: get(userPreferences).whisperModel || 'tiny',
			error: null,
			stage: 'initializing'
		});

		this.modelLoadPromise = this._loadModel();
		return this.modelLoadPromise;
	}

	/**
	 * Internal method to load the model
	 */
	async _loadModel() {
		try {
			// Check if running in browser environment
			if (typeof window === 'undefined') {
				throw new Error('Whisper transcription only available in browser environment');
			}

			// Get selected model from preferences or default to tiny
			const prefs = get(userPreferences);
			const modelKey = prefs.whisperModel || 'tiny';
			const modelConfig = getModelInfo(modelKey);

			if (!modelConfig) {
				throw new Error(`Unknown model: ${modelKey}`);
			}

			this.updateStatus({
				selectedModel: modelKey,
				progress: 10
			});

			// Configure ONNX Runtime environment to suppress warnings
			if (typeof window !== 'undefined') {
				// Wait for ort to be available
				const waitForOrt = async () => {
					let attempts = 0;
					while (!window.ort && attempts < 10) {
						await new Promise((resolve) => setTimeout(resolve, 100));
						attempts++;
					}

					if (window.ort) {
						try {
							// Suppress all ONNX warnings and verbose output
							window.ort.env.wasm.numThreads = 1;
							window.ort.env.logLevel = 'fatal'; // Only show fatal errors
							window.ort.env.debug = false;

							// Also try to configure the WebAssembly environment
							if (window.ort.env.wasm) {
								window.ort.env.wasm.simd = true;
								window.ort.env.wasm.proxy = false;
							}
						} catch (e) {
							console.log('Could not configure ONNX environment:', e.message);
						}
					}
				};

				// Configure before loading model
				await waitForOrt();
			}

			// Temporarily suppress console.warn during model loading
			const originalWarn = console.warn;
			console.warn = () => {}; // Suppress warnings

			// Track download start time for speed calculation
			const downloadStartTime = Date.now();
			let lastProgressTime = downloadStartTime;
			let lastProgressBytes = 0;

			try {
				// Create transcription pipeline with progress tracking
				this.transcriber = await pipeline('automatic-speech-recognition', modelConfig.id, {
					// Configure model options to minimize warnings
					onnx: {
						logSeverityLevel: 4, // 0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Fatal
						logVerbosityLevel: 0,
						enableCpuMemArena: false,
						enableMemPattern: false,
						executionMode: 'sequential',
						graphOptimizationLevel: 'basic'
					},
					progress_callback: (progress) => {
						// Convert progress data to percentage
						if (progress.status === 'downloading') {
							const percent = Math.round((progress.loaded / progress.total) * 80) + 10;

							// Calculate download speed
							const currentTime = Date.now();
							const timeDiff = (currentTime - lastProgressTime) / 1000; // seconds
							const bytesDiff = progress.loaded - lastProgressBytes;
							const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

							// Update for next calculation
							lastProgressTime = currentTime;
							lastProgressBytes = progress.loaded;

							// Calculate ETA
							const remainingBytes = progress.total - progress.loaded;
							const eta = speed > 0 ? remainingBytes / speed : 0;

							this.updateStatus({ progress: percent });
							setProgress(percent / 100, 'downloading');

							// Update download status with speed info
							updateDownloadStatus({
								bytesLoaded: progress.loaded,
								bytesTotal: progress.total,
								speed: speed,
								eta: eta
							});
						} else if (progress.status === 'loading') {
							this.updateStatus({ progress: 90 });
							setProgress(0.9, 'loading');
						} else if (progress.status === 'ready') {
							this.updateStatus({ progress: 95 });
							setProgress(0.95, 'ready');
						}
					}
				});
			} finally {
				// Restore console.warn
				console.warn = originalWarn;
			}

			// Calculate total load time
			const loadTimeSeconds = ((Date.now() - downloadStartTime) / 1000).toFixed(1);

			// Model is loaded
			this.updateStatus({
				isLoaded: true,
				isLoading: false,
				progress: 100,
				error: null
			});

			// Mark download as complete
			setComplete();

			console.log(`✨ Whisper model loaded successfully in ${loadTimeSeconds}s`);
			return { success: true, transcriber: this.transcriber };
		} catch (error) {
			// Restore console.warn if there was an error
			if (typeof originalWarn !== 'undefined') {
				console.warn = originalWarn;
			}
			console.error('Failed to load Whisper model:', error);

			this.updateStatus({
				isLoaded: false,
				isLoading: false,
				progress: 0,
				error: error.message || 'Failed to load Whisper model'
			});

			// Mark download as failed
			setError(error.message || 'Failed to load Whisper model');

			this.modelLoadPromise = null;
			return { success: false, error };
		}
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

			// Convert audio to Float32Array if needed for Whisper compatibility
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

			// Calculate audio duration based on actual processed audio data
			let audioDuration;
			if (processedAudio instanceof Float32Array) {
				// Audio is now resampled to 16kHz by AudioContext
				audioDuration = processedAudio.length / 16000;
			} else {
				// For Blob, estimate from size
				audioDuration = processedAudio.size / (16000 * 2);
			}

			// Start with minimal options to debug
			const transcriptionOptions = {};

			// Only use chunking for very long audio
			if (audioDuration > 30) {
				transcriptionOptions.chunk_length_s = 30;
				// Using default stride for now
			}

			console.log('[Whisper] Transcribing with options:', transcriptionOptions);
			console.log('[Whisper] Audio duration:', audioDuration, 'seconds');
			console.log('[Whisper] Audio data type:', processedAudio.constructor.name, 'length:', processedAudio.length || processedAudio.size);
			
			const result = await this.transcriber(processedAudio, transcriptionOptions);
			
			console.log('[Whisper] Raw transcription result:', result);

			this.updateStatus({ isLoading: false, progress: 100 });

			// Return the transcribed text
			const text = result?.text || '';
			
			console.log('[Whisper] Final text:', text);
			
			// Log if we see obvious repetition for debugging
			if (text.includes('So we have a lot of options So we have a lot of options')) {
				console.warn('[Whisper] Detected repetition in output, may need to adjust model parameters');
			}

			return text;
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
	 * Check if the current device is likely capable of running Whisper
	 */
	async checkDeviceCapability() {
		// Basic capability check based on browser environment
		if (!this.isSupported) {
			return {
				capable: false,
				reason: 'Browser environment not supported'
			};
		}

		// Check device memory (if available)
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

		// Device seems capable
		return {
			capable: true,
			performant: true,
			reason: 'Device appears to have sufficient resources'
		};
	}

	/**
	 * Clear model from memory (useful to free up resources)
	 */
	unloadModel() {
		if (this.transcriber) {
			// Transformers.js handles cleanup automatically
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
export const whisperService = new WhisperService();
