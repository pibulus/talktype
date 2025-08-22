<script>
	import { onMount, onDestroy } from 'svelte';
	import { whisperStatus } from '../../services/transcription/whisper/whisperService';
	import { transcriptionState } from '../../services/infrastructure/stores';

	let isOffline = false;
	let isLoading = false;
	let progress = 0;
	let isTranscribing = false;
	let lastTranscriptionMethod = '';
	let privacyMode = false;
	let unsubscribe;
	let unsubscribeTranscription;

	onMount(() => {
		// Check privacy mode
		privacyMode = localStorage.getItem('talktype_privacy_mode') === 'true';

		unsubscribe = whisperStatus.subscribe((status) => {
			isOffline = status.isLoaded;
			isLoading = status.isLoading;
			progress = status.progress;
		});

		unsubscribeTranscription = transcriptionState.subscribe((state) => {
			isTranscribing = state.inProgress;
			// Check console for which method was used
			if (state.inProgress) {
				// This will be set by the service
				lastTranscriptionMethod = localStorage.getItem('last_transcription_method') || 'unknown';
			}
		});
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
		if (unsubscribeTranscription) unsubscribeTranscription();
	});
</script>

<div class="fixed bottom-20 right-4 z-30">
	<div
		class="flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur-sm"
	>
		{#if isTranscribing}
			<div class="flex items-center gap-2">
				<div
					class="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent"
				></div>
				<span class="text-gray-600">
					Transcribing via {lastTranscriptionMethod === 'whisper' ? '🔒 Offline' : '☁️ Gemini API'}
				</span>
			</div>
		{:else if isLoading}
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 animate-pulse rounded-full bg-amber-400"></div>
				<span class="text-gray-600">Downloading offline model... {progress}%</span>
			</div>
		{:else if isOffline}
			<div class="flex items-center gap-2">
				<div class="h-2 w-2 rounded-full bg-purple-400"></div>
				<span class="text-gray-600">🔒 Offline ready</span>
			</div>
		{:else if privacyMode}
			<div class="flex items-center gap-2">
				<div class="h-2 w-2 rounded-full bg-yellow-400"></div>
				<span class="text-gray-600">⏳ Privacy mode (loading model)</span>
			</div>
		{:else}
			<div class="flex items-center gap-2">
				<div class="h-2 w-2 rounded-full bg-green-400"></div>
				<span class="text-gray-600">☁️ Online mode</span>
			</div>
		{/if}
	</div>
</div>

<style>
	@keyframes pulse {
		0%,
		100% {
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
