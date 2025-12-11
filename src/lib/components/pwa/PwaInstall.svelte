<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	import { installPromptEvent } from '$lib/stores/pwa';

	let pwaInstallRef;

	onMount(async () => {
		if (browser) {
			// Dynamic import to avoid SSR issues with web components
			await import('@khmyznikov/pwa-install');
		}
	});

	// Pass the captured event to the component if it exists
	$: if (pwaInstallRef && $installPromptEvent) {
		pwaInstallRef.externalPromptEvent = $installPromptEvent;
	}

	export function showDialog() {
		if (pwaInstallRef) {
			pwaInstallRef.showDialog(true);
		}
	}

	export function hideDialog() {
		if (pwaInstallRef) {
			pwaInstallRef.hideDialog();
		}
	}
</script>

<pwa-install
	bind:this={pwaInstallRef}
	manual-apple="true"
	manual-chrome="true"
	disable-chrome="true"
	manifest-url="/manifest.json"
	install-description="Keep your ghost handy. 👻&#10;&#10;Add TalkType to your home screen. One tap and you’re talking — no browser, no search, just your words and your vibe.&#10;&#10;It’s fast, it’s private, and it works offline."
	styles={{ '--tint-color': '#f472b6' }}
></pwa-install>

<style>
	/* Custom styling to match TalkType theme */
	pwa-install {
		--pwa-install-font-family: 'Inter', sans-serif;
		--pwa-install-button-color: #f472b6; /* pink-400 */
		--pwa-install-button-text-color: #ffffff;
	}
</style>
