<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { ensureGhostThemeStyles } from '$lib/components/ghost/themeStore';
	import { modal } from '$lib/stores/modal';
	import { AboutModal, AuthModal, ExtensionModal, IntroModal } from '$lib/components/modals';
	import { GradientDefs } from '$lib/components/ghost';

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
			return ensureGhostThemeStyles();
		});
	}
</script>

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
