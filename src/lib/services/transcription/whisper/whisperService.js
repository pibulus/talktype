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

		this.updateStatus({ supportsWhisper: this.isSupported });
	}

	updateStatus(updates) {
		whisperStatus.update((current) => ({ ...current, ...updates }));
	}

	async preloadModel() {
		if (this.transcriber) {
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

			this.updateStatus({ selectedModel: modelKey, progress: 5 });
			console.log(`[WhisperService] Loading ${modelConfig.name} (WASM only)…`);

			const loadStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

			this.transcriber = await pipeline('automatic-speech-recognition', modelConfig.id, {
				device: 'wasm',
				dtype: 'q8',
				progress_callback: (progress) => {
					if (progress.status === 'downloading') {
						const percent = Math.round((progress.loaded / progress.total) * 100);
						this.updateStatus({ progress: percent });
					} else if (progress.status === 'ready') {
						this.updateStatus({ progress: 95 });
					}
				}
			});

			const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
			const totalSecs = (((endTime - loadStart) || 0) / 1000).toFixed(2);
			console.log(`[WhisperService] Model ready in ${totalSecs}s (WASM).`);

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
}

export const whisperService = new WhisperService();
