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

	async function shareApp() {
		const shareData = {
			title: 'TalkType',
			text: 'Fast, Fun, Freaky Good Voice to Text. 100% Private.',
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
		class="btn btn-ghost btn-sm h-auto min-h-0 px-1.5 py-1.5 text-xs text-gray-600 shadow-none transition-all hover:bg-pink-50/50 hover:text-pink-500 sm:px-3 sm:py-2 sm:text-base"
		on:click={showHistory}
		aria-label="View Transcript History"
	>
		History
	</button>
	<button
		class="btn btn-ghost btn-sm h-auto min-h-0 px-1.5 py-1.5 text-xs text-gray-600 shadow-none transition-all hover:bg-pink-50/50 hover:text-pink-500 sm:px-3 sm:py-2 sm:text-base"
		on:click={shareApp}
		aria-label="Share TalkType"
	>
		Share
	</button>
</div>
