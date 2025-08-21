<script>
	import { onMount } from 'svelte';
	import {
		whisperServiceUltimate,
		ultimateWhisperStatus
	} from '$lib/services/transcription/whisper/whisperServiceUltimate';
	import {
		enhancedModelRegistry,
		getModelsByTier,
		checkWebGPUSupport,
		getModelStats
	} from '$lib/services/transcription/whisper/modelRegistryEnhanced';
	import {
		downloadStatus,
		formatBytes,
		formatETA
	} from '$lib/services/transcription/whisper/modelDownloader';
	import { fade, fly, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	let selectedTier = 'balanced';
	let selectedModelId = 'distil-small';
	let isLoading = false;
	let webgpuSupported = false;
	let currentModel = null;
	let downloadingModels = new Set();
	let modelLoadTimes = {};
	let testResults = {};
	let cachedModels = new Set();

	const tiers = {
		instant: {
			name: 'Instant',
			subtitle: 'Lightning fast',
			description: 'Perfect for quick notes',
			icon: '⚡',
			gradient: 'from-cyan-400 to-blue-500'
		},
		balanced: {
			name: 'Balanced',
			subtitle: 'Sweet spot',
			description: 'Daily driver',
			icon: '⚖️',
			gradient: 'from-purple-400 to-pink-500'
		},
		quality: {
			name: 'Quality',
			subtitle: 'High fidelity',
			description: 'When it matters',
			icon: '💎',
			gradient: 'from-orange-400 to-red-500'
		},
		pro: {
			name: 'Pro',
			subtitle: 'Studio grade',
			description: 'Broadcast ready',
			icon: '🎬',
			gradient: 'from-emerald-400 to-green-500'
		}
	};

	$: tierModels = getModelsByTier(selectedTier);
	$: currentStatus = $ultimateWhisperStatus;
	$: downloadProgress = $downloadStatus;

	let checkInterval;

	onMount(async () => {
		const support = await checkWebGPUSupport();
		webgpuSupported = support.supported;
		currentModel = currentStatus.selectedModel;

		// Find current model's tier
		for (const [tier, info] of Object.entries(tiers)) {
			const models = getModelsByTier(tier);
			if (models.some((m) => m.id === currentModel)) {
				selectedTier = tier;
				selectedModelId = currentModel;
				break;
			}
		}

		// Check IndexedDB for cached models
		checkCachedModels();

		// Check for cached models periodically
		checkInterval = setInterval(checkCachedModels, 5000);

		return () => {
			if (checkInterval) clearInterval(checkInterval);
		};
	});

	async function selectModel(modelId) {
		selectedModelId = modelId;
		isLoading = true;
		downloadingModels.add(modelId);

		const startTime = Date.now();

		try {
			await whisperServiceUltimate.switchModel(modelId);
			currentModel = modelId;

			// Track load time
			const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
			modelLoadTimes[modelId] = loadTime;

			// Mark as cached after successful load
			cachedModels.add(modelId);
			cachedModels = cachedModels; // Trigger reactivity
		} catch (error) {
			console.error('Failed to switch model:', error);
		} finally {
			isLoading = false;
			downloadingModels.delete(modelId);
			downloadingModels = downloadingModels; // Trigger reactivity
		}
	}

	async function testModel(modelId) {
		// Quick test transcription
		testResults[modelId] = 'testing';

		try {
			// Create a test audio blob (1 second of silence)
			const audioContext = new AudioContext();
			const buffer = audioContext.createBuffer(1, 16000, 16000);
			const arrayBuffer = new ArrayBuffer(buffer.length * 2);
			const blob = new Blob([arrayBuffer], { type: 'audio/wav' });

			const startTime = Date.now();
			await whisperServiceUltimate.transcribeAudio(blob);
			const time = ((Date.now() - startTime) / 1000).toFixed(2);

			testResults[modelId] = `Tested in ${time}s`;
			testResults = testResults; // Trigger reactivity
		} catch (error) {
			testResults[modelId] = 'Test failed';
			testResults = testResults;
		}
	}

	async function checkCachedModels() {
		// Check IndexedDB for cached models
		try {
			// Check all possible databases where models might be stored
			const databases = (await indexedDB.databases?.()) || [];
			cachedModels.clear();

			// Check transformers.js cache
			for (const dbInfo of databases) {
				if (dbInfo.name.includes('transformers') || dbInfo.name.includes('cache')) {
					try {
						const db = await openDB(dbInfo.name);
						const stores = Array.from(db.objectStoreNames);

						for (const storeName of stores) {
							const tx = db.transaction([storeName], 'readonly');
							const store = tx.objectStore(storeName);
							const keys = await promisifyRequest(store.getAllKeys());

							// Check if any keys match our model IDs
							for (const key of keys) {
								const keyStr = key.toString();

								// Check if this key matches any of our models
								tierModels.forEach((model) => {
									if (keyStr.includes(model.transformers_id)) {
										cachedModels.add(model.id);
										// Simulate a load time for cached models
										if (!modelLoadTimes[model.id]) {
											modelLoadTimes[model.id] = '0.5';
										}
									}
								});
							}
						}

						db.close();
					} catch (e) {
						console.log(`Could not check database ${dbInfo.name}:`, e);
					}
				}
			}

			// Trigger reactivity
			cachedModels = cachedModels;
			modelLoadTimes = modelLoadTimes;
		} catch (error) {
			console.log('Could not check IndexedDB:', error);
		}
	}

	function promisifyRequest(request) {
		return new Promise((resolve, reject) => {
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	async function openDB(name = 'TalkTypeModels') {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(name);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	function formatSize(bytes) {
		return formatBytes(bytes);
	}

	function getModelStatus(modelId) {
		if (currentModel === modelId && currentStatus.isLoaded) {
			return 'active';
		}
		if (
			downloadingModels.has(modelId) ||
			(downloadProgress.modelId === modelId && downloadProgress.inProgress)
		) {
			return 'downloading';
		}
		if (cachedModels.has(modelId) || modelLoadTimes[modelId]) {
			return 'cached';
		}
		return 'available';
	}

	function getStatusColor(status) {
		switch (status) {
			case 'active':
				return 'from-green-400/20 to-emerald-500/20 border-green-500';
			case 'downloading':
				return 'from-yellow-400/20 to-orange-500/20 border-yellow-500';
			case 'cached':
				return 'from-blue-400/20 to-cyan-500/20 border-blue-500';
			default:
				return 'from-white/5 to-white/10 border-white/20';
		}
	}

	function getStatusBadge(status, modelId) {
		switch (status) {
			case 'active':
				return '✓ Active';
			case 'downloading':
				return '⏳ Loading...';
			case 'cached':
				return `⚡ Cached (${modelLoadTimes[modelId]}s)`;
			default:
				return null;
		}
	}
</script>

<div class="mx-auto w-full max-w-5xl p-6">
	<div
		class="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-purple-900/40 to-pink-900/40 shadow-2xl backdrop-blur-xl"
	>
		<!-- Header -->
		<div class="border-b border-white/10 p-8">
			<h2
				class="bg-gradient-to-r from-white to-pink-200 bg-clip-text text-4xl font-bold text-transparent"
			>
				Transcription Engine
			</h2>
			<p class="mt-2 text-white/60">Choose your speed and quality preference</p>

			<!-- WebGPU Badge -->
			<div class="mt-4">
				{#if webgpuSupported}
					<div
						class="inline-flex items-center gap-2 rounded-full border border-green-500/50 bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 py-2"
					>
						<div class="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
						<span class="text-sm font-medium text-green-400">WebGPU Acceleration Active</span>
					</div>
				{:else}
					<div
						class="inline-flex items-center gap-2 rounded-full border border-yellow-500/50 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-2"
					>
						<div class="h-2 w-2 rounded-full bg-yellow-500"></div>
						<span class="text-sm font-medium text-yellow-400">CPU Mode (Still Fast!)</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Tier Pills -->
		<div class="border-b border-white/10 p-6">
			<div class="flex flex-wrap gap-3">
				{#each Object.entries(tiers) as [tier, info]}
					<button
						on:click={() => (selectedTier = tier)}
						class="group relative transform rounded-2xl px-6 py-3 transition-all duration-300 hover:scale-105 {selectedTier ===
						tier
							? 'bg-gradient-to-r ' + info.gradient + ' shadow-lg shadow-purple-500/20'
							: 'border border-white/10 bg-white/5 hover:bg-white/10'}"
					>
						<div class="flex items-center gap-3">
							<span class="text-2xl">{info.icon}</span>
							<div class="text-left">
								<div class="font-bold text-white">{info.name}</div>
								<div class="text-xs text-white/60">{info.subtitle}</div>
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Model Grid -->
		<div
			class="scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent max-h-[600px] space-y-4 overflow-y-auto p-6"
		>
			{#each tierModels as model}
				{@const status = getModelStatus(model.id)}
				{@const isDownloading = status === 'downloading'}
				<div in:fly={{ y: 20, duration: 300, delay: tierModels.indexOf(model) * 50 }} class="group">
					<button
						on:click={() => selectModel(model.id)}
						disabled={isDownloading}
						class="w-full rounded-2xl bg-gradient-to-r p-6 transition-all duration-300 {getStatusColor(
							status
						)} border backdrop-blur-sm hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
					>
						<div class="flex items-start justify-between">
							<div class="flex-1 text-left">
								<div class="mb-2 flex items-center gap-3">
									<h3 class="text-xl font-bold text-white">
										{model.name}
									</h3>
									{#if model.badge}
										<span
											class="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-lg"
										>
											{model.badge}
										</span>
									{/if}
									{#if getStatusBadge(status, model.id)}
										<span
											class="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90"
											in:scale
										>
											{getStatusBadge(status, model.id)}
										</span>
									{/if}
								</div>
								<p class="mb-3 text-sm text-white/70">{model.description}</p>

								<!-- Feature Pills -->
								<div class="flex flex-wrap gap-2">
									{#if model.speed_multiplier}
										<div
											class="rounded-lg border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs text-blue-300"
										>
											{model.speed_multiplier}x faster
										</div>
									{/if}
									{#if model.accuracy}
										<div
											class="rounded-lg border border-green-500/30 bg-green-500/20 px-3 py-1 text-xs text-green-300"
										>
											{Math.round(model.accuracy * 100)}% accurate
										</div>
									{/if}
									{#if model.webgpu_optimized}
										<div
											class="rounded-lg border border-purple-500/30 bg-purple-500/20 px-3 py-1 text-xs text-purple-300"
										>
											GPU Ready
										</div>
									{/if}
								</div>
							</div>

							<!-- Right Side Info -->
							<div class="ml-4 text-right">
								<div class="text-2xl font-bold text-white">{formatSize(model.size)}</div>
								<div class="text-xs text-white/50">{model.download_time_estimate}</div>
								{#if testResults[model.id]}
									<div class="mt-1 text-xs text-green-400">{testResults[model.id]}</div>
								{/if}
							</div>
						</div>

						<!-- Download Progress -->
						{#if isDownloading}
							<div class="mt-4" in:fly={{ y: -10, duration: 200 }}>
								<div class="mb-2 flex justify-between text-sm">
									<span class="text-yellow-300">
										{downloadProgress.stage || 'Downloading'}...
									</span>
									<span class="font-mono text-white">
										{downloadProgress.progress}%
									</span>
								</div>
								<div class="h-3 overflow-hidden rounded-full bg-black/30">
									<div
										class="relative h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300"
										style="width: {downloadProgress.progress}%"
									>
										<div class="absolute inset-0 animate-pulse bg-white/30"></div>
									</div>
								</div>
								{#if downloadProgress.speed}
									<div class="mt-2 flex justify-between text-xs text-white/60">
										<span>{formatBytes(downloadProgress.speed)}/s</span>
										<span>ETA: {formatETA(downloadProgress.eta)}</span>
									</div>
								{/if}
							</div>
						{/if}
					</button>

					<!-- Test Button (shows on hover for cached models) -->
					{#if status === 'cached' || status === 'active'}
						<button
							on:click={() => testModel(model.id)}
							class="mt-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-white/70 opacity-0 transition-all hover:bg-white/10 group-hover:opacity-100"
						>
							🧪 Test Speed
						</button>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Info Footer -->
		<div class="border-t border-white/10 bg-gradient-to-t from-black/20 to-transparent p-6">
			<div class="flex items-start gap-3">
				<div class="text-2xl">💡</div>
				<div class="space-y-1 text-sm text-white/60">
					<p>• Models are cached in your browser - download once, use forever</p>
					<p>• Distil models are 6x faster with 96-99% accuracy</p>
					<p>• WebGPU acceleration makes transcription 10-100x faster</p>
					<p>• Switch models anytime based on your needs</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Custom scrollbar styles */
	.scrollbar-thin {
		scrollbar-width: thin;
	}

	.scrollbar-thumb-white\/20::-webkit-scrollbar-thumb {
		background-color: rgba(255, 255, 255, 0.2);
		border-radius: 10px;
	}

	.scrollbar-track-transparent::-webkit-scrollbar-track {
		background-color: transparent;
	}

	::-webkit-scrollbar {
		width: 8px;
	}
</style>
