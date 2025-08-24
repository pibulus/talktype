/**
 * WhisperService - Client-side speech transcription using @xenova/transformers
 * Adapted for TalkType's transcription needs
 */

import { get, writable } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { convertToWAV as convertToRawAudio, needsConversion } from './audioConverter';
import { getModelInfo } from './modelRegistry';

// Lazy load Transformers.js to improve initial page load
let pipeline = null;
let env = null;
let transformersLoaded = false;

async function loadTransformers() {
	if (transformersLoaded) return { pipeline, env };

	const transformers = await import('@xenova/transformers');
	pipeline = transformers.pipeline;
	env = transformers.env;

	// Configure Transformers.js environment for optimal performance
	env.allowRemoteModels = true;
	// Enable browser cache for models (this is the key setting!)
	env.useBrowserCache = true;
	// Use IndexedDB for persistent model storage across sessions
	env.useIndexedDB = true;
	// Don't set cacheDir - let it use default browser storage
	// env.cacheDir = '.transformers-cache';  // This was causing issues!

	transformersLoaded = true;
	return { pipeline, env };
}

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

			// Get selected model from preferences or default to base
			const prefs = get(userPreferences);
			const modelKey = prefs.whisperModel || 'base';
			const modelConfig = getModelInfo(modelKey);

			if (!modelConfig) {
				throw new Error(`Unknown model: ${modelKey}`);
			}

			this.updateStatus({
				selectedModel: modelKey,
				progress: 10
			});

			console.log(`🎯 Loading Whisper model: ${modelKey} (${modelConfig.name})`);

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

			// Track download start time for logging
			const downloadStartTime = Date.now();

			try {
				// Load Transformers.js if not already loaded
				await loadTransformers();

				// Create transcription pipeline with simple logging
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

			// Configure transcription options to prevent hallucinations
			const transcriptionOptions = {
				// Basic settings that work
				temperature: 0,
				do_sample: false,
				return_timestamps: true
			};

			// Add chunking for longer audio (optimize for speed)
			if (audioDuration > 30) {
				transcriptionOptions.chunk_length_s = 20; // Smaller chunks = faster processing
				transcriptionOptions.stride_length_s = 2; // Less overlap = faster but still accurate
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
