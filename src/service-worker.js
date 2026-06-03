/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;
const LEGACY_MODELS_CACHE = 'whisper-models-v1';
const RUNTIME_CACHE = 'runtime-v1';

const LARGE_RUNTIME_ASSET_PATTERNS = [/\/ort-.*\.wasm$/];
const LARGE_RUNTIME_ASSETS = build.filter((asset) => isLargeRuntimeAsset(asset));
const SENSITIVE_QUERY_KEYS = ['code', 'token', 'checkout_id', 'vault', 'vaultUrl'];

function isLargeRuntimeAsset(pathname) {
	return LARGE_RUNTIME_ASSET_PATTERNS.some((pattern) => pattern.test(pathname));
}

function shouldBypassRuntimeCache(url) {
	if (url.origin !== self.location.origin) return false;
	if (url.pathname.startsWith('/api/') || url.pathname === '/passport') return true;
	return SENSITIVE_QUERY_KEYS.some((key) => url.searchParams.has(key));
}

// Assets to always cache
const ASSETS = [
	...build, // the app itself
	...files // everything in `static`
].filter((asset) => !isLargeRuntimeAsset(asset));

// Install service worker
self.addEventListener('install', (event) => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
	self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
	// Remove previous cached data from disk
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			// Keep the legacy model cache temporarily so old downloads can be migrated.
			if (key !== CACHE && key !== LEGACY_MODELS_CACHE && key !== RUNTIME_CACHE) {
				await caches.delete(key);
			}
		}
	}

	async function pruneRuntimeCache() {
		const runtimeCache = await caches.open(RUNTIME_CACHE);
		const currentRuntimeAssets = new Set(LARGE_RUNTIME_ASSETS);

		for (const request of await runtimeCache.keys()) {
			const url = new URL(request.url);
			if (url.origin === self.location.origin && !currentRuntimeAssets.has(url.pathname)) {
				await runtimeCache.delete(request);
			}
		}
	}

	event.waitUntil(
		Promise.all([deleteOldCaches(), pruneRuntimeCache()]).then(() => self.clients.claim())
	);
});

// Fetch event
self.addEventListener('fetch', (event) => {
	// ignore POST requests etc
	if (event.request.method !== 'GET') return;

	const requestUrl = new URL(event.request.url);
	if (requestUrl.origin !== self.location.origin) return;

	async function respond() {
		const url = requestUrl;
		const cache = await caches.open(CACHE);

		if (shouldBypassRuntimeCache(url)) {
			return fetch(event.request);
		}

		if (url.origin === self.location.origin && isLargeRuntimeAsset(url.pathname)) {
			const runtimeCache = await caches.open(RUNTIME_CACHE);
			const cachedResponse = await runtimeCache.match(event.request);

			if (cachedResponse) {
				return cachedResponse;
			}

			const response = await fetch(event.request);
			if (response.ok) {
				runtimeCache.put(event.request, response.clone());
			}
			return response;
		}

		// `build`/`files` can always be served from the cache
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);

			if (response) {
				return response;
			}
		}

		// Transformers.js owns its own `transformers-cache`. Avoid duplicating large
		// model files here; only serve one old cache hit so the library can migrate it.
		if (url.href.includes('huggingface.co') || url.href.includes('.onnx')) {
			const legacyModelCache = await caches.open(LEGACY_MODELS_CACHE);
			const cachedResponse = await legacyModelCache.match(event.request);

			if (cachedResponse) {
				legacyModelCache.delete(event.request).catch(() => {});
				return cachedResponse;
			}

			return fetch(event.request);
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

			// For navigation requests, serve the offline fallback page
			if (event.request.mode === 'navigate') {
				const offlinePage = await cache.match('/offline.html');
				if (offlinePage) {
					return offlinePage;
				}
			}

			// if there's no cache, then just error out
			// as there is nothing we can do to respond to this request
			throw err;
		}
	}

	event.respondWith(respond());
});
