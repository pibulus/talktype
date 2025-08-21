<script>
	import { onMount } from 'svelte';
	import { whisperServiceFast } from '$lib/services/transcription/whisper/whisperServiceFast';
	import { downloadStatus } from '$lib/services/transcription/whisper/modelDownloader';
	import { formatBytes, formatETA } from '$lib/services/transcription/whisper/modelDownloader';

	let isLoading = false;
	let downloadComplete = false;
	let error = null;
	let startTime = null;
	let endTime = null;
	let totalTime = null;

	// Subscribe to download status
	let currentStatus = {};
	downloadStatus.subscribe((status) => {
		currentStatus = status;
	});

	async function testDownload() {
		isLoading = true;
		downloadComplete = false;
		error = null;
		startTime = Date.now();

		try {
			console.log('🚀 Starting HYPERSPEED download test...');
			const result = await whisperServiceFast.preloadModel();

			if (result.success) {
				endTime = Date.now();
				totalTime = ((endTime - startTime) / 1000).toFixed(2);
				downloadComplete = true;
				console.log(`✨ Download complete in ${totalTime} seconds!`);
			} else {
				error = result.error?.message || 'Download failed';
			}
		} catch (err) {
			error = err.message;
			console.error('Download test failed:', err);
		} finally {
			isLoading = false;
		}
	}

	function getSpeedClass(speed) {
		if (!speed) return '';
		const mbps = speed / (1024 * 1024);
		if (mbps > 5) return 'text-green-500';
		if (mbps > 2) return 'text-yellow-500';
		return 'text-red-500';
	}

	onMount(() => {
		// Auto-start test for demo
		// testDownload();
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 p-8">
	<div class="mx-auto max-w-4xl">
		<h1 class="mb-2 text-6xl font-bold text-white">🚀 HYPERSPEED Download Test</h1>
		<p class="mb-8 text-2xl text-pink-200">
			Testing our 10x faster model downloads with jsDelivr CDN + Parallel Chunks
		</p>

		<div class="rounded-3xl border-4 border-white/20 bg-black/30 p-8 backdrop-blur-md">
			{#if !isLoading && !downloadComplete}
				<button
					on:click={testDownload}
					class="w-full transform rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-6 text-2xl font-bold text-white transition-all hover:scale-105 hover:from-pink-600 hover:to-purple-700 active:scale-95"
				>
					Start HYPERSPEED Download Test
				</button>

				<div class="mt-6 text-white/80">
					<h3 class="mb-2 text-xl font-bold">What's New:</h3>
					<ul class="space-y-2">
						<li class="flex items-center">
							<span class="mr-3 text-2xl">🌍</span>
							<span>jsDelivr CDN - 100+ global edge locations</span>
						</li>
						<li class="flex items-center">
							<span class="mr-3 text-2xl">⚡</span>
							<span>Parallel chunk downloads - 4x concurrent streams</span>
						</li>
						<li class="flex items-center">
							<span class="mr-3 text-2xl">📻</span>
							<span>Tab sharing - Instant load if another tab has it</span>
						</li>
						<li class="flex items-center">
							<span class="mr-3 text-2xl">🗜️</span>
							<span>Brotli compression - 30% smaller files</span>
						</li>
					</ul>
				</div>
			{/if}

			{#if isLoading}
				<div class="space-y-6">
					<div class="flex items-center justify-between">
						<h2 class="text-3xl font-bold text-white">
							{currentStatus.stage === 'downloading'
								? '📥 Downloading Model'
								: currentStatus.stage === 'loading'
									? '🔧 Loading Model'
									: currentStatus.stage === 'ready'
										? '✨ Almost Ready!'
										: '🚀 Initializing...'}
						</h2>
						<span class="font-mono text-2xl text-pink-300">
							{currentStatus.progress}%
						</span>
					</div>

					<!-- Progress Bar -->
					<div
						class="relative h-8 overflow-hidden rounded-full border-2 border-white/30 bg-black/50"
					>
						<div
							class="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-300"
							style="width: {currentStatus.progress}%"
						>
							<div class="h-full animate-pulse bg-white/20"></div>
						</div>
					</div>

					<!-- Stats -->
					<div class="grid grid-cols-2 gap-4 text-white">
						<div class="rounded-xl bg-white/10 p-4">
							<div class="text-sm opacity-70">Download Speed</div>
							<div class="text-2xl font-bold {getSpeedClass(currentStatus.speed)}">
								{currentStatus.speed ? formatBytes(currentStatus.speed) + '/s' : 'Calculating...'}
							</div>
						</div>
						<div class="rounded-xl bg-white/10 p-4">
							<div class="text-sm opacity-70">Time Remaining</div>
							<div class="text-2xl font-bold text-yellow-300">
								{formatETA(currentStatus.eta)}
							</div>
						</div>
						<div class="rounded-xl bg-white/10 p-4">
							<div class="text-sm opacity-70">Downloaded</div>
							<div class="text-2xl font-bold">
								{formatBytes(currentStatus.bytesLoaded)}
							</div>
						</div>
						<div class="rounded-xl bg-white/10 p-4">
							<div class="text-sm opacity-70">Total Size</div>
							<div class="text-2xl font-bold">
								{formatBytes(currentStatus.bytesTotal)}
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if downloadComplete}
				<div class="space-y-6 text-center">
					<div class="animate-bounce text-6xl">🎉</div>
					<h2 class="text-4xl font-bold text-white">Download Complete!</h2>
					<div class="font-mono text-2xl text-green-400">
						Total Time: {totalTime} seconds
					</div>

					<div class="rounded-xl border-2 border-green-500 bg-green-500/20 p-6 text-white">
						<p class="mb-2 text-xl">
							{#if totalTime < 5}
								🚀 BLAZING FAST! That's what we're talking about!
							{:else if totalTime < 10}
								⚡ Great speed! Much faster than before!
							{:else if totalTime < 20}
								✅ Good performance! CDN is working well.
							{:else}
								📊 Download complete. Consider testing with better connection.
							{/if}
						</p>
						<p class="text-sm opacity-80">
							Model is now cached and ready for instant transcription
						</p>
					</div>

					<button
						on:click={() => {
							downloadComplete = false;
							error = null;
							totalTime = null;
						}}
						class="rounded-xl bg-white/20 px-8 py-4 text-xl font-bold text-white transition-all hover:bg-white/30"
					>
						Test Again
					</button>
				</div>
			{/if}

			{#if error}
				<div class="rounded-xl border-2 border-red-500 bg-red-500/20 p-6">
					<h3 class="mb-2 text-2xl font-bold text-red-400">Error</h3>
					<p class="text-white">{error}</p>
					<button
						on:click={() => {
							error = null;
							testDownload();
						}}
						class="mt-4 rounded-lg bg-red-500 px-6 py-2 font-bold text-white hover:bg-red-600"
					>
						Retry
					</button>
				</div>
			{/if}
		</div>

		<!-- Network Throttling Instructions -->
		<div class="mt-8 rounded-2xl bg-white/10 p-6 text-white/80 backdrop-blur-sm">
			<h3 class="mb-3 text-xl font-bold">📊 Testing Instructions:</h3>
			<ol class="list-inside list-decimal space-y-2">
				<li>Open Chrome DevTools (F12)</li>
				<li>Go to Network tab</li>
				<li>Click throttling dropdown (usually says "No throttling")</li>
				<li>Select "Fast 3G" or "Slow 3G" to simulate slower connections</li>
				<li>Click "Start HYPERSPEED Download Test" above</li>
				<li>Compare with old implementation (30-40 seconds)</li>
			</ol>

			<div class="mt-4 rounded-xl border-2 border-yellow-500 bg-yellow-500/20 p-4">
				<p class="font-bold">⚡ Expected Results:</p>
				<ul class="mt-2 space-y-1">
					<li>• Normal connection: &lt;3 seconds</li>
					<li>• Fast 3G: &lt;10 seconds</li>
					<li>• Slow 3G: &lt;20 seconds</li>
					<li>• Old implementation: 30-40+ seconds</li>
				</ul>
			</div>
		</div>
	</div>
</div>
