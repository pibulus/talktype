<script>
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { AppSuffix } from '$lib/components/ui';

	const dispatch = createEventDispatcher();

	// Component props
	export let title = 'TalkType';
	export let subtitle = "Voice-to-text that doesn't suck. Spooky good, freaky fast, always free.";

	// AppSuffix configuration
	export let showAppSuffix = true;

	$: titleCharacters = Array.from(title);

	onMount(() => {
		// Set up animation sequence timing (for title/subtitle)
		const titleTimer = setTimeout(() => {
			dispatch('titleAnimationComplete');
		}, 1200); // After staggered animation

		const subtitleTimer = setTimeout(() => {
			dispatch('subtitleAnimationComplete');
		}, 2000); // After subtitle slide-in

		return () => {
			clearTimeout(titleTimer);
			clearTimeout(subtitleTimer);
		};
	});

	function getLetterDelay(index) {
		return `${0.05 + index * 0.05}s`;
	}
</script>

<!-- Typography with improved kerning and weight using font-variation-settings -->
<div class="title-container relative">
	<h1
		class="staggered-text mb-1 cursor-default select-none text-center text-5xl font-black tracking-normal [font-feature-settings:'kern'_1] [font-kerning:normal] [font-variation-settings:'wght'_900,'opsz'_32] [font-weight:900] [letter-spacing:0] sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl"
		aria-label={title}
	>
		<!-- Use aria-hidden for spans if H1 has aria-label -->
		<span class="talktype-main-word">
			{#each titleCharacters as character, index}
				<span
					class="stagger-letter"
					style={`--letter-delay:${getLetterDelay(index)}`}
					aria-hidden="true">{character}</span
				>
			{/each}
		</span>

		{#if showAppSuffix}
			<span
				class="app-suffix-container stagger-letter relative"
				style={`--letter-delay:${getLetterDelay(titleCharacters.length)}`}
			>
				<span class="suffix-wrapper">
					<AppSuffix
						color="inherit"
						size="35%"
						offsetX="-0.6em"
						offsetY="8px"
						position="bottom-right"
						customClass="title-suffix"
					/>
				</span>
			</span>
		{/if}
	</h1>
</div>

<!-- Updated subheadline with improved typography and brand voice -->
<p
	class="slide-in-subtitle mx-auto mb-6 mt-3 max-w-prose cursor-default select-none text-center text-sm font-medium leading-relaxed tracking-normal text-gray-600 sm:mb-7 sm:mt-6 sm:text-lg sm:font-normal sm:text-gray-700/85 md:text-xl lg:text-2xl"
>
	{subtitle}
</p>

<style>
	/* Staggered text animation for title - more reliable approach */
	.staggered-text {
		opacity: 1;
		font-feature-settings: 'kern' 1;
		font-kerning: normal;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.stagger-letter {
		display: inline-block;
		opacity: 0;
		transform: translateY(15px) translateZ(0);
		animation: staggerFadeIn 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards;
		animation-delay: var(--letter-delay, 0s);
		will-change: transform, opacity;
		backface-visibility: hidden;
	}

	@keyframes staggerFadeIn {
		0% {
			opacity: 0;
			transform: translateY(15px) translateZ(0);
		}
		100% {
			opacity: 1;
			transform: translateY(0) translateZ(0);
		}
	}

	/* Slide-in animation for subtitle - with hardware acceleration for performance */
	.slide-in-subtitle {
		opacity: 0;
		transform: translateY(10px);
		animation: slideIn 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
		animation-delay: 0.6s;
		will-change: transform, opacity;
		backface-visibility: hidden;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		font-feature-settings: 'kern' 1;
		font-kerning: normal;
		max-inline-size: 40ch;
		text-wrap: balance;
		line-height: 1.4;
	}

	@keyframes slideIn {
		0% {
			opacity: 0;
			transform: translateY(10px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Main container for title to help with centering */
	.title-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
	}

	/* Container to visually center the main "TalkType" word */
	.talktype-main-word {
		display: inline-block;
		position: relative;
	}

	/* App suffix container styling */
	.app-suffix-container {
		display: inline-block;
		width: 0;
		height: 0;
		overflow: visible;
	}

	/* Suffix wrapper for precise positioning */
	.suffix-wrapper {
		position: absolute;
		display: inline-block;
		bottom: 0;
		right: 0.25em; /* Positioned more to the left under the 'pe' */
		z-index: 1;
	}

	/* Simple styles for the suffix in title context */
	:global(.title-suffix) {
		letter-spacing: 0;
		font-variation-settings: inherit;
	}

	/* Media queries for mobile optimization */
	@media (max-width: 640px) {
		h1.staggered-text {
			font-size: 3rem;
			line-height: 1.1;
		}

		/* Adjust suffix for tablet screens */
		.suffix-wrapper {
			transform: scale(0.98);
		}

		/* No need for major mobile overrides anymore */

		.slide-in-subtitle {
			max-inline-size: 28ch;
			font-size: 1rem; /* 16px on mobile as requested */
			line-height: 1.6;
			text-wrap: balance;
		}
	}

	/* Small mobile adjustments */
	@media (max-width: 480px) {
		/* Further adjust suffix for small screens */
		.suffix-wrapper {
			transform: scale(0.95);
			right: 0.05em;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.stagger-letter,
		.slide-in-subtitle {
			opacity: 1;
			transform: none;
			animation: none;
			will-change: auto;
		}
	}
</style>
