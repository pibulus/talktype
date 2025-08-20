<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { ghostStore } from './unifiedGhostStore.js';
	import './ghost-animations.css';
	import ghostPathsUrl from './ghost-paths.svg?url';

	export let isRecording = false;
	export let isProcessing = false;
	export let width = '100%';
	export let height = '100%';
	export let opacity = 1;
	export let scale = 1;
	export let clickable = true;

	const dispatch = createEventDispatcher();

	let ghostSvg;
	let leftEye;
	let rightEye;
	let eyeTrackingEnabled = true;
	let blinkInterval;

	$: if (isRecording) {
		ghostStore.recording.start();
	} else {
		ghostStore.recording.stop();
	}

	$: if (isProcessing) {
		ghostStore.processing.start();
	} else {
		ghostStore.processing.stop();
	}

	function handleClick() {
		if (!clickable) return;

		dispatch('click');
		ghostStore.animations.pulse();
		ghostStore.animations.wobble('left');
	}

	function startBlinking() {
		if (!browser) return;

		const scheduleNextBlink = () => {
			const delay = Math.random() * 4000 + 2000; // 2-6 seconds
			blinkInterval = setTimeout(() => {
				ghostStore.eyes.blink();
				scheduleNextBlink();
			}, delay);
		};

		scheduleNextBlink();
	}

	function handleMouseMove(event) {
		if (!eyeTrackingEnabled || !browser || !ghostSvg) return;

		const rect = ghostSvg.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const deltaX = event.clientX - centerX;
		const deltaY = event.clientY - centerY;

		const maxMove = 15;
		const x = Math.max(-maxMove, Math.min(maxMove, deltaX * 0.02));
		const y = Math.max(-maxMove, Math.min(maxMove, deltaY * 0.02));

		ghostStore.eyes.track(x, y);

		if (leftEye && rightEye) {
			leftEye.style.transform = `translate(${x}px, ${y}px)`;
			rightEye.style.transform = `translate(${x}px, ${y}px)`;
		}
	}

	onMount(() => {
		startBlinking();

		if (browser) {
			window.addEventListener('mousemove', handleMouseMove);

			// Initial animation
			setTimeout(() => {
				ghostStore.animations.wobble('right');
			}, 500);
		}
	});

	onDestroy(() => {
		if (blinkInterval) clearTimeout(blinkInterval);
		if (browser) {
			window.removeEventListener('mousemove', handleMouseMove);
		}
		ghostStore.cleanup();
	});
</script>

<div
	class="ghost-container"
	style="width: {width}; height: {height}; opacity: {opacity}; transform: scale({scale});"
>
	<svg
		bind:this={ghostSvg}
		viewBox="0 0 300 300"
		xmlns="http://www.w3.org/2000/svg"
		class="ghost-svg {clickable ? 'clickable' : ''}"
		class:recording={$ghostStore.isRecording}
		class:processing={$ghostStore.isProcessing}
		on:click={handleClick}
		role={clickable ? 'button' : 'img'}
		aria-label={clickable ? 'Ghost assistant' : 'Ghost animation'}
		tabindex={clickable ? 0 : -1}
	>
		<defs>
			<linearGradient id="ghost-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color: var(--ghost-color-1)" />
				<stop offset="100%" style="stop-color: var(--ghost-color-2)" />
			</linearGradient>
		</defs>

		<g class="ghost-wobble-group">
			<!-- Ghost body -->
			<path
				id="ghost-shape"
				d="M150 50 C200 50 240 90 240 140 L240 200 C240 220 235 230 230 235 L225 240 C220 245 215 240 210 235 L205 230 C200 225 195 230 190 235 L185 240 C180 245 175 240 170 235 L165 230 C160 225 155 230 150 235 L145 240 C140 245 135 240 130 235 L125 230 C120 225 115 230 110 235 L105 240 C100 245 95 240 90 235 L85 230 C80 225 75 230 70 235 L60 240 L60 140 C60 90 100 50 150 50 Z"
				fill="url(#ghost-gradient)"
				stroke="#000"
				stroke-width="3"
				class="ghost-body"
			/>

			<!-- Eyes -->
			<g class="ghost-eyes" class:closed={$ghostStore.eyesClosed}>
				<ellipse
					bind:this={leftEye}
					cx="120"
					cy="120"
					rx="12"
					ry="18"
					fill="#000"
					class="ghost-eye left-eye"
				/>
				<ellipse
					bind:this={rightEye}
					cx="180"
					cy="120"
					rx="12"
					ry="18"
					fill="#000"
					class="ghost-eye right-eye"
				/>
			</g>
		</g>
	</svg>
</div>

<style>
	.ghost-container {
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.ghost-svg {
		max-width: 100%;
		max-height: 100%;
		transition: transform 0.3s ease;
	}

	.ghost-svg.clickable {
		cursor: pointer;
	}

	.ghost-svg.clickable:hover {
		transform: scale(1.05);
	}

	.ghost-body {
		transition: fill 0.3s ease;
	}

	.ghost-eyes {
		transition: opacity 0.15s ease;
	}

	.ghost-eyes.closed {
		opacity: 0;
	}

	.ghost-eye {
		transition: transform 0.1s ease;
	}

	.ghost-svg.recording .ghost-body {
		animation: recording-pulse 2s infinite;
	}

	.ghost-svg.processing .ghost-body {
		animation: processing-spin 1s infinite linear;
	}

	@keyframes recording-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	@keyframes processing-spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	:global([data-ghost-theme='peach']) {
		--ghost-color-1: #ffd4b2;
		--ghost-color-2: #ffa578;
	}

	:global([data-ghost-theme='sunset']) {
		--ghost-color-1: #ff69b4;
		--ghost-color-2: #ff1493;
	}

	:global([data-ghost-theme='ocean']) {
		--ghost-color-1: #87ceeb;
		--ghost-color-2: #4682b4;
	}

	:global([data-ghost-theme='forest']) {
		--ghost-color-1: #90ee90;
		--ghost-color-2: #228b22;
	}
</style>
