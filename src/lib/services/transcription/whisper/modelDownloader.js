/**
 * Model Downloader & Cache Utilities
 * Handles manifest inspection, targeted prefetching, and cache diagnostics for Whisper models.
 */

const HF_API_BASE = 'https://huggingface.co/api/models/';
const HF_RESOLVE_BASE = 'https://huggingface.co';
export const MODEL_CACHE_NAME = 'transformers-cache';

const METADATA_PATTERNS = [
	/tokenizer/i,
	/tokenizer_config/i,
	/preprocessor_config/i,
	/generation_config/i,
	/special_tokens_map/i,
	/vocab\.json$/i,
	/merges\.txt$/i,
	/config\.json$/i
];

const WEIGHT_PATTERNS = [/\.onnx$/i];
const DEFAULT_MANIFEST_HINTS = [
	'config.json',
	'preprocessor_config.json',
	'generation_config.json',
	'tokenizer.json',
	'tokenizer_config.json',
	'special_tokens_map.json',
	'vocab.json',
	'merges.txt',
	'model.onnx',
	'model_quantized.onnx'
];

const manifestCache = new Map();
const inflightPrefetches = new Map();

export function formatBytes(bytes, decimals = 1) {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const value = bytes / Math.pow(k, i);
	return `${value.toFixed(decimals)} ${sizes[i]}`;
}

function buildResolveUrl(repoId, file) {
	const sanitized = file.replace(/^\//, '');
	return `${HF_RESOLVE_BASE}/${repoId}/resolve/main/${sanitized}`;
}

function pickFilesForTargets(files, targets, maxFiles) {
	const selected = [];
	const seen = new Set();

	const filters = targets.map((target) => {
		if (target === 'weights') {
			return (file) => WEIGHT_PATTERNS.some((regex) => regex.test(file));
		}
		// Default to metadata patterns
		return (file) => METADATA_PATTERNS.some((regex) => regex.test(file));
	});

	for (const file of files) {
		const normalized = file.toLowerCase();
		const matched = filters.some((fn) => fn(normalized));
		if (!matched) continue;
		if (seen.has(normalized)) continue;
		seen.add(normalized);
		selected.push(file);
		if (selected.length >= maxFiles) break;
	}

	return selected;
}

async function fetchJSON(url, { signal } = {}) {
	const response = await fetch(url, { signal });
	if (!response.ok) {
		throw new Error(`Manifest request failed (${response.status})`);
	}
	return response.json();
}

export async function getModelManifest(repoId, options = {}) {
	if (!repoId) {
		return [];
	}

	if (manifestCache.has(repoId)) {
		return manifestCache.get(repoId);
	}

	if (typeof fetch === 'undefined') {
		return DEFAULT_MANIFEST_HINTS;
	}

	try {
		const data = await fetchJSON(`${HF_API_BASE}${repoId}`, options);
		const files = Array.isArray(data?.siblings)
			? data.siblings.map((file) => file.rfilename).filter(Boolean)
			: DEFAULT_MANIFEST_HINTS;
		manifestCache.set(repoId, files);
		return files;
	} catch (error) {
		console.warn('[ModelDownloader] Failed to fetch manifest, using fallback list', error);
		return DEFAULT_MANIFEST_HINTS;
	}
}

async function openTransformersCache() {
	if (typeof caches === 'undefined') return null;
	try {
		return await caches.open(MODEL_CACHE_NAME);
	} catch (error) {
		console.warn('[ModelDownloader] Unable to open CacheStorage:', error.message);
		return null;
	}
}

async function fetchAndCache(request, cache, { timeoutMs = 45000 } = {}) {
	const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
	const timeoutId =
		controller && timeoutMs
			? setTimeout(() => controller.abort('prefetch-timeout'), timeoutMs)
			: null;

	try {
		const response = await fetch(request, {
			signal: controller?.signal,
			cache: 'reload'
		});

		if (!response.ok) {
			throw new Error(`Failed (${response.status})`);
		}

		if (cache) {
			try {
				await cache.put(request, response.clone());
			} catch (error) {
				console.warn('[ModelDownloader] Cache put failed:', error.message);
			}
		}

		return {
			status: 'downloaded',
			bytes: Number(response.headers.get('content-length')) || null
		};
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
	}
}

export async function inspectModelCache(repoId) {
	if (typeof window === 'undefined') {
		return { supported: false, reason: 'ssr' };
	}

	const cache = await openTransformersCache();
	if (!cache) {
		return { supported: false, reason: 'cache-unavailable' };
	}

	const requests = await cache.keys();
	const repoRequests = requests.filter((request) => request.url.includes(`/${repoId}/`));

	const breakdown = repoRequests.reduce(
		(acc, request) => {
			const filename = request.url.split('/').pop()?.split('?')[0] || '';
			if (WEIGHT_PATTERNS.some((regex) => regex.test(filename))) {
				acc.weights += 1;
			} else {
				acc.metadata += 1;
			}
			return acc;
		},
		{ metadata: 0, weights: 0 }
	);

	return {
		supported: true,
		repoId,
		totalEntries: repoRequests.length,
		...breakdown,
		cacheName: MODEL_CACHE_NAME,
		inspectedAt: new Date().toISOString()
	};
}

export function shouldPrefetchWeightsForDevice(snapshot) {
	if (typeof navigator === 'undefined') {
		return false;
	}

	if (snapshot?.weights > 0) {
		return false; // already cached
	}

	const memory = navigator.deviceMemory || 4;
	const cores = navigator.hardwareConcurrency || 4;
	const ua = navigator.userAgent || '';
	const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
	const connection = navigator.connection;
	const hasFastConnection =
		connection && !connection.saveData ? (connection.downlink || 0) >= 5 : true;

	return !isMobile && memory >= 8 && cores >= 8 && hasFastConnection;
}

export async function prefetchModelAssets(
	repoId,
	{
		targets = ['metadata'],
		maxFiles,
		timeoutMs = 45000,
		priority = 'normal'
	} = {}
) {
	if (typeof window === 'undefined' || typeof fetch === 'undefined') {
		return { supported: false, reason: 'ssr' };
	}

	const key = `${repoId}:${targets.sort().join(',')}:${priority}`;
	if (inflightPrefetches.has(key)) {
		return inflightPrefetches.get(key);
	}

	const prefetchPromise = (async () => {
		const manifest = await getModelManifest(repoId);
		if (!manifest.length) {
			return { repoId, requested: 0, downloaded: 0, cached: 0 };
		}

		const limit =
			maxFiles ??
			(targets.includes('weights')
				? Math.min(4, manifest.length)
				: Math.min(10, manifest.length));
		const files = pickFilesForTargets(manifest, targets, limit);
		if (!files.length) {
			return { repoId, requested: 0, downloaded: 0, cached: 0 };
		}

		const cache = await openTransformersCache();
		const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

		let downloaded = 0;
		let cached = 0;
		let bytes = 0;
		const failures = [];

		for (const file of files) {
			const url = buildResolveUrl(repoId, file);
			const request = new Request(url, { mode: 'cors' });

			if (cache) {
				const existing = await cache.match(request);
				if (existing) {
					cached += 1;
					continue;
				}
			}

			try {
				const result = await fetchAndCache(request, cache, { timeoutMs });
				downloaded += 1;
				if (result.bytes) {
					bytes += result.bytes;
				}
			} catch (error) {
				failures.push({ file, error: error.message });
			}
		}

		return {
			repoId,
			targets,
			requested: files.length,
			cached,
			downloaded,
			bytes,
			failures,
			durationMs: Math.round(
				(typeof performance !== 'undefined' ? performance.now() : Date.now()) - start
			)
		};
	})().finally(() => {
		inflightPrefetches.delete(key);
	});

	inflightPrefetches.set(key, prefetchPromise);
	return prefetchPromise;
}
