<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import {
		generateAllThemeCssVariables,
		ensureGhostThemeStyles
	} from '$lib/components/ghost/themeStore';

	let { children } = $props();
	const ghostThemeCss = generateAllThemeCssVariables();

	if (browser) {
		onMount(() => {
			ensureGhostThemeStyles();
		});
	}
</script>

<svelte:head>
	{@html `<style id="ghost-theme-vars">:root {\n${ghostThemeCss}\n}</style>`}
</svelte:head>

{@render children()}
