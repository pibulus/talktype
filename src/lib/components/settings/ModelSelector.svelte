<script>
	import { onMount } from 'svelte';
	import {
		whisperServiceUltimate,
		ultimateWhisperStatus
	} from '$lib/services/transcription/whisper/whisperServiceUltimate';
	import {
		enhancedModelRegistry,
		getModelsByTier,
		checkWebGPUSupport
	} from '$lib/services/transcription/whisper/modelRegistryEnhanced';
	import { downloadStatus } from '$lib/services/transcription/whisper/modelDownloader';

	let selectedTier = 'balanced';
	let selectedModelId = 'distil-small';
	let isLoading = false;
	let webgpuSupported = false;
	let currentModel = null;

	const tiers = {
		instant: {
			name: 'Instant',
			description: 'Ultra-fast downloads, basic quality',
			icon: '⚡',
			color: 'from-blue-500 to-cyan-500'
		},
		balanced: {
			name: 'Balanced',
			description: 'Best value: Fast & accurate',
			icon: '⚖️',
			color: 'from-purple-500 to-pink-500'
		},
		quality: {
			name: 'Quality',
			description: 'High accuracy for important work',
			icon: '✨',
			color: 'from-orange-500 to-red-500'
		},
		pro: {
			name: 'Pro',
			description: 'Studio quality, multi-language',
			icon: '🎬',
			color: 'from-green-500 to-emerald-500'
		}
	};

	$: tierModels = getModelsByTier(selectedTier);
	$: currentStatus = $ultimateWhisperStatus;
	$: downloadProgress = $downloadStatus;

	onMount(async () => {
		// Check WebGPU support
		const support = await checkWebGPUSupport();
		webgpuSupported = support.supported;

		// Get current model
		currentModel = currentStatus.selectedModel;

		// Find which tier the current model belongs to
		for (const [tier, info] of Object.entries(tiers)) {
			const models = getModelsByTier(tier);
			if (models.some((m) => m.id === currentModel)) {
				selectedTier = tier;
				selectedModelId = currentModel;
				break;
			}
		}
	});

	async function selectModel(modelId) {
		selectedModelId = modelId;
		isLoading = true;

		try {
			await whisperServiceUltimate.switchModel(modelId);
			currentModel = modelId;
		} catch (error) {
			console.error('Failed to switch model:', error);
		} finally {
			isLoading = false;
		}
	}

	function formatSize(bytes) {
		return `${Math.round(bytes / (1024 * 1024))}MB`;
	}

	function getModelStatus(modelId) {
		if (currentModel === modelId && currentStatus.isLoaded) {
			return 'active';
		}
		if (downloadProgress.modelId === modelId && downloadProgress.inProgress) {
			return 'downloading';
		}
		return 'available';
	}
</script>

<div class="mx-auto w-full max-w-4xl p-6">
	<div
		class="rounded-3xl border-2 border-white/20 bg-gradient-to-br from-purple-900/50 to-pink-900/50 p-8 backdrop-blur-lg"
	>
		<h2 class="mb-2 text-3xl font-bold text-white">🎯 Transcription Model</h2>
		<p class="mb-6 text-white/80">Choose your speed vs quality preference</p>

		<!-- WebGPU Status -->
		{#if webgpuSupported}
			<div class="mb-6 rounded-xl border border-green-500 bg-green-500/20 p-3">
				<span class="font-bold text-green-400">✅ WebGPU Enabled</span>
				<span class="ml-2 text-white/80">10-100x faster processing!</span>
			</div>
		{:else}
			<div class="mb-6 rounded-xl border border-yellow-500 bg-yellow-500/20 p-3">
				<span class="font-bold text-yellow-400">⚠️ WebGPU Not Available</span>
				<span class="ml-2 text-white/80">Using CPU (still fast!)</span>
			</div>
		{/if}

		<!-- Tier Selector -->
		<div class="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
			{#each Object.entries(tiers) as [tier, info]}
				<button
					on:click={() => (selectedTier = tier)}
					class="relative transform rounded-xl p-4 transition-all hover:scale-105 {selectedTier ===
					tier
						? 'bg-gradient-to-br ' + info.color + ' scale-105 text-white shadow-lg'
						: 'bg-white/10 text-white/80 hover:bg-white/20'}"
				>
					<div class="mb-1 text-2xl">{info.icon}</div>
					<div class="font-bold">{info.name}</div>
					<div class="text-xs opacity-80">{info.description}</div>
				</button>
			{/each}
		</div>

		<!-- Model List -->
		<div class="space-y-3">
			{#each tierModels as model}
				{@const status = getModelStatus(model.id)}
				<button
					on:click={() => selectModel(model.id)}
					disabled={status === 'downloading' || isLoading}
					class="w-full rounded-xl p-4 text-left transition-all {status === 'active'
						? 'border-2 border-green-500 bg-gradient-to-r from-green-500/30 to-emerald-500/30'
						: status === 'downloading'
							? 'animate-pulse border-2 border-yellow-500 bg-yellow-500/20'
							: 'border-2 border-white/20 bg-white/10 hover:bg-white/20'}"
				>
					<div class="mb-2 flex items-start justify-between">
						<div>
							<h3 class="flex items-center gap-2 text-lg font-bold text-white">
								{model.name}
								{#if model.badge}
									<span
										class="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-2 py-1 text-xs font-bold text-white"
									>
										{model.badge}
									</span>
								{/if}
								{#if status === 'active'}
									<span class="text-green-400">✓ Active</span>
								{/if}
							</h3>
							<p class="text-sm text-white/70">{model.description}</p>
						</div>
						<div class="text-right">
							<div class="font-mono text-white/90">{formatSize(model.size)}</div>
							<div class="text-xs text-white/60">{model.download_time_estimate}</div>
						</div>
					</div>

					<!-- Features -->
					<div class="mb-2 flex flex-wrap gap-2">
						{#if model.speed_multiplier}
							<span class="rounded-lg bg-blue-500/30 px-2 py-1 text-xs text-blue-300">
								{model.speed_multiplier}x faster
							</span>
						{/if}
						{#if model.accuracy}
							<span class="rounded-lg bg-green-500/30 px-2 py-1 text-xs text-green-300">
								{Math.round(model.accuracy * 100)}% accuracy
							</span>
						{/if}
						{#if model.webgpu_optimized}
							<span class="rounded-lg bg-purple-500/30 px-2 py-1 text-xs text-purple-300">
								GPU optimized
							</span>
						{/if}
						{#if model.quantization}
							<span class="rounded-lg bg-orange-500/30 px-2 py-1 text-xs text-orange-300">
								{model.quantization} quantized
							</span>
						{/if}
						{#if model.languages.length > 1}
							<span class="rounded-lg bg-pink-500/30 px-2 py-1 text-xs text-pink-300">
								{model.languages.length} languages
							</span>
						{/if}
					</div>

					<!-- Recommended for -->
					<div class="text-xs text-white/60">
						Best for: {model.recommended_for}
					</div>

					<!-- Download progress if downloading -->
					{#if status === 'downloading'}
						<div class="mt-3">
							<div class="mb-1 flex justify-between text-xs text-yellow-300">
								<span>Downloading...</span>
								<span>{downloadProgress.progress}%</span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-black/30">
								<div
									class="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all"
									style="width: {downloadProgress.progress}%"
								></div>
							</div>
						</div>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Info Box -->
		<div class="mt-6 rounded-xl bg-white/10 p-4">
			<h4 class="mb-2 font-bold text-white">💡 Pro Tips</h4>
			<ul class="space-y-1 text-sm text-white/70">
				<li>• Distil models are 6x faster with nearly identical quality</li>
				<li>• WebGPU makes transcription 10-100x faster (Chrome/Edge)</li>
				<li>• Models are cached - download once, use forever</li>
				<li>• Switch models anytime based on your needs</li>
			</ul>
		</div>
	</div>
</div>
