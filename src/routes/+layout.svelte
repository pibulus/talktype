<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { cssVariables } from '$lib/components/ghost/themeStore';
	import { modal } from '$lib/stores/modal';
	import { AboutModal, AuthModal, ExtensionModal, IntroModal } from '$lib/components/modals';

	let { children } = $props();

	const modals = {
		about: AboutModal,
		auth: AuthModal,
		extension: ExtensionModal,
		intro: IntroModal
	};

	// ===================================================================
	// PRE-INITIALIZE THEME CSS VARIABLES
	// This prevents ghost component from flashing during initial render
	// by ensuring all CSS variables exist BEFORE any component mounts
	// ===================================================================

	if (browser) {
		onMount(() => {
			let styleElement = document.getElementById('ghost-theme-vars');

			const unsubscribe = cssVariables.subscribe((vars) => {
				if (!vars) return;

				// Create or update style element with theme CSS variables
				if (!styleElement) {
					styleElement = document.createElement('style');
					styleElement.id = 'ghost-theme-vars';
					document.head.appendChild(styleElement);
				}

				styleElement.textContent = `:root {\n${vars}\n}`;
			});

			// Cleanup subscription on unmount
			return () => {
				unsubscribe();
			};
		});
	}
</script>

{@render children()}

{#if $modal}
	<svelte:component this={modals[$modal.name]} {...$modal.props} />
{/if}

