<script>
	/**
	 * AppSuffix Component
	 *
	 * A small tag-like suffix that appears adjacent to a product name,
	 * designed to feel like a printed label rather than a continuation of the title.
	 *
	 * Self-contained: the active theme's gradient is driven entirely by the
	 * --app-suffix-* tokens defined per theme in app.css (html[data-theme]).
	 */

	// Props with defaults
	export let color = 'inherit'; // Default: inherit from parent
	export let size = '35%'; // Default: 35% of parent size (smaller suffix)
	export let customClass = ''; // Optional additional classes
	export let offsetX = '-0.2em'; // Horizontal positioning
	export let offsetY = '6px'; // Vertical positioning
	export let position = 'bottom-right'; // Position preset
</script>

<span
	class="app-suffix {customClass} {position}"
	style="--suffix-color: {color}; --suffix-size: {size}; --offset-x: {offsetX}; --offset-y: {offsetY};"
	aria-hidden="true"
>
	<span class="app-text" data-text=".app">.app</span>
</span>

<style>
	.app-suffix {
		display: inline-block;
		color: var(--suffix-color, inherit);
		font-size: var(--suffix-size, 30%);
		font-weight: 700;
		line-height: 1;
		letter-spacing: 0;
		font-kerning: normal;
		position: absolute;
		bottom: 0.15em;
		right: -0.35em;
		margin-left: 0;
		font-family: inherit;
		font-variation-settings: inherit;
		transform: translateY(var(--offset-y, 0));
		opacity: 0.95;
		z-index: 1;
		filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.12));
	}

	.app-text {
		/* Active theme drives the gradient via tokens (app.css per data-theme) */
		background-image: var(--app-suffix-gradient, linear-gradient(to bottom right, #ff82ca, #ffb060));
		background-size: var(--app-suffix-bg-size, auto);
		animation: var(--app-suffix-anim, none);
		background-clip: text !important;
		-webkit-background-clip: text !important;
		color: transparent !important;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.03);
		transition:
			filter 0.2s ease,
			transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
		display: inline-block;
		position: relative;
		transform-origin: center;
		padding: 0.1em 0; /* Add some padding for hover effect */
		transform: translateZ(0);
		backface-visibility: hidden;
	}

	@keyframes rainbow-shift {
		0% {
			background-position: 0% center;
		}
		100% {
			background-position: 200% center;
		}
	}

	/* Playful hover effects */
	.app-suffix:hover .app-text {
		filter: brightness(1.05) saturate(1.05);
		transform: rotate(-2deg) scale(1.05);
	}

	/* Position variations */
	/* Bottom positions */
	.bottom-right,
	.bottom-left {
		bottom: -0.92em;
	}

	/* Top positions */
	.top-right,
	.top-left {
		top: -0.5em;
		bottom: auto;
	}

	/* Right positions */
	.bottom-right,
	.top-right {
		right: var(--offset-x, -0.2em);
	}

	/* Left positions */
	.bottom-left,
	.top-left {
		left: var(--offset-x, -0.2em);
		right: auto;
	}

	/* Simple responsive adjustments */
	@media (max-width: 640px) {
		.app-suffix {
			font-size: calc(var(--suffix-size) * 0.95);
		}
	}

	@media (max-width: 480px) {
		.app-suffix {
			font-size: calc(var(--suffix-size) * 0.9);
		}

		.bottom-right,
		.bottom-left {
			bottom: -0.8em;
		}

		.top-right,
		.top-left {
			top: -0.48em;
		}
	}

	@media (min-width: 1024px) {
		.bottom-right,
		.bottom-left {
			bottom: -0.8em;
		}

		.top-right,
		.top-left {
			top: -0.52em;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.app-text {
			animation: none;
		}

		.app-suffix:hover .app-text {
			transform: none;
		}
	}
</style>
