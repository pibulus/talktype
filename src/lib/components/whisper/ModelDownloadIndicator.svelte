<script>
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import {
		downloadStatus,
		formatBytes,
		formatETA
	} from '../../services/transcription/whisper/modelDownloader';
	import { selectedModel } from '../../services/transcription/whisper/modelRegistry';

	let unsubscribe;
	let showDetails = false;

	onMount(() => {
		// Auto-show details when download starts
		unsubscribe = downloadStatus.subscribe((status) => {
			if (status.inProgress && !showDetails) {
				showDetails = true;
			}
		});
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
	});

	$: progressPercentage = $downloadStatus.progress;
	$: isDownloading = $downloadStatus.inProgress;
	$: downloadStage = $downloadStatus.stage;
	$: downloadError = $downloadStatus.error;
</script>

{#if isDownloading || downloadError}
	<div
		class="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]"
		transition:fly={{ y: 100, duration: 300 }}
	>
		<div class="overflow-hidden rounded-2xl border-2 border-black bg-white shadow-2xl">
			<!-- Header -->
			<div class="bg-gradient-to-r from-amber-400 to-rose-300 px-4 py-3">
				<div class="flex items-center justify-between">
					<h3 class="font-bold text-black">
						{#if downloadError}
							Download Failed
						{:else if downloadStage === 'complete'}
							Download Complete!
						{:else}
							Downloading Whisper Model
						{/if}
					</h3>
					<button
						on:click={() => (showDetails = !showDetails)}
						class="rounded-lg px-2 py-1 text-black transition-colors hover:bg-black/10"
					>
						{showDetails ? '−' : '+'}
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="p-4">
				{#if downloadError}
					<div class="mb-3 text-sm text-red-600">
						{downloadError}
					</div>
					<button
						class="rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
						on:click={() => window.location.reload()}
					>
						Retry
					</button>
				{:else}
					<!-- Progress Bar -->
					<div class="mb-3">
						<div class="h-8 overflow-hidden rounded-full bg-gray-200">
							<div
								class="flex h-full items-center justify-center bg-gradient-to-r from-amber-400 to-rose-300 transition-all duration-300"
								style="width: {progressPercentage}%"
							>
								<span class="px-2 text-xs font-bold text-black">
									{progressPercentage}%
								</span>
							</div>
						</div>
					</div>

					<!-- Stage indicator -->
					<div class="mb-2 text-sm text-gray-600">
						{#if downloadStage === 'initializing'}
							Initializing...
						{:else if downloadStage === 'downloading'}
							Downloading {$selectedModel.name} ({formatBytes($selectedModel.size)})
						{:else if downloadStage === 'loading'}
							Loading model into memory...
						{:else if downloadStage === 'ready' || downloadStage === 'complete'}
							Model ready for transcription!
						{:else}
							Preparing...
						{/if}
					</div>

					{#if showDetails && $downloadStatus.bytesTotal > 0}
						<div class="space-y-1 text-xs text-gray-500" transition:fade={{ duration: 200 }}>
							<div>
								Downloaded: {formatBytes($downloadStatus.bytesLoaded)} / {formatBytes(
									$downloadStatus.bytesTotal
								)}
							</div>
							{#if $downloadStatus.speed > 0}
								<div>
									Speed: {formatBytes($downloadStatus.speed)}/s
								</div>
							{/if}
							{#if $downloadStatus.eta > 0}
								<div>
									Time remaining: {formatETA($downloadStatus.eta)}
								</div>
							{/if}
						</div>
					{/if}

					{#if downloadStage === 'complete'}
						<div class="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
							<p class="text-sm text-green-800">
								✨ Whisper is now ready! Your transcriptions will work offline forever.
							</p>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
