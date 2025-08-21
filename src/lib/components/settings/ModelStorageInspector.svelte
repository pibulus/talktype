<script>
	import { onMount } from 'svelte';
	import { formatBytes } from '$lib/services/transcription/whisper/modelDownloader';

	let storageInfo = {
		indexedDB: null,
		cache: null,
		total: null,
		models: []
	};

	let showDebugView = false;
	let selectedModel = null;

	onMount(async () => {
		await checkStorage();
	});

	async function checkStorage() {
		try {
			// Check storage quota
			if ('storage' in navigator && 'estimate' in navigator.storage) {
				const estimate = await navigator.storage.estimate();
				storageInfo.total = {
					usage: estimate.usage || 0,
					quota: estimate.quota || 0,
					percent: ((estimate.usage / estimate.quota) * 100).toFixed(2)
				};
			}

			// Check IndexedDB for models
			await checkModelStorage();

			// Check Cache Storage
			await checkCacheStorage();
		} catch (error) {
			console.error('Storage check error:', error);
		}
	}

	async function checkModelStorage() {
		try {
			// Check transformers.js cache
			const databases = await indexedDB.databases();
			const modelDbs = databases.filter(
				(db) =>
					db.name.includes('transformers') ||
					db.name.includes('model') ||
					db.name.includes('whisper') ||
					db.name.includes('TalkType')
			);

			storageInfo.models = [];

			for (const dbInfo of modelDbs) {
				const db = await openDatabase(dbInfo.name);
				if (!db) continue;

				const stores = Array.from(db.objectStoreNames);

				for (const storeName of stores) {
					try {
						const tx = db.transaction([storeName], 'readonly');
						const store = tx.objectStore(storeName);
						const keys = await promisifyRequest(store.getAllKeys());

						for (const key of keys) {
							const data = await promisifyRequest(store.get(key));

							if (data && (data instanceof Blob || data instanceof ArrayBuffer)) {
								const size = data.size || data.byteLength;
								storageInfo.models.push({
									db: dbInfo.name,
									store: storeName,
									key: key.toString().substring(0, 50),
									fullKey: key.toString(),
									size: size,
									type: data.constructor.name,
									timestamp: data.timestamp || null
								});
							}
						}
					} catch (e) {
						console.log(`Could not read store ${storeName}:`, e);
					}
				}

				db.close();
			}

			// Sort by size
			storageInfo.models.sort((a, b) => b.size - a.size);
		} catch (error) {
			console.error('Model storage check error:', error);
		}
	}

	async function checkCacheStorage() {
		try {
			if ('caches' in window) {
				const cacheNames = await caches.keys();
				let totalSize = 0;

				for (const name of cacheNames) {
					const cache = await caches.open(name);
					const requests = await cache.keys();

					for (const request of requests) {
						const response = await cache.match(request);
						if (response) {
							const blob = await response.blob();
							totalSize += blob.size;
						}
					}
				}

				storageInfo.cache = {
					size: totalSize,
					count: cacheNames.length
				};
			}
		} catch (error) {
			console.error('Cache storage check error:', error);
		}
	}

	async function openDatabase(name) {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(name);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => resolve(null);
		});
	}

	function promisifyRequest(request) {
		return new Promise((resolve, reject) => {
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	async function clearModel(model) {
		if (!confirm(`Delete ${model.key}? This will remove the cached model.`)) return;

		try {
			const db = await openDatabase(model.db);
			const tx = db.transaction([model.store], 'readwrite');
			const store = tx.objectStore(model.store);
			await promisifyRequest(store.delete(model.fullKey));
			db.close();

			// Refresh storage info
			await checkStorage();
		} catch (error) {
			console.error('Failed to delete model:', error);
		}
	}

	async function clearAllModels() {
		if (!confirm('Delete ALL cached models? You will need to re-download them.')) return;

		try {
			// Delete all transformers-related databases
			const databases = await indexedDB.databases();
			for (const db of databases) {
				if (db.name.includes('transformers') || db.name.includes('model')) {
					await deleteDatabase(db.name);
				}
			}

			// Clear cache storage
			if ('caches' in window) {
				const names = await caches.keys();
				for (const name of names) {
					await caches.delete(name);
				}
			}

			// Refresh
			await checkStorage();
		} catch (error) {
			console.error('Failed to clear storage:', error);
		}
	}

	function deleteDatabase(name) {
		return new Promise((resolve, reject) => {
			const deleteReq = indexedDB.deleteDatabase(name);
			deleteReq.onsuccess = resolve;
			deleteReq.onerror = reject;
		});
	}

	function getModelName(key) {
		// Extract model name from key
		const parts = key.split('/');
		if (parts.includes('onnx-community')) {
			return parts[parts.indexOf('onnx-community') + 1] || key;
		}
		if (parts.includes('Xenova')) {
			return parts[parts.indexOf('Xenova') + 1] || key;
		}
		return parts[parts.length - 1] || key;
	}
</script>

<div class="mx-auto w-full max-w-5xl p-6">
	<div
		class="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-indigo-900/40 to-purple-900/40 shadow-2xl backdrop-blur-xl"
	>
		<!-- Header -->
		<div class="border-b border-white/10 p-6">
			<div class="flex items-center justify-between">
				<div>
					<h3
						class="bg-gradient-to-r from-white to-purple-200 bg-clip-text text-2xl font-bold text-transparent"
					>
						🗄️ Model Storage Inspector
					</h3>
					<p class="mt-1 text-sm text-white/60">View and manage downloaded models</p>
				</div>

				<button
					on:click={() => (showDebugView = !showDebugView)}
					class="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-all hover:bg-white/20"
				>
					{showDebugView ? '📊 Simple View' : '🔍 Debug View'}
				</button>
			</div>
		</div>

		<!-- Storage Overview -->
		{#if storageInfo.total}
			<div class="border-b border-white/10 p-6">
				<div class="grid grid-cols-3 gap-4">
					<div class="rounded-xl bg-white/5 p-4">
						<div class="mb-1 text-xs text-white/60">Total Storage Used</div>
						<div class="text-xl font-bold text-white">{formatBytes(storageInfo.total.usage)}</div>
						<div class="text-xs text-white/40">{storageInfo.total.percent}% of quota</div>
					</div>

					<div class="rounded-xl bg-white/5 p-4">
						<div class="mb-1 text-xs text-white/60">Models Cached</div>
						<div class="text-xl font-bold text-white">{storageInfo.models.length}</div>
						<div class="text-xs text-white/40">
							{formatBytes(storageInfo.models.reduce((sum, m) => sum + m.size, 0))}
						</div>
					</div>

					<div class="rounded-xl bg-white/5 p-4">
						<div class="mb-1 text-xs text-white/60">Storage Quota</div>
						<div class="text-xl font-bold text-white">{formatBytes(storageInfo.total.quota)}</div>
						<div class="text-xs text-white/40">Available space</div>
					</div>
				</div>

				<!-- Storage Bar -->
				<div class="mt-4">
					<div class="h-3 overflow-hidden rounded-full bg-black/30">
						<div
							class="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all"
							style="width: {storageInfo.total.percent}%"
						></div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Models List -->
		<div class="max-h-[400px] space-y-3 overflow-y-auto p-6">
			{#if storageInfo.models.length > 0}
				<div class="mb-4 flex items-center justify-between">
					<h4 class="font-semibold text-white">Cached Models</h4>
					<button
						on:click={clearAllModels}
						class="rounded-lg bg-red-500/20 px-3 py-1 text-xs text-red-400 transition-all hover:bg-red-500/30"
					>
						🗑️ Clear All
					</button>
				</div>

				{#each storageInfo.models as model}
					<div class="rounded-xl bg-white/5 p-4 transition-all hover:bg-white/10">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="font-medium text-white">
									{getModelName(model.key)}
								</div>

								{#if showDebugView}
									<div class="mt-1 font-mono text-xs text-white/40">
										DB: {model.db}
									</div>
									<div class="font-mono text-xs text-white/40">
										Store: {model.store}
									</div>
									<div class="break-all font-mono text-xs text-white/40">
										Key: {model.fullKey}
									</div>
								{/if}

								<div class="mt-2 flex gap-4">
									<span class="text-sm text-white/60">
										📦 {formatBytes(model.size)}
									</span>
									<span class="text-sm text-white/60">
										Type: {model.type}
									</span>
								</div>
							</div>

							<button
								on:click={() => clearModel(model)}
								class="rounded-lg bg-red-500/20 px-3 py-1 text-xs text-red-400 transition-all hover:bg-red-500/30"
							>
								Delete
							</button>
						</div>
					</div>
				{/each}
			{:else}
				<div class="py-8 text-center text-white/40">
					<div class="mb-3 text-4xl">📭</div>
					<p>No models cached yet</p>
					<p class="mt-1 text-xs">Models will appear here after downloading</p>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="border-t border-white/10 bg-gradient-to-t from-black/20 to-transparent p-6">
			<div class="flex items-start gap-3">
				<div class="text-xl">ℹ️</div>
				<div class="space-y-1 text-xs text-white/50">
					<p>• Models are stored in IndexedDB (browser storage)</p>
					<p>• Location: DevTools → Application → IndexedDB → transformers-cache</p>
					<p>• Models persist across sessions until manually cleared</p>
					<p>• Each model download is split into chunks for reliability</p>
				</div>
			</div>

			<button
				on:click={checkStorage}
				class="mt-4 w-full rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-all hover:bg-white/20"
			>
				🔄 Refresh Storage Info
			</button>
		</div>
	</div>
</div>
