/**
 * Minimal WhisperService – WASM-only baseline for TalkType
 * Keeps a single transformers.js pipeline alive for reliable offline dictation.
 */

import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { convertToWAV as convertToRawAudio } from './audioConverter';
import { getModelInfo } from './modelRegistry';
import {
	WHISPER_CACHE_NAMES,
	WHISPER_PHASES,
	clampPercent,
	getLoadStatusText,
	getProgressPercentFromEvent,
	isLargeModelFile
} from './statusUtils.js';

const SAMPLE_RATE = 16000;
const WARMUP_SECONDS = 0.25; // short silent clip to JIT the WASM kernels
const MODEL_LOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout for model download+load
const DEFAULT_MODEL_KEY = 'tiny';

let transformersModulePromise = null;
let transformersEnvConfigured = false;

// Self-host the EXACT ort .wasm/.mjs files that v4 bundles (copied from
// node_modules/@huggingface/transformers/node_modules/onnxruntime-web/dist into
// static/onnx, served at /onnx/). v4 bundles a dev build of onnxruntime-web
// (1.26.0-dev.*) that isn't on any CDN, and its default loader fetches the WASM
// glue via a dynamic blob import Vite can't serve ("no available backend found /
// Failed to fetch ... blob:"). A real same-origin base URL bypasses that and
// guarantees the version matches the bundled runtime. Also keeps Offline Mode
// truly offline-capable (no CDN dependency).
const ORT_WASM_BASE = '/onnx/';

export function configureTransformersEnv(env) {
	if (!env || transformersEnvConfigured) return;

	env.allowRemoteModels = true;
	env.allowLocalModels = false;
	env.useBrowserCache = true;
	env.backends = env.backends || {};
	const wasmBackend = env.backends.onnx?.wasm;
	if (wasmBackend) {
		wasmBackend.wasmPaths = ORT_WASM_BASE; // real URL base, not the broken blob import
		wasmBackend.numThreads = 1; // single-threaded WASM for cross-browser stability (esp. iOS)
	}

	transformersEnvConfigured = true;
}

async function loadTransformersPipeline() {
	if (!browser) {
		throw new Error('Whisper is only available in browser environment.');
	}

	if (!transformersModulePromise) {
		transformersModulePromise = import('@huggingface/transformers')
			.then((module) => {
				configureTransformersEnv(module.env);
				return module;
			})
			.catch((error) => {
				transformersModulePromise = null;
				throw error;
			});
	}

	const { pipeline } = await transformersModulePromise;
	return pipeline;
}

// Public status store (UI reads this for spinner/error state)
export const whisperStatus = writable({
	isLoaded: false,
	isLoading: false,
	isTranscribing: false,
	isCached: false,
	cacheChecked: false,
	progress: 0,
	error: null,
	phase: WHISPER_PHASES.IDLE,
	statusText: getLoadStatusText({ phase: WHISPER_PHASES.IDLE }),
	selectedModel: DEFAULT_MODEL_KEY,
	selectedModelName: 'Tiny English (117MB)',
	selectedModelSize: null,
	storagePersisted: null,
	storageEstimate: null,
	lastLoadedAt: null,
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
		this.modelFileProgress = new Map();
		this.modelHasSeenLargeFile = false;
		this.modelProgressInterval = null;

		this.updateStatus({ supportsWhisper: this.isSupported });
		this.#refreshDeviceStorageState();
		this.refreshCachedModelStatus();
	}

	updateStatus(updates) {
		whisperStatus.update((current) => ({ ...current, ...updates }));
	}

	async preloadModel() {
		// Check if currently loaded model matches the requested one
		const prefs = get(userPreferences);
		const requestedModel = prefs.whisperModel || DEFAULT_MODEL_KEY;
		const currentModel = get(whisperStatus).selectedModel;

		if (this.transcriber && requestedModel === currentModel) {
			this.updateStatus({
				isLoaded: true,
				isLoading: false,
				isTranscribing: false,
				isCached: true,
				progress: 100,
				error: null,
				phase: WHISPER_PHASES.READY,
				statusText: getLoadStatusText({ phase: WHISPER_PHASES.READY })
			});
			return { success: true, transcriber: this.transcriber };
		}

		if (this.modelLoadPromise) {
			return this.modelLoadPromise;
		}

		if (!this.isSupported) {
			this.updateStatus({
				error: 'Whisper is only available in browser environment.',
				phase: WHISPER_PHASES.ERROR,
				statusText: getLoadStatusText({ phase: WHISPER_PHASES.ERROR })
			});
			return { success: false, error: 'Unsupported environment' };
		}

		await this.refreshCachedModelStatus();

		this.updateStatus({
			isLoading: true,
			isTranscribing: false,
			progress: 2,
			error: null,
			phase: WHISPER_PHASES.LOADING_LIBRARY,
			statusText: getLoadStatusText({ phase: WHISPER_PHASES.LOADING_LIBRARY })
		});
		this.modelLoadPromise = this._loadModel();
		return this.modelLoadPromise;
	}

	async _loadModel() {
		try {
			const prefs = get(userPreferences);
			const modelKey = prefs.whisperModel || DEFAULT_MODEL_KEY;
			const modelConfig = getModelInfo(modelKey);

			if (!modelConfig) {
				throw new Error(`Unknown model: ${modelKey}`);
			}

			// Unload any previously loaded model to free memory before loading the new one
			if (this.transcriber) {
				console.log('[WhisperService] Unloading previous model before loading new one');
				await this.unloadModel();
			}

			this.modelFileProgress = new Map();
			this.modelHasSeenLargeFile = false;
			this.updateStatus({
				selectedModel: modelKey,
				selectedModelName: modelConfig.name,
				selectedModelSize: modelConfig.size,
				isLoaded: false,
				isLoading: true,
				isTranscribing: false,
				progress: 5,
				error: null,
				phase: WHISPER_PHASES.LOADING_LIBRARY,
				statusText: getLoadStatusText({
					phase: WHISPER_PHASES.LOADING_LIBRARY,
					modelName: modelConfig.name
				})
			});
			console.log(`[WhisperService] Loading ${modelConfig.name} (WASM only)…`);
			this.#startLoadProgressTicker(modelConfig);

			const loadStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
			const pipeline = await loadTransformersPipeline();

			// device/dtype come from the model config (set by device detection):
			// tiny → wasm/fp32 (universal), small → webgpu/fp16 (capable desktops).
			let device = modelConfig.device || 'wasm';
			let dtype = modelConfig.dtype || 'fp32';

			let transcriber;
			try {
				transcriber = await this.#loadPipeline(pipeline, modelConfig, device, dtype);
			} catch (loadError) {
				// One-time WebGPU → WASM fallback: a present-but-flaky GPU adapter can
				// fail at session creation. Drop to the tiny+WASM baseline, persist it
				// for this device, and retry once so Offline Mode never hard-fails.
				if (device === 'webgpu') {
					console.warn(
						'[WhisperService] WebGPU model load failed — falling back to tiny + WASM:',
						loadError?.message || loadError
					);
					device = 'wasm';
					dtype = 'fp32';
					const fallbackConfig = getModelInfo('tiny');
					userPreferences.update((p) => ({
						...p,
						whisperModel: 'tiny',
						webgpuDisabled: true
					}));
					this.updateStatus({
						selectedModel: 'tiny',
						selectedModelName: fallbackConfig.name,
						selectedModelSize: fallbackConfig.size
					});
					transcriber = await this.#loadPipeline(pipeline, fallbackConfig, device, dtype);
				} else {
					throw loadError;
				}
			}
			this.transcriber = transcriber;

			await this.#warmupTranscriber();

			const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
			const totalSecs = ((endTime - loadStart || 0) / 1000).toFixed(2);
			console.log(`[WhisperService] Model ready in ${totalSecs}s (${device}, warmed).`);
			this.#stopLoadProgressTicker();

			this.updateStatus({
				isLoaded: true,
				isLoading: false,
				isTranscribing: false,
				isCached: true,
				cacheChecked: true,
				progress: 100,
				error: null,
				phase: WHISPER_PHASES.READY,
				statusText: getLoadStatusText({ phase: WHISPER_PHASES.READY }),
				lastLoadedAt: Date.now()
			});
			this.modelLoadPromise = null;
			this.#refreshDeviceStorageState();
			return { success: true, transcriber: this.transcriber };
		} catch (error) {
			console.error('[WhisperService] Failed to load model:', error);
			this.#stopLoadProgressTicker();
			this.updateStatus({
				isLoaded: false,
				isLoading: false,
				isTranscribing: false,
				progress: 0,
				error: error.message,
				phase: WHISPER_PHASES.ERROR,
				statusText: getLoadStatusText({ phase: WHISPER_PHASES.ERROR })
			});
			this.transcriber = null;
			this.modelLoadPromise = null;
			return { success: false, error };
		}
	}

	// Load a pipeline for a given device/dtype, raced against a timeout to prevent
	// infinite hangs. Returns the transcriber or throws.
	async #loadPipeline(pipeline, modelConfig, device, dtype) {
		const loadPromise = pipeline('automatic-speech-recognition', modelConfig.id, {
			device,
			dtype,
			progress_callback: (progress) => this.#handleLoadProgress(progress, modelConfig)
		});

		let loadTimeoutId;
		const timeoutPromise = new Promise((_, reject) => {
			loadTimeoutId = setTimeout(
				() => reject(new Error('Model download timed out. Check your connection and try again.')),
				MODEL_LOAD_TIMEOUT_MS
			);
		});

		return Promise.race([loadPromise, timeoutPromise]).finally(() => clearTimeout(loadTimeoutId));
	}

	#startLoadProgressTicker(modelConfig) {
		this.#stopLoadProgressTicker();

		this.modelProgressInterval = setInterval(() => {
			const status = get(whisperStatus);
			if (!status.isLoading) return;

			const phase = status.phase;
			const phaseConfig =
				{
					[WHISPER_PHASES.LOADING_LIBRARY]: { ceiling: 12, step: 1 },
					[WHISPER_PHASES.DOWNLOADING]: { ceiling: 82, step: 1.2 },
					[WHISPER_PHASES.PREPARING]: { ceiling: 92, step: 0.8 },
					[WHISPER_PHASES.WARMING]: { ceiling: 97, step: 0.5 }
				}[phase] || null;

			if (!phaseConfig || status.progress >= phaseConfig.ceiling) return;

			const progress = Math.min(
				phaseConfig.ceiling,
				Number(status.progress || 0) + phaseConfig.step
			);
			this.updateStatus({
				progress,
				statusText: getLoadStatusText({
					phase,
					progress,
					modelName: modelConfig?.name
				})
			});
		}, 900);
	}

	#stopLoadProgressTicker() {
		if (!this.modelProgressInterval) return;
		clearInterval(this.modelProgressInterval);
		this.modelProgressInterval = null;
	}

	#handleLoadProgress(progressEvent, modelConfig) {
		const status = progressEvent?.status;
		const currentStatus = get(whisperStatus);
		let nextProgress = clampPercent(currentStatus.progress);
		let phase = currentStatus.phase;

		if (status === 'initiate') {
			this.#recordFileProgress(progressEvent);
			phase = WHISPER_PHASES.DOWNLOADING;
			nextProgress = Math.max(nextProgress, this.modelHasSeenLargeFile ? 12 : 8);
		} else if (status === 'download' || status === 'downloading') {
			this.#recordFileProgress(progressEvent);
			phase = WHISPER_PHASES.DOWNLOADING;
			nextProgress = Math.max(nextProgress, this.modelHasSeenLargeFile ? 16 : 10);
		} else if (status === 'progress') {
			this.#recordFileProgress(progressEvent);
			phase = WHISPER_PHASES.DOWNLOADING;
			nextProgress = Math.max(nextProgress, this.#getAggregateDownloadProgress());
		} else if (status === 'done') {
			this.#recordFileProgress(progressEvent);
			phase = WHISPER_PHASES.PREPARING;
			nextProgress = Math.max(nextProgress, this.modelHasSeenLargeFile ? 88 : 24);
		} else if (status === 'ready') {
			phase = WHISPER_PHASES.WARMING;
			nextProgress = Math.max(nextProgress, 96);
		}

		const safeProgress = Math.min(nextProgress, 98);
		this.updateStatus({
			progress: safeProgress,
			phase,
			statusText: getLoadStatusText({
				phase,
				progress: safeProgress,
				modelName: modelConfig?.name
			})
		});
	}

	#recordFileProgress(progressEvent) {
		if (!progressEvent || typeof progressEvent !== 'object') return;

		const file = progressEvent.file || progressEvent.name || 'model-file';
		const fileKey = `${progressEvent.name || 'model'}:${file}`;
		const existing = this.modelFileProgress.get(fileKey) || {};
		const loaded = Number(progressEvent.loaded);
		const total = Number(progressEvent.total);
		const percent = getProgressPercentFromEvent(progressEvent);
		const isLarge = isLargeModelFile(file);

		if (isLarge) {
			this.modelHasSeenLargeFile = true;
		}

		let nextTotal = Number.isFinite(total) && total > 0 ? total : existing.total || null;
		let nextLoaded = Number.isFinite(loaded) && loaded >= 0 ? loaded : existing.loaded || 0;

		if (!nextTotal && percent !== null) {
			nextTotal = 100;
			nextLoaded = percent;
		}

		if (progressEvent.status === 'done') {
			nextTotal = nextTotal || nextLoaded || 1;
			nextLoaded = nextTotal;
		}

		this.modelFileProgress.set(fileKey, {
			file,
			loaded: nextLoaded,
			total: nextTotal,
			done: progressEvent.status === 'done',
			isLarge
		});
	}

	#getAggregateDownloadProgress() {
		let loadedBytes = 0;
		let totalBytes = 0;

		for (const fileProgress of this.modelFileProgress.values()) {
			if (!fileProgress.total || fileProgress.total <= 0) continue;
			totalBytes += fileProgress.total;
			loadedBytes += Math.min(fileProgress.loaded || 0, fileProgress.total);
		}

		if (totalBytes <= 0) {
			return this.modelHasSeenLargeFile ? 16 : 8;
		}

		const rawPercent = clampPercent((loadedBytes / totalBytes) * 100);
		const floor = this.modelHasSeenLargeFile ? 16 : 8;
		const ceiling = this.modelHasSeenLargeFile ? 88 : 28;
		return Math.round(floor + ((ceiling - floor) * rawPercent) / 100);
	}

	async #warmupTranscriber() {
		if (!this.transcriber || this.hasWarmedUp) {
			return;
		}

		try {
			const warmupSamples = Math.max(1, Math.floor(SAMPLE_RATE * WARMUP_SECONDS));
			const silence = new Float32Array(warmupSamples); // zeroed buffer
			// NB: no `task`/`language` here — v4 rejects them for English-only (.en)
			// models. WS6 will re-add task for multilingual models.
			await this.transcriber(silence, {
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
		this.updateStatus({
			isLoading: false,
			isTranscribing: true,
			progress: 100,
			error: null,
			phase: WHISPER_PHASES.TRANSCRIBING,
			statusText: getLoadStatusText({ phase: WHISPER_PHASES.TRANSCRIBING })
		});

		// No `task`/`language`: v4 rejects them for English-only (.en) models.
		// WS6 re-adds task: 'transcribe' for multilingual models.
		const options = {
			return_timestamps: false,
			temperature: 0,
			do_sample: false
		};

		try {
			const result = await this.transcriber(floatAudio, options);
			const text = (typeof result === 'string' ? result : result?.text || '').trim();

			this.updateStatus({
				isLoading: false,
				isTranscribing: false,
				progress: 100,
				error: null,
				phase: WHISPER_PHASES.READY,
				statusText: getLoadStatusText({ phase: WHISPER_PHASES.READY })
			});

			if (!text) {
				throw new Error('Whisper returned empty text. Try again.');
			}

			return this.cleanRepetitions(text);
		} catch (error) {
			this.updateStatus({
				isLoading: false,
				isTranscribing: false,
				phase: WHISPER_PHASES.READY,
				statusText: getLoadStatusText({ phase: WHISPER_PHASES.READY })
			});
			throw error;
		}
	}

	cleanRepetitions(text) {
		if (!text) return '';
		return text.replace(/(\b.+?\b)(\s+\1)+/gi, '$1').trim();
	}

	async unloadModel() {
		this.#stopLoadProgressTicker();

		if (!this.transcriber) return;

		try {
			await this.transcriber.dispose?.();
		} catch (error) {
			console.warn('[WhisperService] dispose failed (continuing):', error);
		}

		this.transcriber = null;
		this.modelLoadPromise = null;
		this.hasWarmedUp = false;
		this.updateStatus({
			isLoaded: false,
			isLoading: false,
			isTranscribing: false,
			progress: 0,
			error: null,
			phase: WHISPER_PHASES.IDLE,
			statusText: getLoadStatusText({ phase: WHISPER_PHASES.IDLE })
		});
		this.refreshCachedModelStatus();
	}

	// Stubs retained for API compatibility elsewhere in the app
	async resetTranscriberSession() {
		await this.unloadModel();
		return this.preloadModel();
	}

	async clearModelCache() {
		await this.unloadModel();
		if (typeof caches !== 'undefined') {
			await Promise.all(
				WHISPER_CACHE_NAMES.map((cacheName) =>
					caches.delete(cacheName).catch((error) => {
						console.warn(`[WhisperService] Failed to delete ${cacheName}:`, error);
						return false;
					})
				)
			);
		}

		if (typeof indexedDB !== 'undefined') {
			await new Promise((resolve) => {
				const request = indexedDB.deleteDatabase('transformers-cache');
				request.onsuccess = resolve;
				request.onerror = resolve;
				request.onblocked = resolve;
			});
		}

		this.updateStatus({
			isCached: false,
			cacheChecked: true,
			phase: WHISPER_PHASES.IDLE,
			statusText: getLoadStatusText({ phase: WHISPER_PHASES.IDLE })
		});
	}

	async refreshCachedModelStatus() {
		if (!browser || typeof caches === 'undefined') {
			this.updateStatus({ cacheChecked: true });
			return false;
		}

		const prefs = get(userPreferences);
		const modelKey = prefs.whisperModel || DEFAULT_MODEL_KEY;
		const modelConfig = getModelInfo(modelKey);
		const modelId = modelConfig?.id;

		if (!modelId) {
			this.updateStatus({ isCached: false, cacheChecked: true });
			return false;
		}

		try {
			this.updateStatus({
				selectedModel: modelKey,
				selectedModelName: modelConfig.name,
				selectedModelSize: modelConfig.size,
				phase: get(whisperStatus).isLoading
					? get(whisperStatus).phase
					: WHISPER_PHASES.CHECKING_CACHE,
				statusText: getLoadStatusText({ phase: WHISPER_PHASES.CHECKING_CACHE })
			});

			let isCached = false;
			for (const cacheName of WHISPER_CACHE_NAMES) {
				const cache = await caches.open(cacheName);
				const requests = await cache.keys();
				isCached = requests.some((request) => {
					const url = request.url || '';
					return url.includes(modelId) && isLargeModelFile(url);
				});
				if (isCached) break;
			}

			const currentStatus = get(whisperStatus);
			this.updateStatus({
				isCached,
				cacheChecked: true,
				phase: currentStatus.isLoaded
					? WHISPER_PHASES.READY
					: currentStatus.isLoading
						? currentStatus.phase
						: WHISPER_PHASES.IDLE,
				statusText: currentStatus.isLoaded
					? getLoadStatusText({ phase: WHISPER_PHASES.READY })
					: currentStatus.isLoading
						? currentStatus.statusText
						: isCached
							? 'Offline model downloaded'
							: getLoadStatusText({ phase: WHISPER_PHASES.IDLE })
			});

			return isCached;
		} catch (error) {
			console.warn('[WhisperService] Cached model check failed:', error?.message || error);
			this.updateStatus({ cacheChecked: true });
			return false;
		}
	}

	async #refreshDeviceStorageState() {
		if (typeof navigator === 'undefined' || !navigator.storage) {
			return;
		}

		try {
			const { storage } = navigator;
			if (typeof storage.estimate === 'function') {
				this.updateStatus({ storageEstimate: await storage.estimate() });
			}

			if (typeof storage.persist !== 'function' || typeof storage.persisted !== 'function') {
				return;
			}

			const alreadyPersisted = await storage.persisted();
			const storagePersisted = alreadyPersisted || (await storage.persist());
			this.updateStatus({ storagePersisted });
		} catch (error) {
			console.warn('[WhisperService] Persistent storage request failed:', error?.message || error);
			this.updateStatus({ storagePersisted: false });
		}
	}
}

export const whisperService = new WhisperService();

// Dev-only test seam: lets Playwright drive the real model-load + transcribe path
// without the fake-mic rig. Stripped from production builds (import.meta.env.DEV).
if (browser && import.meta.env.DEV) {
	globalThis.__ttWhisper = {
		service: whisperService,
		status: whisperStatus,
		// Accepts a Float32Array (16kHz mono) or Blob, returns the transcript text.
		transcribe: (audio) => whisperService.transcribeAudio(audio)
	};
}
