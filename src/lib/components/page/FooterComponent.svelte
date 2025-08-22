<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { whisperStatus } from '../../services/transcription/whisper/whisperService';
	import { transcriptionState } from '../../services/infrastructure/stores';

	const dispatch = createEventDispatcher();

	// Status tracking
	let isOffline = false;
	let isLoading = false;
	let isTranscribing = false;
	let privacyMode = false;
	let unsubscribeWhisper;
	let unsubscribeTranscription;

	function showAbout() {
		dispatch('showAbout');
	}

	function showSettings() {
		dispatch('showSettings');
	}

	function showExtension() {
		dispatch('showExtension');
	}

	onMount(() => {
		// Check privacy mode
		privacyMode = localStorage.getItem('talktype_privacy_mode') === 'true';

		// Subscribe to whisper status
		unsubscribeWhisper = whisperStatus.subscribe((status) => {
			isOffline = status.isLoaded;
			isLoading = status.isLoading;
		});

		// Subscribe to transcription state
		unsubscribeTranscription = transcriptionState.subscribe((state) => {
			isTranscribing = state.inProgress;
		});
	});

	onDestroy(() => {
		if (unsubscribeWhisper) unsubscribeWhisper();
		if (unsubscribeTranscription) unsubscribeTranscription();
	});

	// Determine status color and animation
	$: statusColor = privacyMode
		? 'bg-purple-500'
		: isTranscribing
			? 'bg-blue-500'
			: isLoading
				? 'bg-yellow-500'
				: isOffline
					? 'bg-green-500'
					: 'bg-blue-400';

	$: statusPulse = isTranscribing || isLoading;
	$: statusTitle = privacyMode
		? 'Privacy Mode Active'
		: isTranscribing
			? 'Transcribing...'
			: isLoading
				? 'Loading Model...'
				: isOffline
					? 'Offline Ready'
					: 'Online Mode';
</script>

<div class="flex items-center space-x-1 sm:space-x-2">
	<!-- Status Dot -->
	<div class="flex items-center px-2" title={statusTitle}>
		<div
			class="h-2 w-2 rounded-full {statusColor} {statusPulse ? 'animate-pulse' : ''}"
			aria-label={statusTitle}
		></div>
	</div>

	<button
		class="btn btn-ghost btn-sm h-auto min-h-0 px-1.5 py-1.5 text-xs text-gray-600 shadow-none transition-all hover:bg-pink-50/50 hover:text-pink-500 sm:px-3 sm:py-2 sm:text-base"
		on:click={showAbout}
		aria-label="About TalkType"
	>
		About
	</button>
	<button
		class="btn btn-ghost btn-sm h-auto min-h-0 px-1.5 py-1.5 text-xs text-gray-600 shadow-none transition-all hover:bg-pink-50/50 hover:text-pink-500 sm:px-3 sm:py-2 sm:text-base"
		on:click={showSettings}
		aria-label="Open Options"
	>
		Options
	</button>
	<button
		class="btn btn-sm h-auto min-h-0 border-none bg-gradient-to-r from-pink-50 to-purple-100 px-2 py-1.5 text-xs text-purple-600 shadow-sm transition-all hover:bg-opacity-90 hover:shadow sm:px-4 sm:py-2.5 sm:text-base"
		on:click={showExtension}
		aria-label="Chrome Extension Information"
	>
		Extension
	</button>
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
