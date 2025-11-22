<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { ANIMATION } from '$lib/constants';

	export let targetSelector = null;
	export let duration = ANIMATION.CONFETTI.ANIMATION_DURATION;
	export let colors = ANIMATION.CONFETTI.COLORS;
	export let particleCount = ANIMATION.CONFETTI.PIECE_COUNT;

	const dispatch = createEventDispatcher();

	let pieces = [];
	let origin = { x: 50, y: 15 };
	let timeoutId;

	onMount(() => {
		updateOrigin();
		pieces = Array.from({ length: particleCount }, (_, index) => createPiece(index));

		timeoutId = setTimeout(() => {
			dispatch('complete');
		}, duration);
	});

	onDestroy(() => {
		if (timeoutId) clearTimeout(timeoutId);
	});

	function updateOrigin() {
		if (!targetSelector || typeof document === 'undefined') {
			return;
		}

		const targetElement = document.querySelector(targetSelector);
		if (!targetElement) return;

		const rect = targetElement.getBoundingClientRect();
		const windowWidth = window.innerWidth || 1;
		const windowHeight = window.innerHeight || 1;

		origin = {
			x: ((rect.left + rect.width / 2) / windowWidth) * 100,
			y: (Math.max(rect.top, 40) / windowHeight) * 100
		};
	}

	function createPiece(id) {
		return {
			id,
			color: colors[id % colors.length],
			delay: Math.random() * 0.2,
			duration: 0.9 + Math.random() * 0.9,
			drift: (Math.random() - 0.5) * 40,
			offset: (Math.random() - 0.5) * 12,
			rotateStart: Math.random() * 360,
			rotateEnd: Math.random() * 720
		};
	}
</script>

<div class="confetti-overlay" aria-hidden="true">
	{#each pieces as piece (piece.id)}
		<span
			class="confetti-piece"
			style={`--origin-x:${origin.x}; --origin-y:${origin.y}; --offset-x:${piece.offset}; --drift:${piece.drift}; --delay:${piece.delay}s; --duration:${piece.duration}s; --rotate-start:${piece.rotateStart}deg; --rotate-end:${piece.rotateEnd}deg; background:${piece.color};`}
		></span>
	{/each}
</div>

<style>
	.confetti-overlay {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 1000;
		overflow: hidden;
	}

	.confetti-piece {
		position: absolute;
		top: 0;
		left: 0;
		width: 8px;
		height: 14px;
		border-radius: 2px;
		opacity: 0;
		will-change: transform, opacity;
		animation: confettiFall var(--duration) ease-out forwards;
		animation-delay: var(--delay);
		transform: translate(
				calc(var(--origin-x) * 1vw),
				calc(var(--origin-y) * 1vh)
			)
			rotate(var(--rotate-start));
	}

	@media (prefers-reduced-motion: reduce) {
		.confetti-piece {
			display: none;
		}
	}

	@keyframes confettiFall {
		0% {
			opacity: 1;
			transform: translate(
					calc(var(--origin-x) * 1vw + var(--offset-x) * 0.1vw),
					calc(var(--origin-y) * 1vh)
				)
				rotate(var(--rotate-start));
		}

		100% {
			opacity: 0;
			transform: translate(
					calc((var(--origin-x) + var(--offset-x)) * 1vw + var(--drift) * 0.1vw),
					calc(var(--origin-y) * 1vh + 40vh)
				)
				rotate(var(--rotate-end));
		}
	}
</style>
