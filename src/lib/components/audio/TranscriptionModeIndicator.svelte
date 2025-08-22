<script>
	import { onMount, onDestroy } from 'svelte';
	import { whisperStatus } from '../../services/transcription/whisper/whisperService';
	
	let isOffline = false;
	let isLoading = false;
	let progress = 0;
	let unsubscribe;
	
	onMount(() => {
		unsubscribe = whisperStatus.subscribe(status => {
			isOffline = status.isLoaded;
			isLoading = status.isLoading;
			progress = status.progress;
		});
	});
	
	onDestroy(() => {
		if (unsubscribe) unsubscribe();
	});
</script>

{#if !isOffline}
	<div class="fixed bottom-20 right-4 z-30">
		<div class="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-gray-200 flex items-center gap-2 text-xs">
			{#if isLoading}
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></div>
					<span class="text-gray-600">Downloading offline model... {progress}%</span>
				</div>
			{:else}
				<div class="flex items-center gap-2">
					<div class="w-2 h-2 rounded-full bg-green-400"></div>
					<span class="text-gray-600">Online mode</span>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	
	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>