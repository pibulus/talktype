<script>
	/**
	 * HintTooltip — the onboarding-hint primitive.
	 *
	 * A cute on-brand tooltip (chunky border, pastel, small arrow) that pops with
	 * a gentle scale-in and attaches to any element in the default slot. Show-once
	 * per `id` (localStorage), dismisses on tap/interaction anywhere on the target,
	 * and is keyboard + screen-reader friendly (role="tooltip", the wrapped control
	 * gets aria-describedby wired to the tooltip).
	 *
	 * This is the PRIMITIVE. A "tour" is just several of these chained — see the
	 * repo README, "Chaining hints into a tour". Not built tonight.
	 */
	import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
	import { charmSeen, markCharmSeen } from './charmMemory.js';

	/** Stable id for show-once memory. REQUIRED, unique per app. */
	export let id;
	/** The hint copy. */
	export let text = '';
	/** Placement relative to the wrapped element. */
	export let placement = 'bottom'; // top | bottom | left | right
	/** Delay before it appears (ms) — lets the page settle first. */
	export let delay = 500;
	/** Auto-dismiss after N ms of no interaction (0 = stay until tapped). */
	export let autoDismiss = 0;
	/** Force-show even if seen (demos / tours re-running). */
	export let force = false;

	const dispatch = createEventDispatcher();
	const tipId = `charm-hint-${Math.random().toString(36).slice(2, 8)}`;

	let visible = false;
	let wrapEl;
	let showTimer;
	let autoTimer;

	function dismiss(reason = 'interact') {
		if (!visible) return;
		visible = false;
		clearTimeout(showTimer);
		clearTimeout(autoTimer);
		markCharmSeen(id);
		dispatch('dismiss', { id, reason });
	}

	/** Public: dismiss without marking seen (for a tour that advances). */
	export function hide() {
		visible = false;
		clearTimeout(showTimer);
		clearTimeout(autoTimer);
	}

	/** Public: show it now (used by a tour controller). */
	export function reveal() {
		visible = true;
		if (autoDismiss > 0) autoTimer = setTimeout(() => dismiss('timeout'), autoDismiss);
	}

	function onInteract() {
		dismiss('interact');
	}

	onMount(async () => {
		if (!force && charmSeen(id)) return;
		showTimer = setTimeout(reveal, delay);
		// wire aria-describedby onto the first focusable/interactive child
		await tick();
		const target =
			wrapEl?.querySelector('button, a, [role="button"], input, [tabindex]') ?? wrapEl;
		if (target) target.setAttribute('aria-describedby', tipId);
	});

	onDestroy(() => {
		clearTimeout(showTimer);
		clearTimeout(autoTimer);
	});
</script>

<!-- Decorative wrapper: only listens (capture phase) to dismiss on first
     interaction. The slotted control carries the real role/label. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
	class="charm-hint-wrap"
	bind:this={wrapEl}
	role="presentation"
	on:pointerdown|capture={onInteract}
	on:keydown|capture={(e) => (e.key === 'Enter' || e.key === ' ') && onInteract()}
>
	<slot />

	{#if visible && text}
		<span
			id={tipId}
			role="tooltip"
			class="charm-hint charm-hint--{placement}"
		>
			{text}
			<span class="charm-hint-arrow" aria-hidden="true"></span>
		</span>
	{/if}
</span>

<style>
	.charm-hint-wrap {
		position: relative;
		display: inline-flex;
	}

	.charm-hint {
		position: absolute;
		z-index: var(--charm-hint-z, 400);
		max-width: var(--charm-hint-max-w, 15rem);
		white-space: normal;
		text-align: center;
		padding: 0.5rem 0.8rem;
		font-size: 0.8rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--charm-hint-ink, #6b21a8);
		background: var(--charm-hint-bg, #fff);
		/* the chunky pastel border is the whole vibe */
		border: var(--charm-hint-border, 2px solid rgba(249, 168, 212, 0.9));
		border-radius: var(--charm-hint-radius, 1rem);
		box-shadow: var(--charm-hint-shadow, 0 6px 20px rgba(249, 168, 212, 0.3));
		pointer-events: none;
		animation: charm-hint-in 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.charm-hint-arrow {
		position: absolute;
		width: 0.7rem;
		height: 0.7rem;
		background: var(--charm-hint-bg, #fff);
		border: var(--charm-hint-border, 2px solid rgba(249, 168, 212, 0.9));
		transform: rotate(45deg);
	}

	/* placements + arrow masking so the arrow reads as a solid triangle */
	.charm-hint--bottom {
		top: calc(100% + 0.7rem);
		left: 50%;
		transform: translateX(-50%);
	}
	.charm-hint--bottom .charm-hint-arrow {
		top: -0.4rem;
		left: 50%;
		margin-left: -0.35rem;
		border-right: none;
		border-bottom: none;
	}
	.charm-hint--top {
		bottom: calc(100% + 0.7rem);
		left: 50%;
		transform: translateX(-50%);
	}
	.charm-hint--top .charm-hint-arrow {
		bottom: -0.4rem;
		left: 50%;
		margin-left: -0.35rem;
		border-left: none;
		border-top: none;
	}
	.charm-hint--left {
		right: calc(100% + 0.7rem);
		top: 50%;
		transform: translateY(-50%);
	}
	.charm-hint--left .charm-hint-arrow {
		right: -0.4rem;
		top: 50%;
		margin-top: -0.35rem;
		border-left: none;
		border-bottom: none;
	}
	.charm-hint--right {
		left: calc(100% + 0.7rem);
		top: 50%;
		transform: translateY(-50%);
	}
	.charm-hint--right .charm-hint-arrow {
		left: -0.4rem;
		top: 50%;
		margin-top: -0.35rem;
		border-right: none;
		border-top: none;
	}

	@keyframes charm-hint-in {
		from {
			opacity: 0;
			transform: translateX(-50%) scale(0.8);
		}
	}
	.charm-hint--left,
	.charm-hint--right {
		animation-name: charm-hint-in-y;
	}
	@keyframes charm-hint-in-y {
		from {
			opacity: 0;
			transform: translateY(-50%) scale(0.8);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.charm-hint {
			animation: none;
		}
	}
</style>
