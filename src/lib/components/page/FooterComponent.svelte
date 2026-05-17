<script>
	import { createEventDispatcher } from 'svelte';
	import { analytics } from '$lib/services/analytics';

	const dispatch = createEventDispatcher();

	function showAbout() {
		analytics.viewModal('about');
		dispatch('showAbout');
	}

	function showSettings() {
		analytics.viewModal('settings');
		dispatch('showSettings');
	}

	function showHistory() {
		analytics.viewModal('history');
		dispatch('showHistory');
	}

	function showExtension() {
		analytics.viewModal('extension');
		dispatch('showExtension');
	}

	async function shareApp() {
		const shareData = {
			title: 'TalkType',
			text: "Voice-to-text that doesn't suck. Fast, free, and private when you need it.",
			url: 'https://talktype.app'
		};

		try {
			if (navigator.share) {
				await navigator.share(shareData);
			} else {
				await navigator.clipboard.writeText(shareData.url);
				// Optional: You could dispatch a toast event here if you had a toast system
				// dispatch('showToast', { message: 'Link copied!' });
			}
		} catch (err) {
			console.error('Error sharing:', err);
		}
	}
</script>

<nav class="flex items-center space-x-1 sm:space-x-2" aria-label="TalkType footer">
	<button
		class="btn btn-ghost btn-sm !h-[44px] !min-h-[44px] min-w-11 px-1.5 py-2 text-xs text-gray-600 shadow-none transition-all hover:bg-pink-50/50 hover:text-pink-500 focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:ring-offset-2 sm:px-3 sm:text-base"
		on:click={showAbout}
		aria-label="About TalkType"
	>
		About
	</button>
	<button
		class="btn btn-ghost btn-sm !h-[44px] !min-h-[44px] min-w-11 px-1.5 py-2 text-xs text-gray-600 shadow-none transition-all hover:bg-pink-50/50 hover:text-pink-500 focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:ring-offset-2 sm:px-3 sm:text-base"
		on:click={showSettings}
		aria-label="Open Options"
	>
		Options
	</button>
	<button
		class="btn btn-ghost btn-sm !h-[44px] !min-h-[44px] min-w-11 px-1.5 py-2 text-xs text-gray-600 shadow-none transition-all hover:bg-pink-50/50 hover:text-pink-500 focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:ring-offset-2 sm:px-3 sm:text-base"
		on:click={showHistory}
		aria-label="View Transcript History"
	>
		History
	</button>
	<button
		class="btn btn-ghost btn-sm !h-[44px] !min-h-[44px] min-w-11 px-1.5 py-2 text-xs text-gray-600 shadow-none transition-all hover:bg-pink-50/50 hover:text-pink-500 focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:ring-offset-2 sm:px-3 sm:text-base"
		on:click={showExtension}
		aria-label="Open Chrome Extension info"
	>
		Extension
	</button>
	<button
		class="btn btn-ghost btn-sm !h-[44px] !min-h-[44px] min-w-11 px-1.5 py-2 text-xs text-gray-600 shadow-none transition-all hover:bg-pink-50/50 hover:text-pink-500 focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:ring-offset-2 sm:px-3 sm:text-base"
		on:click={shareApp}
		aria-label="Share TalkType"
	>
		Share
	</button>
</nav>
