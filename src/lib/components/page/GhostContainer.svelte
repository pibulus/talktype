<script>
	import Ghost from '$lib/components/ghost/Ghost.svelte';
	import { theme as appTheme } from '$lib';

	// Props passed from the parent
	export let isRecording = false;
	export let isProcessing = false;

	// Component references
	let ghostComponent;

	// Ghost animation methods forwarded to component
	export function pulse() {
		if (ghostComponent) {
			ghostComponent.pulse();
		}
	}

	export function startThinking() {
		if (ghostComponent) {
			ghostComponent.startThinking();
		}
	}

	export function stopThinking() {
		if (ghostComponent) {
			ghostComponent.stopThinking();
		}
	}

	export function reactToTranscript(textLength) {
		if (ghostComponent) {
			ghostComponent.reactToTranscript(textLength);
		}
	}
</script>

<!-- Ghost Icon -->
<div
	class="ghost-icon-wrapper mb-4 h-44 w-44 sm:h-48 sm:w-48 md:mb-0 md:h-56 md:w-56 lg:h-64 lg:w-64"
>
	<Ghost
		bind:this={ghostComponent}
		{isRecording}
		{isProcessing}
		externalTheme={appTheme}
		debug={false}
	/>
</div>

<style>
	/* Ghost icon wrapper styling */
	.ghost-icon-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		/* Allow glow to extend beyond container */
		overflow: visible;
		padding: 1rem; /* Add padding for glow space */
	}

	/* Recording ghost effect - enhanced contrast for accessibility */
	:global(.ghost.recording) {
		filter: drop-shadow(0 0 12px rgba(0, 180, 140, 0.85));
		/* Enhanced outline for better contrast on cream backgrounds */
		outline: 2px solid rgba(0, 120, 100, 0.4);
		outline-offset: 2px;
		border-radius: 50%;
	}
</style>
