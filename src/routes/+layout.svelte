<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { cssVariables, generateAllThemeCssVariables } from '$lib/components/ghost/themeStore';

	let { children } = $props();
	const ghostThemeCss = generateAllThemeCssVariables();

	if (browser) {
		onMount(() => {
			let styleElement = document.getElementById('ghost-theme-vars');

			const unsubscribe = cssVariables.subscribe((vars) => {
				if (!vars) return;

				if (!styleElement) {
					styleElement = document.createElement('style');
					styleElement.id = 'ghost-theme-vars';
					document.head.appendChild(styleElement);
				}

				styleElement.textContent = `:root {\n${vars}\n}`;
			});

			return () => {
				unsubscribe();
			};
		});
	}
</script>

<svelte:head>
	{@html `<style id="ghost-theme-vars">:root {\n${ghostThemeCss}\n}</style>`}
</svelte:head>

{@render children()}
