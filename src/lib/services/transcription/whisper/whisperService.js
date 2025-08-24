/**
 * WhisperService - Client-side speech transcription using @xenova/transformers
 * Adapted for TalkType's transcription needs
 */

import { get, writable } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { pipeline, env } from '@xenova/transformers';
import { convertToWAV as convertToRawAudio, needsConversion } from './audioConverter';
import { getModelInfo } from './modelRegistry';

// Configure Transformers.js environment IMMEDIATELY for optimal performance
env.allowRemoteModels = true;
// Enable browser cache for models (this is the key setting!)
env.useBrowserCache = true;
// Use IndexedDB for persistent model storage across sessions
env.useIndexedDB = true;
// Don't set cacheDir - let it use default browser storage

// Check for WebGPU support (10-100x faster!)
const checkWebGPUSupport = async () => {
	if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
		try {
			const adapter = await navigator.gpu.requestAdapter();
			if (adapter) {
				console.log('🚀 WebGPU detected! Transcription will be 10-100x faster');
				return true;
			}
		} catch {
			console.log('WebGPU not available, using WASM fallback');
		}
	}
	return false;
};

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

		// Log model loading start
		console.log('[WhisperService] Starting model load...');

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

			console.log(`🎯 Loading Whisper model: ${modelKey} (${modelConfig.name})`);

			// Skip ONNX configuration - let Transformers.js handle it
			// The ONNX runtime will be configured automatically by the library

			// Temporarily suppress console.warn during model loading
			const originalWarn = console.warn;
			console.warn = () => {}; // Suppress warnings

			// Track download start time for logging
			const downloadStartTime = Date.now();

			try {
				// Transformers.js is already loaded at module level

				// Check for WebGPU support (but avoid on iOS due to memory issues)
				const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
				const hasWebGPU = !isIOS && (await checkWebGPUSupport());

				// Configure pipeline options based on device capabilities
				const pipelineOptions = {
					// Use WebGPU if available (10-100x faster!)
					device: hasWebGPU ? 'webgpu' : 'wasm',

					// Optimal dtype settings for WebGPU (based on research)
					dtype: hasWebGPU
						? {
								encoder_model: 'fp32', // Encoder is sensitive, use fp32
								decoder_model_merged: 'q4' // Decoder can be quantized for speed
							}
						: 'q8', // WASM default

					// Configure model options to minimize warnings
					onnx: {
						logSeverityLevel: 4, // 0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Fatal
						logVerbosityLevel: 0,
						enableCpuMemArena: false,
						enableMemPattern: false,
						executionMode: 'sequential',
						graphOptimizationLevel: hasWebGPU ? 'all' : 'basic'
					},
					progress_callback: (progress) => {
						// Simple console logging instead of complex progress tracking
						if (progress.status === 'downloading') {
							const percent = Math.round((progress.loaded / progress.total) * 100);
							console.log(`[WhisperService] Downloading model: ${percent}%`);
							this.updateStatus({ progress: percent });
						} else if (progress.status === 'loading') {
							console.log('[WhisperService] Loading model into memory...');
							this.updateStatus({ progress: 90 });
						} else if (progress.status === 'ready') {
							console.log('[WhisperService] Model ready!');
							this.updateStatus({ progress: 95 });
						}
					}
				};

				// Create transcription pipeline with optimized settings
				this.transcriber = await pipeline(
					'automatic-speech-recognition',
					modelConfig.id,
					pipelineOptions
				);
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

			console.log(`✨ Whisper model loaded successfully in ${loadTimeSeconds}s`);
			return { success: true, transcriber: this.transcriber };
		} catch (error) {
			console.error('Failed to load Whisper model:', error);

			this.updateStatus({
				isLoaded: false,
				isLoading: false,
				progress: 0,
				error: error.message || 'Failed to load Whisper model'
			});

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

			// Get current model info for language detection
			const prefs = get(userPreferences);
			const modelKey = prefs.whisperModel || 'tiny';
			const modelConfig = getModelInfo(modelKey);

			// Configure transcription options for optimal speed/quality balance
			const transcriptionOptions = {
				// Use stable generation settings
				temperature: 0,
				do_sample: false,
				return_timestamps: true,

				// Speed optimizations with minimal accuracy loss
				beam_size: 1, // Greedy search is 2-3x faster than beam search
				patience: 1.0, // Standard patience for early stopping
				length_penalty: 1.0, // No length penalty for natural output

				// Language optimization (skip detection for English models)
				language: modelConfig.id.includes('.en') ? 'en' : null,
				task: 'transcribe' // Faster than 'translate'
			};

			// Smart chunking based on audio duration and device memory
			const deviceMemory = navigator.deviceMemory || 4; // GB of RAM

			if (audioDuration > 30) {
				// Platform-specific chunking to prevent memory issues
				const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
				const isAndroid = /Android/i.test(navigator.userAgent);

				if (isIOS) {
					// iOS has strict memory limits - use conservative chunking
					transcriptionOptions.chunk_length_s = 10;
					transcriptionOptions.stride_length_s = 2;
					console.log('[Whisper] iOS detected: using conservative chunking');
				} else if (isAndroid) {
					// Android: adapt based on available memory
					if (deviceMemory >= 4) {
						transcriptionOptions.chunk_length_s = 20;
						transcriptionOptions.stride_length_s = 3;
					} else {
						transcriptionOptions.chunk_length_s = 10;
						transcriptionOptions.stride_length_s = 2;
					}
					console.log(`[Whisper] Android with ${deviceMemory}GB RAM: adaptive chunking`);
				} else if (deviceMemory >= 8) {
					// Desktop high-end: larger chunks for better context
					transcriptionOptions.chunk_length_s = 30;
					transcriptionOptions.stride_length_s = 5;
				} else if (deviceMemory >= 4) {
					// Desktop mid-range: balanced chunking
					transcriptionOptions.chunk_length_s = 20;
					transcriptionOptions.stride_length_s = 3;
				} else {
					// Low-end device: smaller chunks to prevent OOM
					transcriptionOptions.chunk_length_s = 10;
					transcriptionOptions.stride_length_s = 2;
				}
			}

			console.log('[Whisper] Transcribing with options:', transcriptionOptions);
			console.log('[Whisper] Audio duration:', audioDuration, 'seconds');
			console.log(
				'[Whisper] Audio data type:',
				processedAudio.constructor.name,
				'length:',
				processedAudio.length || processedAudio.size
			);

			const result = await this.transcriber(processedAudio, transcriptionOptions);

			console.log('[Whisper] Raw transcription result:', result);

			this.updateStatus({ isLoading: false, progress: 100 });

			// Extract text from result (handle both formats)
			let text = '';
			if (typeof result === 'string') {
				text = result;
			} else if (result?.text) {
				text = result.text;
			} else if (Array.isArray(result) && result[0]?.text) {
				// Handle array of chunks with timestamps
				text = result.map((chunk) => chunk.text).join(' ');
			}

			// Clean up text to remove excessive repetitions
			text = this.cleanRepetitions(text);

			console.log('[Whisper] Final text:', text);

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
	 * Clean up repetitive text patterns from transcription
	 */
	cleanRepetitions(text) {
		if (!text) return '';

		// Split into sentences or phrases
		const phrases = text.split(/[.!?]/);
		const cleanedPhrases = [];

		for (const phrase of phrases) {
			const trimmed = phrase.trim();
			if (!trimmed) continue;

			// Check if this phrase is repeating consecutively
			const words = trimmed.split(' ');
			const cleanedWords = [];
			let lastPhrase = '';
			let repeatCount = 0;

			// Detect and remove phrase-level repetitions
			for (let i = 0; i < words.length; i++) {
				// Look for patterns of 3-10 words that repeat
				for (let len = 3; len <= Math.min(10, words.length - i); len++) {
					const currentPhrase = words.slice(i, i + len).join(' ');
					let matches = 0;

					// Check how many times this phrase repeats consecutively
					for (let j = i + len; j <= words.length - len; j += len) {
						const nextPhrase = words.slice(j, j + len).join(' ');
						if (currentPhrase === nextPhrase) {
							matches++;
						} else {
							break;
						}
					}

					// If phrase repeats more than twice, skip the repetitions
					if (matches >= 2) {
						cleanedWords.push(...words.slice(i, i + len));
						i += len * (matches + 1) - 1; // Skip all repetitions
						break;
					}
				}

				// If no repetition pattern found, add the word
				if (i < words.length && !cleanedWords.includes(words[i])) {
					cleanedWords.push(words[i]);
				}
			}

			const cleanedPhrase = cleanedWords.join(' ');

			// Don't add if it's exactly the same as the last phrase
			if (cleanedPhrase && cleanedPhrase !== cleanedPhrases[cleanedPhrases.length - 1]) {
				cleanedPhrases.push(cleanedPhrase);
			}
		}

		// Join with periods and clean up
		let cleaned = cleanedPhrases.join('. ');
		if (cleaned && !cleaned.endsWith('.')) {
			cleaned += '.';
		}

		// Log if we removed repetitions
		if (text.length > cleaned.length * 1.5) {
			console.log(
				'[Whisper] Removed repetitions. Original length:',
				text.length,
				'Cleaned length:',
				cleaned.length
			);
		}

		return cleaned;
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
