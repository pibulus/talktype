<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import ghostService from './ghostService.js';

	export let isRecording = false;
	export let isProcessing = false;

	const dispatch = createEventDispatcher();

	let eyesElement;
	let mounted = false;

	// React to recording state changes
	$: if (mounted && isRecording) {
		ghostService.startRecording();
	} else if (mounted && !isRecording && !isProcessing) {
		ghostService.stopRecording();
	}

	// React to processing state changes
	$: if (mounted && isProcessing) {
		ghostService.startProcessing();
	} else if (mounted && !isProcessing && !isRecording) {
		ghostService.stopProcessing();
	}

	function handleClick() {
		dispatch('toggleRecording');
	}

	onMount(() => {
		// Initialize ghost service with eyes element
		if (eyesElement) {
			ghostService.init(eyesElement, { debug: false });
		}
		mounted = true;
	});

	onDestroy(() => {
		ghostService.destroy();
	});
</script>

<div
	class="ghost-container"
	on:click={handleClick}
	on:keydown={(e) => e.key === 'Enter' && handleClick()}
	role="button"
	tabindex="0"
	aria-label="Toggle Recording"
>
	<div class="icon-layers">
		<!-- Gradient background -->
		<svg class="icon-bg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="ghostGradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:#FFB6C1;stop-opacity:1" />
					<stop offset="50%" style="stop-color:#FFC0CB;stop-opacity:1" />
					<stop offset="100%" style="stop-color:#FFD4E5;stop-opacity:1" />
				</linearGradient>
			</defs>
			<circle cx="100" cy="100" r="90" fill="url(#ghostGradient)" />
		</svg>

		<!-- Ghost outline -->
		<svg class="icon-base" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M100 30 C130 30, 160 55, 160 90 L160 140 C160 145, 155 150, 150 150 L140 140 L130 150 L120 140 L110 150 L100 140 L90 150 L80 140 L70 150 L60 140 L50 150 C45 150, 40 145, 40 140 L40 90 C40 55, 70 30, 100 30 Z"
				fill="none"
				stroke="#333"
				stroke-width="3"
			/>
		</svg>

		<!-- Eyes -->
		<svg
			bind:this={eyesElement}
			class="icon-eyes"
			viewBox="0 0 200 200"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle cx="75" cy="80" r="8" fill="#333" />
			<circle cx="125" cy="80" r="8" fill="#333" />
		</svg>
	</div>
</div>

<style>
	.ghost-container {
		width: 100%;
		height: 100%;
		cursor: pointer;
		filter: drop-shadow(0 0 8px rgba(255, 156, 243, 0.15));
		transition: all 0.3s ease;
	}

	.ghost-container:hover {
		filter: drop-shadow(0 0 18px rgba(249, 168, 212, 0.45))
			drop-shadow(0 0 30px rgba(255, 156, 243, 0.3));
		transform: scale(1.03);
	}

	.icon-layers {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.icon-bg,
	.icon-base,
	.icon-eyes {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.icon-bg {
		z-index: 1;
	}

	.icon-base {
		z-index: 2;
	}

	.icon-eyes {
		z-index: 3;
		transform-origin: center center;
	}

	/* Blink animations */
	:global(.icon-eyes.blink-once) {
		animation: blink-once 0.4s forwards !important;
	}

	@keyframes blink-once {
		0%,
		30% {
			transform: scaleY(1);
		}
		50% {
			transform: scaleY(0);
		}
		70%,
		100% {
			transform: scaleY(1);
		}
	}

	:global(.icon-eyes.recording) {
		animation: blink-thinking 4s infinite;
	}

	:global(.icon-eyes.processing) {
		animation: blink-thinking-hard 1.5s infinite;
	}

	@keyframes blink-thinking {
		0%,
		20%,
		100% {
			transform: scaleY(1);
		}
		3% {
			transform: scaleY(0);
		}
		6% {
			transform: scaleY(1);
		}
		40% {
			transform: scaleY(1);
		}
		43% {
			transform: scaleY(0);
		}
		48% {
			transform: scaleY(0);
		}
		50% {
			transform: scaleY(1);
		}
		75% {
			transform: scaleY(1);
		}
		78% {
			transform: scaleY(0);
		}
		81% {
			transform: scaleY(1);
		}
	}

	@keyframes blink-thinking-hard {
		0%,
		10%,
		50%,
		60% {
			transform: scaleY(1);
		}
		12%,
		48% {
			transform: scaleY(0);
		}
		90%,
		100% {
			transform: scaleY(0.2);
		}
	}
</style>
