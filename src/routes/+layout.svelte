<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { env } from '$env/dynamic/public';
	import { ensureGhostThemeStyles } from '$lib/components/ghost/themeStore';
	import { modal } from '$lib/stores/modal';
	import AuthModal from '$lib/components/modals/AuthModal.svelte';
	import { GradientDefs } from '$lib/components/ghost';

	let { children } = $props();
	const DEFAULT_UMAMI_SCRIPT_URL = 'https://cloud.umami.is/script.js';
	const modals = {
		auth: AuthModal
	};
	const umamiWebsiteId = env.PUBLIC_UMAMI_WEBSITE_ID?.trim() || '';
	const umamiScriptUrl = env.PUBLIC_UMAMI_SCRIPT_URL?.trim() || DEFAULT_UMAMI_SCRIPT_URL;
	const umamiDomains = env.PUBLIC_UMAMI_DOMAINS?.trim() || 'talktype.app';
	const shouldLoadUmami =
		import.meta.env.PROD && umamiWebsiteId && env.PUBLIC_UMAMI_DISABLED !== 'true';

	// ===================================================================
	// PRE-INITIALIZE THEME CSS VARIABLES
	// This prevents ghost component from flashing during initial render
	// by ensuring all CSS variables exist BEFORE any component mounts
	// ===================================================================

	if (browser) {
		onMount(() => {
			if (shouldLoadUmami) {
				window.__talktypeUmamiExpected = true;
			}

			return ensureGhostThemeStyles();
		});
	}
</script>

<svelte:head>
	{#if shouldLoadUmami}
		<script
			defer
			src={umamiScriptUrl}
			data-website-id={umamiWebsiteId}
			data-domains={umamiDomains}
			data-do-not-track="true"
			data-exclude-search="true"
			data-exclude-hash="true"
		></script>
	{/if}
</svelte:head>

{@render children()}

{#if $modal}
	{@const ActiveModal = modals[$modal.name]}
	{#if ActiveModal}
		<ActiveModal {...$modal.props} />
	{/if}
{/if}

<!-- Global SVG definitions for ghost gradients -->
<svg style="position: absolute; width: 0; height: 0; overflow: hidden;" aria-hidden="true">
	<defs>
		<GradientDefs />
	</defs>
</svg>
