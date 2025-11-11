<script>
	import '../app.css';
	import { generateAllThemeCssVariables } from '$lib/components/ghost/themeStore';

	let { children } = $props();
	const ghostThemeCss = generateAllThemeCssVariables();
</script>

<svelte:head>
	{@html `<style id="ghost-theme-vars">:root {\n${ghostThemeCss}\n}</style>`}
</svelte:head>

{@render children()}
