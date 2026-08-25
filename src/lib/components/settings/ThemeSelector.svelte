<script>
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { soundService } from '$lib/services/infrastructure/soundService.js';

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
			soundService.locked();
			openSupporterModal();
			return;
		}

		soundService.select();
		onThemeChange(vibe.id);
	}
</script>

<div class="grid grid-cols-4 gap-2" role="group" aria-label="Vibe">
	{#each vibeOptions as vibe, index}
		<button
			type="button"
			class="vibe-option relative flex min-h-[72px] flex-col items-center justify-center rounded-xl p-1.5 transition-all duration-150 {currentTheme ===
			vibe.id
				? 'selected-vibe -translate-y-0.5 border-2 border-gray-900 bg-white shadow-[3px_3px_0px_#1e1714]'
				: 'hover:shadow-xs border-2 border-gray-200/90 bg-[#fffdf5] hover:border-gray-900/60'} {isThemeLocked(
				vibe
			)
				? 'locked-vibe'
				: ''}"
			data-vibe-type={vibe.id}
			on:click={() => handleThemeClick(vibe)}
			aria-label={isThemeLocked(vibe)
				? `${vibe.name} vibe requires supporter mode`
				: `Choose ${vibe.name} vibe`}
			aria-pressed={currentTheme === vibe.id && !isThemeLocked(vibe)}
			title={isThemeLocked(vibe) ? 'Supporter' : vibe.name}
		>
			<div class="preview-container mb-1">
				<!-- Use the original DisplayGhost component with masking -->
				<div class="preview-ghost-wrapper relative h-8 w-8">
					<div class="ghost-mask-wrapper">
						<DisplayGhost
							theme={vibe.id}
							size="32px"
							seed={index * 1000 + 12345}
							disableJsAnimation={true}
						/>
					</div>
				</div>
			</div>

			<span
				class="text-xs {currentTheme === vibe.id
					? 'font-black text-gray-900'
					: 'font-bold text-gray-700'} leading-tight">{vibe.name}</span
			>

			{#if isThemeLocked(vibe)}
				<div
					class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-900 bg-amber-400 text-xs font-black text-gray-900 shadow-[1px_1px_0px_#1e1714]"
					title="Supporter"
					aria-hidden="true"
				>
					★
				</div>
			{:else if currentTheme === vibe.id}
				<div
					class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-gray-900 bg-pink-400 text-[10px] font-black text-gray-900 shadow-[1px_1px_0px_#1e1714]"
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
		box-shadow: 3px 3px 0px #1e1714;
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
