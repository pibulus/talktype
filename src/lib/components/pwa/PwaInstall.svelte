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
	install-description="Install TalkType for the best experience. It's free, private, and looks great."
></pwa-install>

<style>
	/* Custom styling to match TalkType theme */
	pwa-install {
		--pwa-install-font-family: 'Inter', sans-serif;
		--pwa-install-button-color: #f472b6; /* pink-400 */
		--pwa-install-button-text-color: #ffffff;
	}
</style>
