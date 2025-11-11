<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import {
		cssVariables,
		generateThemeCssVariables,
		getInitialTheme
	} from '$lib/components/ghost/themeStore';

	let { children } = $props();
	const initialThemeCss = generateThemeCssVariables(getInitialTheme());

	if (browser) {
		onMount(() => {
			let styleElement = document.getElementById('ghost-theme-vars');
			if (!styleElement) {
				styleElement = document.createElement('style');
				styleElement.id = 'ghost-theme-vars';
				document.head.appendChild(styleElement);
			}

			styleElement.textContent = `:root {\n${initialThemeCss}\n}`;

			const unsubscribe = cssVariables.subscribe((vars) => {
				if (!vars) return;
				styleElement.textContent = `:root {\n${vars}\n}`;
			});

			return () => {
				unsubscribe?.();
			};
		});
	}
</script>

<svelte:head>
	{@html `<style id="ghost-theme-vars">:root {\n${initialThemeCss}\n}</style>`}
</svelte:head>

{@render children()}
