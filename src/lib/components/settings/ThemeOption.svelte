<script>
	import { createEventDispatcher } from 'svelte';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';

	const dispatch = createEventDispatcher();

	export let vibe;
	export let index;
	export let active = false;

	function handleSelect() {
		dispatch('select');
	}
</script>

<button
	class="vibe-option relative flex flex-col items-center rounded-xl border border-pink-100 bg-[#fffdf5] p-2 shadow-sm transition-all duration-300 hover:border-pink-200 hover:shadow-md {active
		? 'selected-vibe border-pink-300 ring-2 ring-pink-200 ring-opacity-60'
		: ''}"
	data-vibe-type={vibe.id}
	on:click={handleSelect}
>
	<div class="preview-container mb-2">
		<!-- Use the original DisplayGhost component with masking -->
		<div class="preview-ghost-wrapper relative h-12 w-12">
			<div class="ghost-mask-wrapper">
				<DisplayGhost
					theme={vibe.id}
					size="48px"
					seed={index * 1000 + 12345}
					disableJsAnimation={true}
				/>
			</div>
		</div>
	</div>

	<span class="text-xs font-medium text-gray-700">{vibe.name}</span>

	{#if active}
		<div
			class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-400 text-xs text-white shadow-sm"
		>
			✓
		</div>
	{/if}
</button>

<style>
	.selected-vibe {
		box-shadow:
			0 0 0 2px rgba(249, 168, 212, 0.4),
			0 4px 8px rgba(249, 168, 212, 0.2);
	}

	/* Ghost preview styling */
	.preview-ghost-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.3s ease;
	}

	.vibe-option:hover .preview-ghost-wrapper {
		transform: scale(1.05);
	}

	/* Container for masking the ghost - hides the background */
	.ghost-mask-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: visible;
	}

	/* Apply masking to remove background from DisplayGhost */
	.ghost-mask-wrapper :global(.display-ghost) {
		overflow: visible;
	}

	/* Target only the ghost SVG, not its container */
	.ghost-mask-wrapper :global(.ghost-svg) {
		overflow: visible;
	}

	/* Hide the ghost background rectangle */
	.ghost-mask-wrapper :global(.ghost-container) {
		background: transparent;
	}

	.ghost-mask-wrapper :global(.ghost-bg) {
		/* Ensure the ghost background doesn't show */
		opacity: 1;
	}

	.vibe-option {
		transition: all 0.2s ease-in-out;
	}

	.vibe-option:hover {
		transform: translateY(-1px);
	}

	.vibe-option:active {
		transform: translateY(0px);
	}

	/* Connect the preview eyes to the main app's Brian Eno-inspired ambient blinking system */
	.preview-eyes {
		animation: preview-blink 6s infinite;
		transform-origin: center center;
	}

	/* Each theme preview has a slightly different blink timing 
	   to create an organic, non-synchronized effect */
	.vibe-option:nth-child(1) .preview-eyes {
		animation-duration: 6.7s;
		animation-delay: 0.4s;
	}

	.vibe-option:nth-child(2) .preview-eyes {
		animation-duration: 7.3s;
		animation-delay: 1.2s;
	}

	.vibe-option:nth-child(3) .preview-eyes {
		animation-duration: 5.9s;
		animation-delay: 2.3s;
	}

	.vibe-option:nth-child(4) .preview-eyes {
		animation-duration: 8.2s;
		animation-delay: 0.7s;
	}

	@keyframes preview-blink {
		0%,
		96.5%,
		100% {
			transform: scaleY(1);
		}
		97.5% {
			transform: scaleY(0); /* Closed eyes */
		}
		98.5% {
			transform: scaleY(1); /* Open eyes */
		}
	}
</style>
