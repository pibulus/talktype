<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	function showAbout() {
		dispatch('showAbout');
	}

	function showSettings() {
		dispatch('showSettings');
	}

	function showExtension() {
		dispatch('showExtension');
	}
</script>

<div class="flex items-center space-x-1 sm:space-x-2">
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
