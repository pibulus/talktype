<script>
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';

	export let currentTheme;
	export let onThemeChange;
	export let isSupporter = false;
	export let openSupporterModal = () => {};

	const vibeOptions = [
		{
			id: 'peach',
			name: 'Peach'
		},
		{
			id: 'mint',
			name: 'Mint'
		},
		{
			id: 'bubblegum',
			name: 'Bubblegum'
		},
		{
			id: 'rainbow',
			name: 'Rainbow'
		}
	];

	function isThemeLocked(vibe) {
		return vibe.id === 'rainbow' && !isSupporter;
	}

	function handleThemeClick(vibe) {
		if (isThemeLocked(vibe)) {
			openSupporterModal();
			return;
		}

		onThemeChange(vibe.id);
	}
</script>

<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
	{#each vibeOptions as vibe, index}
		<button
			type="button"
			class="vibe-option relative flex flex-col items-center rounded-xl border border-pink-100 bg-[#fffdf5] p-2 shadow-sm transition-all duration-300 hover:border-pink-200 hover:shadow-md {currentTheme ===
			vibe.id
				? 'selected-vibe border-pink-300 ring-2 ring-pink-200 ring-opacity-60'
				: ''} {isThemeLocked(vibe) ? 'locked-vibe' : ''}"
			data-vibe-type={vibe.id}
			on:click={() => handleThemeClick(vibe)}
			aria-label={isThemeLocked(vibe)
				? `${vibe.name} vibe requires supporter mode`
				: `Choose ${vibe.name} vibe`}
			aria-pressed={currentTheme === vibe.id && !isThemeLocked(vibe)}
			title={isThemeLocked(vibe) ? 'Requires supporter mode' : `Choose ${vibe.name} vibe`}
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

			{#if isThemeLocked(vibe)}
				<div
					class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-xs text-white shadow-sm"
					title="Requires supporter mode"
					aria-hidden="true"
				>
					★
				</div>
			{:else if currentTheme === vibe.id}
				<div
					class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-400 text-xs text-white shadow-sm"
					aria-hidden="true"
				>
					✓
				</div>
			{/if}
		</button>
	{/each}
</div>

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

	/* FIX: Remove filters and hardware acceleration on preview ghosts to prevent "dark splotches" on iOS */
	.ghost-mask-wrapper :global(.display-ghost .ghost-container) {
		filter: none !important;
		will-change: auto !important;
		transform: none !important;
		backface-visibility: visible !important;
	}

	.vibe-option {
		transition: all 0.2s ease-in-out;
	}

	.locked-vibe {
		opacity: 0.82;
	}
</style>
