/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;
const MODELS_CACHE = 'whisper-models-v1';
const RUNTIME_CACHE = 'runtime-v1';

// Assets to always cache
const ASSETS = [
	...build, // the app itself
	...files // everything in `static`
];

// Cache durations
const CACHE_DURATIONS = {
	models: 30 * 24 * 60 * 60 * 1000, // 30 days for ML models
	cdn: 7 * 24 * 60 * 60 * 1000, // 7 days for CDN resources
	api: 60 * 1000 // 1 minute for API responses
};

// Install service worker
self.addEventListener('install', (event) => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

// Activate service worker
self.addEventListener('activate', (event) => {
	// Remove previous cached data from disk
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			// Keep models and runtime caches, only delete old version caches
			if (key !== CACHE && key !== MODELS_CACHE && key !== RUNTIME_CACHE) {
				await caches.delete(key);
			}
		}
	}

	event.waitUntil(deleteOldCaches());
});

// Fetch event
self.addEventListener('fetch', (event) => {
	// ignore POST requests etc
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// `build`/`files` can always be served from the cache
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);

			if (response) {
				return response;
			}
		}

		// Special handling for Whisper models (ONNX files)
		if (url.href.includes('huggingface.co') || url.href.includes('.onnx')) {
			const modelCache = await caches.open(MODELS_CACHE);
			const cachedResponse = await modelCache.match(event.request);

			if (cachedResponse) {
				return cachedResponse;
			}

			// Download and cache model files
			try {
				const response = await fetch(event.request);
				if (response.ok) {
					modelCache.put(event.request, response.clone());
				}
				return response;
			} catch {
				// If offline and not cached, return error
				return new Response('Model not available offline', { status: 503 });
			}
		}

		// for everything else, try the network first, but
		// fall back to the cache if we're offline
		try {
			const response = await fetch(event.request);

			// if we're offline, fetch can return a value that is not a Response
			// instead of throwing - and we can't pass this non-Response to respondWith
			if (!(response instanceof Response)) {
				throw new Error('invalid response from fetch');
			}

			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch (err) {
			const response = await cache.match(event.request);

			if (response) {
				return response;
			}

			// if there's no cache, then just error out
			// as there is nothing we can do to respond to this request
			throw err;
		}
	}

	event.respondWith(respond());
});
