/**
 * Minimal WhisperService – WASM-only baseline for TalkType
 * Keeps a single transformers.js pipeline alive for reliable offline dictation.
 */

import { get, writable } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { pipeline, env } from '@xenova/transformers';
import { convertToWAV as convertToRawAudio } from './audioConverter';
import { getModelInfo } from './modelRegistry';

// Configure transformers.js for maximum stability (WASM only)
env.allowRemoteModels = true;
env.useBrowserCache = true;
env.useIndexedDB = true;
if (env.backends?.onnx?.wasm) {
	const hwThreads = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
	env.backends.onnx.wasm.numThreads = Math.min(4, hwThreads);
	env.backends.onnx.wasm.simd = true;
}

env.backends = env.backends || {};
if (env.backends.onnx?.webgpu) {
	// Explicitly disable experimental WebGPU path for now
	env.backends.onnx.webgpu = undefined;
}

const SAMPLE_RATE = 16000;
const WARMUP_SECONDS = 0.25; // short silent clip to JIT the WASM kernels
const MODEL_LOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout for model download+load

// Public status store (UI reads this for spinner/error state)
export const whisperStatus = writable({
	isLoaded: false,
	isLoading: false,
	progress: 0,
	error: null,
	selectedModel: 'tiny',
	supportsWhisper: typeof window !== 'undefined'
});

function summarizeSignal(float32) {
	if (!(float32 instanceof Float32Array) || float32.length === 0) {
		return null;
	}

	let peak = 0;
	let sumAbs = 0;
	// Use iterative loop instead of spreading into Math.max to prevent RangeError (stack overflow)
	for (let i = 0; i < float32.length; i++) {
		const sampleAbs = Math.abs(float32[i]);
		if (sampleAbs > peak) peak = sampleAbs;
		sumAbs += sampleAbs;
	}

	return {
		samples: float32.length,
		duration: float32.length / SAMPLE_RATE,
		peak: peak.toFixed(4),
		avg: (sumAbs / float32.length).toFixed(4)
	};
}

export class WhisperService {
	constructor() {
		this.transcriber = null;
		this.modelLoadPromise = null;
		this.isSupported = typeof window !== 'undefined';
		this.hasWarmedUp = false;

		this.updateStatus({ supportsWhisper: this.isSupported });
		this.#ensurePersistentStorage();
	}

	updateStatus(updates) {
		whisperStatus.update((current) => ({ ...current, ...updates }));
	}

	async preloadModel() {
		// Check if currently loaded model matches the requested one
		const prefs = get(userPreferences);
		const requestedModel = prefs.whisperModel || 'tiny';
		const currentModel = get(whisperStatus).selectedModel;

		if (this.transcriber && requestedModel === currentModel) {
			return { success: true, transcriber: this.transcriber };
		}

		if (this.modelLoadPromise) {
			return this.modelLoadPromise;
		}

		if (!this.isSupported) {
			this.updateStatus({ error: 'Whisper is only available in browser environment.' });
			return { success: false, error: 'Unsupported environment' };
		}

		this.updateStatus({ isLoading: true, progress: 0, error: null });
		this.modelLoadPromise = this._loadModel();
		return this.modelLoadPromise;
	}

	async _loadModel() {
		try {
			const prefs = get(userPreferences);
			const modelKey = prefs.whisperModel || 'tiny';
			const modelConfig = getModelInfo(modelKey);

			if (!modelConfig) {
				throw new Error(`Unknown model: ${modelKey}`);
			}

			// Unload any previously loaded model to free memory before loading the new one
			if (this.transcriber) {
				console.log('[WhisperService] Unloading previous model before loading new one');
				await this.unloadModel();
			}

			this.updateStatus({ selectedModel: modelKey, progress: 5 });
			console.log(`[WhisperService] Loading ${modelConfig.name} (WASM only)…`);

			const loadStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

			// Race model loading against a timeout to prevent infinite hangs
			const loadPromise = pipeline('automatic-speech-recognition', modelConfig.id, {
				device: 'wasm',
				dtype: 'q8',
				progress_callback: (progress) => {
					if (progress.status === 'downloading') {
						const total = progress.total || 1; // Guard against division by zero
						const percent = Math.round((progress.loaded / total) * 100);
						this.updateStatus({ progress: Math.min(percent, 94) });
					} else if (progress.status === 'ready') {
						this.updateStatus({ progress: 95 });
					}
				}
			});

			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(
					() => reject(new Error('Model download timed out. Check your connection and try again.')),
					MODEL_LOAD_TIMEOUT_MS
				);
			});

			this.transcriber = await Promise.race([loadPromise, timeoutPromise]);

			await this.#warmupTranscriber();

			const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
			const totalSecs = ((endTime - loadStart || 0) / 1000).toFixed(2);
			console.log(`[WhisperService] Model ready in ${totalSecs}s (WASM, warmed).`);

			this.updateStatus({ isLoaded: true, isLoading: false, progress: 100 });
			this.modelLoadPromise = null;
			return { success: true, transcriber: this.transcriber };
		} catch (error) {
			console.error('[WhisperService] Failed to load model:', error);
			this.updateStatus({ isLoaded: false, isLoading: false, progress: 0, error: error.message });
			this.transcriber = null;
			this.modelLoadPromise = null;
			return { success: false, error };
		}
	}

	async #warmupTranscriber() {
		if (!this.transcriber || this.hasWarmedUp) {
			return;
		}

		try {
			const warmupSamples = Math.max(1, Math.floor(SAMPLE_RATE * WARMUP_SECONDS));
			const silence = new Float32Array(warmupSamples); // zeroed buffer
			await this.transcriber(silence, {
				task: 'transcribe',
				return_timestamps: false,
				temperature: 0,
				do_sample: false
			});
			this.hasWarmedUp = true;
		} catch (error) {
			// Warmup is best-effort; don't surface to UI
			console.warn('[WhisperService] Warmup run failed (continuing):', error?.message || error);
		}
	}

	validateAudioData(audioData) {
		if (!audioData) throw new Error('Audio data is missing');

		if (audioData instanceof Float32Array) {
			if (audioData.length < SAMPLE_RATE * 0.2) {
				throw new Error('Audio too short to transcribe');
			}
			const hasSignal = audioData.some((sample) => Math.abs(sample) > 0.001);
			if (!hasSignal) {
				throw new Error('No speech detected in audio');
			}
			return;
		}

		if (audioData instanceof Blob) {
			if (!audioData.size) {
				throw new Error('Audio blob is empty');
			}
<<<<<<< HEAD
			return;
=======

			// Validate input blob
			this.validateAudioData(audioBlob, 'input blob');

			// Convert audio to Float32Array if needed for Whisper compatibility
			let processedAudio = audioBlob;
			if (needsConversion(audioBlob.type)) {
				this.updateStatus({ isLoading: true, progress: 10 });

				try {
					processedAudio = await convertToRawAudio(audioBlob);
					// Validate converted audio
					this.validateAudioData(processedAudio, 'converted audio');
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

			// Debug logging for ONNX execution
			console.log('[Whisper] 🎯 Starting ONNX transcription with configuration:');
			console.log('[Whisper]   Options:', transcriptionOptions);
			console.log('[Whisper]   Audio duration:', audioDuration.toFixed(2), 'seconds');
			console.log('[Whisper]   Audio type:', processedAudio.constructor.name);

			if (processedAudio instanceof Float32Array) {
				console.log('[Whisper]   Tensor shape: [1,', processedAudio.length, '] (mono, 16kHz)');
				console.log('[Whisper]   Sample rate: 16000 Hz');
				console.log('[Whisper]   Samples:', processedAudio.length);

				// Check signal characteristics
			let maxAmplitude = 0;
			let sumAmplitude = 0;
			for (let i = 0; i < processedAudio.length; i++) {
				const sampleAbs = Math.abs(processedAudio[i]);
				if (sampleAbs > maxAmplitude) {
					maxAmplitude = sampleAbs;
				}
				sumAmplitude += sampleAbs;
			}
			// Avoid spreading large arrays into Math.max to prevent stack overflows
			const avgAmplitude =
				processedAudio.length > 0 ? sumAmplitude / processedAudio.length : 0;

				console.log('[Whisper]   Signal peak:', maxAmplitude.toFixed(4));
				console.log('[Whisper]   Signal avg:', avgAmplitude.toFixed(4));
			} else {
				console.log('[Whisper]   Blob size:', processedAudio.size, 'bytes');
			}

			// Log ONNX configuration being used
			const currentStatus = get(whisperStatus);
			console.log('[Whisper]   Model:', currentStatus.selectedModel);
			console.log('[Whisper]   ONNX device:', this.hasWebGPU ? 'webgpu' : 'wasm');

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

			// Detect ONNX Runtime errors (error code 6 = INVALID_ARGUMENT)
			const isONNXError =
				error.message?.includes('OrtRun') ||
				error.message?.includes('error code = 6') ||
				error.message?.includes('ONNX');

			// If ONNX error and we haven't retried yet, clear cache and retry
			if (isONNXError && retryCount < MAX_RETRIES) {
				console.warn(
					`[WhisperService] ONNX error detected (attempt ${retryCount + 1}/${MAX_RETRIES + 1}). Clearing cache and retrying...`
				);

				try {
					// Clear the corrupted model cache
					await this.clearModelCache();

					// Wait a bit for IndexedDB to settle
					await new Promise((resolve) => setTimeout(resolve, 500));

					// Retry transcription with fresh model
					console.log('[WhisperService] Retrying transcription with fresh model...');
					return await this.transcribeAudio(audioBlob, retryCount + 1);
				} catch (clearError) {
					console.error('[WhisperService] Failed to clear cache and retry:', clearError);
					// Continue to throw original error
				}
			}

			// Update status with error
			const errorMessage = isONNXError
				? 'Model error detected. Try clearing your browser cache (Settings > Privacy > Clear browsing data) and reload.'
				: error.message || 'Failed to transcribe audio with Whisper';

			this.updateStatus({
				isLoading: false,
				error: errorMessage
			});

			throw new Error(`Failed to transcribe audio with Whisper: ${error.message}`);
>>>>>>> feat/best-of-ghost-whisper
		}

		throw new Error('Unsupported audio data type');
	}

	async transcribeAudio(audioBlob) {
		const { success, error } = await this.preloadModel();
		if (!success) {
			throw error || new Error('Failed to load Whisper model');
		}

		this.validateAudioData(audioBlob);

		let floatAudio = audioBlob;
		if (!(audioBlob instanceof Float32Array)) {
			try {
				floatAudio = await convertToRawAudio(audioBlob);
			} catch (conversionError) {
				console.error('[WhisperService] Failed to convert audio for Whisper:', conversionError);
				throw new Error('Could not prepare audio for transcription');
			}
		}

		const stats = summarizeSignal(floatAudio);
		console.log('[WhisperService] Transcribing clip:', stats);
		this.updateStatus({ isLoading: true, progress: 30 });

		const options = {
			task: 'transcribe',
			return_timestamps: false,
			temperature: 0,
			do_sample: false
		};

		const result = await this.transcriber(floatAudio, options);
		const text = (typeof result === 'string' ? result : result?.text || '').trim();

		this.updateStatus({ isLoading: false, progress: 100, error: null });

		if (!text) {
			throw new Error('Whisper returned empty text. Try again.');
		}

		return this.cleanRepetitions(text);
	}

	cleanRepetitions(text) {
		if (!text) return '';
		return text.replace(/(\b.+?\b)(\s+\1)+/gi, '$1').trim();
	}

	async unloadModel() {
		if (!this.transcriber) return;

		try {
			await this.transcriber.dispose?.();
		} catch (error) {
			console.warn('[WhisperService] dispose failed (continuing):', error);
		}

		this.transcriber = null;
		this.modelLoadPromise = null;
		this.hasWarmedUp = false;
		this.updateStatus({ isLoaded: false, progress: 0 });
	}

	// Stubs retained for API compatibility elsewhere in the app
	async resetTranscriberSession() {
		await this.unloadModel();
		return this.preloadModel();
	}

	async clearModelCache() {
		await this.unloadModel();
		if (typeof indexedDB === 'undefined') return;

		await new Promise((resolve, reject) => {
			const request = indexedDB.deleteDatabase('transformers-cache');
			request.onsuccess = resolve;
			request.onerror = () => reject(request.error);
			request.onblocked = () => reject(new Error('Cache clear blocked by another tab'));
		});
	}

	async #ensurePersistentStorage() {
		if (typeof navigator === 'undefined' || !navigator.storage) {
			return;
		}

		try {
			const { storage } = navigator;
			if (typeof storage.persist !== 'function' || typeof storage.persisted !== 'function') {
				return;
			}

			const alreadyPersisted = await storage.persisted();
			if (!alreadyPersisted) {
				await storage.persist();
			}
		} catch (error) {
			console.warn('[WhisperService] Persistent storage request failed:', error?.message || error);
		}
	}
}

export const whisperService = new WhisperService();
