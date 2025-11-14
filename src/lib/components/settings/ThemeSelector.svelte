<script>
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { isPremium } from '$lib/services/premium/premiumService';
	import { analytics } from '$lib/services/analytics';

	export let currentTheme;
	export let onThemeChange;

	// Theme options with premium flag
	const vibeOptions = [
		{
			id: 'peach',
			name: 'Peach',
			premium: false
		},
	{
		id: 'mint',
		name: 'Mint',
		premium: false
	},
	{
		id: 'bubblegum',
		name: 'Bubblegum',
		premium: false
	},
		{
			id: 'rainbow',
			name: 'Rainbow',
			premium: true
		}
	];

	function handleThemeClick(vibe) {
		// Check if theme requires premium
		if (vibe.premium && !$isPremium) {
			// Track locked feature click
			analytics.clickLockedFeature(`theme_${vibe.id}`);

			// Show premium modal/toast
			window.dispatchEvent(
				new CustomEvent('talktype:show-premium-modal', {
					detail: { feature: 'customThemes', themeName: vibe.name }
				})
			);
			return;
		}

		onThemeChange(vibe.id);
	}
</script>

<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
	{#each vibeOptions as vibe, index}
		<button
			class="vibe-option relative flex flex-col items-center rounded-xl border border-pink-100 bg-[#fffdf5] p-2 shadow-sm transition-all duration-300 hover:border-pink-200 hover:shadow-md {currentTheme ===
			vibe.id
				? 'selected-vibe border-pink-300 ring-2 ring-pink-200 ring-opacity-60'
				: ''} {vibe.premium && !$isPremium ? 'locked' : ''}"
			data-vibe-type={vibe.id}
			on:click={() => handleThemeClick(vibe)}
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

			{#if currentTheme === vibe.id}
				<div
					class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-400 text-xs text-white shadow-sm"
				>
					✓
				</div>
			{:else if vibe.premium && !$isPremium}
				<div
					class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs shadow-sm"
					title="Premium theme"
				>
					⭐
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

	.locked {
		opacity: 0.6;
		cursor: pointer;
	}

	.locked:hover {
		opacity: 0.8;
		border-color: #f59e0b !important;
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
</style>
