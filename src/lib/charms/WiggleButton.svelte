<script>
	/**
	 * WiggleButton — the "push me" attention charm.
	 *
	 * Wraps any button/icon and gives it a periodic, gentle wiggle to draw the
	 * eye, plus an optional tiny tooltip label ("tap to copy" energy). It STOPS
	 * for good after the first interaction (localStorage-remembered per `id`)
	 * because a charm that never quits is a nag. Respects prefers-reduced-motion
	 * with a static highlight pulse fallback, and never blocks the click.
	 *
	 * It renders a <span> wrapper, not the button — you keep your own real
	 * button/element inside the default slot with all its own handlers. This
	 * charm only decorates and listens for the first pointer/keyboard activation.
	 */
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { charmSeen, markCharmSeen, prefersReducedMotion } from './charmMemory.js';

	/** Stable id for the show-once memory. REQUIRED and must be unique per app. */
	export let id;
	/** ms between wiggles. Longer = calmer. */
	export let interval = 4200;
	/** ms the wiggle animation itself runs each cycle. */
	export let duration = 900;
	/** peak scale of the squish (1.0 = none). 1.05–1.12 feels alive, not manic. */
	export let amplitude = 1.08;
	/** Optional tooltip text. Empty = no tooltip, just motion. */
	export let label = '';
	/** Where the tooltip sits relative to the wrapper. */
	export let tooltipPlacement = 'bottom'; // top | bottom | left | right
	/** Force it on even if seen (demos). */
	export let force = false;
	/** Let the caller pause it (e.g. while a modal is open). */
	export let paused = false;

	const dispatch = createEventDispatcher();

	let active = false; // is the charm currently allowed to run?
	let wiggling = false; // is a wiggle cycle mid-flight right now?
	let showTip = false;
	let reduced = false;
	let timer;

	function scheduleNext() {
		clearTimeout(timer);
		if (!active || paused) return;
		timer = setTimeout(() => {
			if (!active || paused) return;
			// reduced-motion: no keyframe wiggle, just re-assert the static pulse.
			if (!reduced) {
				wiggling = true;
				setTimeout(() => (wiggling = false), duration);
			}
			scheduleNext();
		}, interval);
	}

	/** Called the moment the user engages the wrapped control — quiet forever. */
	export function acknowledge() {
		if (!active) return;
		active = false;
		wiggling = false;
		showTip = false;
		clearTimeout(timer);
		markCharmSeen(id);
		dispatch('acknowledge', { id });
	}

	function onFirstInteract() {
		acknowledge();
	}

	onMount(() => {
		reduced = prefersReducedMotion();
		if (force || !charmSeen(id)) {
			active = true;
			showTip = !!label;
			scheduleNext();
		}
	});

	onDestroy(() => clearTimeout(timer));

	// react to pause toggling without restarting the whole charm
	$: if (active && !paused) scheduleNext();
	$: if (paused) clearTimeout(timer);
</script>

<!-- Decorative wrapper: it only listens (capture phase) to quiet the charm on
     first use. The real interactive element is the slotted control, which keeps
     its own role/label — so this span is presentational. -->
<span
	class="charm-wiggle"
	class:is-wiggling={wiggling}
	class:is-active={active && !reduced}
	class:is-reduced={active && reduced}
	role="presentation"
	style="--charm-wiggle-amp: {amplitude}; --charm-wiggle-dur: {duration}ms;"
	on:pointerdown|capture={onFirstInteract}
	on:keydown|capture={(e) => (e.key === 'Enter' || e.key === ' ') && onFirstInteract()}
>
	<slot />

	{#if showTip && label}
		<span class="charm-wiggle-tip charm-wiggle-tip--{tooltipPlacement}" role="status">
			{label}
			<span class="charm-wiggle-tip-arrow" aria-hidden="true"></span>
		</span>
	{/if}
</span>

<style>
	.charm-wiggle {
		position: relative;
		display: inline-flex;
		/* never eat the click — the wrapper is transparent to pointer intent,
		   the wrapped control keeps its own hit area */
		transform-origin: center;
	}

	/* the wiggle rides on an inner transform so the slotted element can keep
	   its own transforms (hover:scale etc.) via the child, not the wrapper */
	.charm-wiggle.is-wiggling {
		animation: charm-wiggle-squish var(--charm-wiggle-dur, 900ms) cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes charm-wiggle-squish {
		0%,
		100% {
			transform: scale(1) rotate(0deg);
		}
		30% {
			transform: scale(var(--charm-wiggle-amp, 1.08)) rotate(-2.5deg);
		}
		55% {
			transform: scale(calc(2 - var(--charm-wiggle-amp, 1.08))) rotate(2deg);
		}
		78% {
			transform: scale(calc(1 + (var(--charm-wiggle-amp, 1.08) - 1) * 0.5)) rotate(-1deg);
		}
	}

	/* Reduced-motion: no wiggle, a calm static highlight ring instead. */
	.charm-wiggle.is-reduced::after {
		content: '';
		position: absolute;
		inset: -6px;
		border-radius: 9999px;
		box-shadow: 0 0 0 2px var(--charm-accent, rgba(249, 168, 212, 0.55));
		pointer-events: none;
	}

	/* tiny on-brand tooltip */
	.charm-wiggle-tip {
		position: absolute;
		z-index: var(--charm-tip-z, 250);
		white-space: nowrap;
		padding: 0.3rem 0.65rem;
		font-size: 0.72rem;
		font-weight: 600;
		line-height: 1;
		color: var(--charm-tip-ink, #6b21a8);
		background: var(--charm-tip-bg, #ffffff);
		border-radius: 9999px;
		box-shadow: var(--charm-tip-shadow, 0 4px 14px rgba(0, 0, 0, 0.12));
		pointer-events: none;
		animation: charm-tip-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.charm-wiggle-tip-arrow {
		position: absolute;
		width: 0.55rem;
		height: 0.55rem;
		background: var(--charm-tip-bg, #ffffff);
		transform: rotate(45deg);
	}

	.charm-wiggle-tip--bottom {
		top: calc(100% + 0.55rem);
		left: 50%;
		transform: translateX(-50%);
	}
	.charm-wiggle-tip--bottom .charm-wiggle-tip-arrow {
		top: -0.22rem;
		left: 50%;
		margin-left: -0.275rem;
	}
	.charm-wiggle-tip--top {
		bottom: calc(100% + 0.55rem);
		left: 50%;
		transform: translateX(-50%);
	}
	.charm-wiggle-tip--top .charm-wiggle-tip-arrow {
		bottom: -0.22rem;
		left: 50%;
		margin-left: -0.275rem;
	}
	.charm-wiggle-tip--left {
		right: calc(100% + 0.55rem);
		top: 50%;
		transform: translateY(-50%);
	}
	.charm-wiggle-tip--left .charm-wiggle-tip-arrow {
		right: -0.22rem;
		top: 50%;
		margin-top: -0.275rem;
	}
	.charm-wiggle-tip--right {
		left: calc(100% + 0.55rem);
		top: 50%;
		transform: translateY(-50%);
	}
	.charm-wiggle-tip--right .charm-wiggle-tip-arrow {
		left: -0.22rem;
		top: 50%;
		margin-top: -0.275rem;
	}

	@keyframes charm-tip-in {
		from {
			opacity: 0;
			transform: translateX(-50%) scale(0.85);
		}
	}
	.charm-wiggle-tip--left,
	.charm-wiggle-tip--right {
		animation-name: charm-tip-in-y;
	}
	@keyframes charm-tip-in-y {
		from {
			opacity: 0;
			transform: translateY(-50%) scale(0.85);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.charm-wiggle.is-wiggling {
			animation: none;
		}
		.charm-wiggle-tip {
			animation: none;
		}
	}
</style>
