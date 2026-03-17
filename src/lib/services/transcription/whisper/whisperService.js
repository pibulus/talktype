/**
 * Minimal WhisperService – WASM-only baseline for TalkType
 * Keeps a single transformers.js pipeline alive for reliable offline dictation.
 */

import { get, writable } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { pipeline, env } from '@xenova/transformers';
import { convertToWAV as convertToRawAudio } from './audioConverter';
import { getModelInfo } from './modelRegistry';
import { browser } from '$app/environment';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('WhisperService');

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
	supportsWhisper: browser
});

function summarizeSignal(float32) {
	if (!(float32 instanceof Float32Array) || float32.length === 0) {
		return null;
	}

	let peak = 0;
	let sumAbs = 0;
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
		this.isSupported = browser;
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
				log.log('[WhisperService] Unloading previous model before loading new one');
				await this.unloadModel();
			}

			this.updateStatus({ selectedModel: modelKey, progress: 5 });
			log.log(`[WhisperService] Loading ${modelConfig.name} (WASM only)…`);

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
			const totalSecs = (((endTime - loadStart) || 0) / 1000).toFixed(2);
			log.log(`[WhisperService] Model ready in ${totalSecs}s (WASM, warmed).`);

			this.updateStatus({ isLoaded: true, isLoading: false, progress: 100 });
			this.modelLoadPromise = null;
			return { success: true, transcriber: this.transcriber };
		} catch (error) {
			log.error('[WhisperService] Failed to load model:', error);
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
			log.warn('[WhisperService] Warmup run failed (continuing):', error?.message || error);
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
			return;
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
				log.error('[WhisperService] Failed to convert audio for Whisper:', conversionError);
				throw new Error('Could not prepare audio for transcription');
			}
		}

		const stats = summarizeSignal(floatAudio);
		log.log('[WhisperService] Transcribing clip:', stats);
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
			log.warn('[WhisperService] dispose failed (continuing):', error);
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
			log.warn('[WhisperService] Persistent storage request failed:', error?.message || error);
		}
	}
}

export const whisperService = new WhisperService();
