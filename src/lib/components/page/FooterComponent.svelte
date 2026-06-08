<script>
	import { createEventDispatcher } from 'svelte';
	import { analytics } from '$lib/services/analytics.js';

	const dispatch = createEventDispatcher();
	const footerButtonClass =
		'footer-nav-button btn btn-ghost btn-sm !h-[44px] !min-h-[44px] min-w-11 px-1.5 py-2 text-xs text-gray-600 shadow-none transition-colors duration-150 focus-visible:ring-0 sm:px-3 sm:text-base';

	function showAbout() {
		dispatch('showAbout');
	}

	function showSettings() {
		dispatch('showSettings');
	}

	function showHistory() {
		dispatch('showHistory');
	}

	function showExtension() {
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
				analytics.appShared({ method: 'native' });
			} else {
				await navigator.clipboard.writeText(shareData.url);
				analytics.appShared({ method: 'clipboard' });
				// Optional: You could dispatch a toast event here if you had a toast system
				// dispatch('showToast', { message: 'Link copied!' });
			}
		} catch (err) {
			if (err?.name !== 'AbortError') {
				console.error('Error sharing:', err);
			}
		}
	}
</script>

<nav class="flex items-center space-x-1 sm:space-x-2" aria-label="TalkType footer">
	<button class={footerButtonClass} on:click={showAbout} aria-label="About TalkType">
		About
	</button>
	<button class={footerButtonClass} on:click={showSettings} aria-label="Open Options">
		Options
	</button>
	<button class={footerButtonClass} on:click={showHistory} aria-label="View Transcript History">
		History
	</button>
	<button
		class={footerButtonClass}
		on:click={showExtension}
		aria-label="Open Chrome Extension info"
	>
		Extension
	</button>
	<button class={footerButtonClass} on:click={shareApp} aria-label="Share TalkType"> Share </button>
</nav>

<style>
	.footer-nav-button {
		border-radius: 0.75rem;
	}

	.footer-nav-button:hover {
		background-color: var(--tt-footer-button-hover-bg);
		color: var(--tt-footer-button-hover-color);
	}

	.footer-nav-button:focus-visible {
		outline: 2px solid var(--tt-footer-focus-ring);
		outline-offset: 2px;
		background-color: var(--tt-footer-button-hover-bg);
		color: var(--tt-footer-button-hover-color);
	}
</style>
