<script>
	import { onMount, onDestroy } from 'svelte';
	import { appActive, waveformData } from '$lib/services/infrastructure';
	import { createAnimationController } from '$lib/utils/performanceUtils';
	import { clampLevel, getAudioDisplayLevel } from '$lib/utils/audioLevel.js';

	// Audio visualization configuration
	let audioLevel = 0;
	let history = []; // Array to store audio level history
	const historyLength = 30; // Number of bars to display in history
	let recording = false;
	let smoothedLevel = 0;
	const idleBaseLevel = 2.5;

	// Reactive animation state
	$: animationsEnabled = $appActive;

	// CSS class to control animation state
	$: animationClass = animationsEnabled ? 'animations-enabled' : 'animations-paused';

	// ===== SIMULATED LEVELS (analyser-blind rescue only) =====
	// When the AudioContext is suspended (audioService publishes null waveform
	// data), the analyser is blind but MediaRecorder keeps capturing. Rather
	// than a dead-looking flat line for a working recording, we synthesize a
	// gentle speech-like pattern. This NEVER runs while real data is flowing —
	// real silence shows honest low bars.
	let lastLevel = 20;
	let trend = 0;
	let peakCountdown = 0;
	let silenceCountdown = 0;

	function nextSimulatedLevel() {
		if (peakCountdown <= 0) {
			if (Math.random() < 0.1) {
				lastLevel = 60 + Math.random() * 30;
				peakCountdown = 5 + Math.floor(Math.random() * 5);
				silenceCountdown = 0;
			} else if (Math.random() < 0.3) {
				lastLevel = 40 + Math.random() * 25;
				peakCountdown = 3 + Math.floor(Math.random() * 3);
				silenceCountdown = 0;
			} else if (Math.random() < 0.4) {
				lastLevel = 5 + Math.random() * 10;
				silenceCountdown = 4 + Math.floor(Math.random() * 4);
			} else {
				lastLevel = 20 + Math.random() * 25;
				peakCountdown = 2 + Math.floor(Math.random() * 2);
			}
			trend = Math.random() < 0.5 ? -1 : 1;
		}

		if (silenceCountdown > 0) {
			lastLevel = Math.max(5, lastLevel * 0.8);
			silenceCountdown--;
		}

		const breathEffect = Math.sin(Date.now() / 400) * 5;
		lastLevel += trend * (Math.random() * 4 - 1);
		lastLevel = Math.max(5, Math.min(90, lastLevel));
		peakCountdown--;

		return Math.max(5, Math.min(90, lastLevel + breathEffect + (Math.random() * 6 - 3)));
	}

	// ===== DEAD-MIC NUDGE =====
	// The bars honestly show a silent mic, but nothing TELLS the user. Track
	// consecutive processed frames of true silence (real analyser data only —
	// dataArray === null means the analyser is blind, not that the mic is dead)
	// and nudge once after ~8s (~20 processed frames/sec at the current cadence).
	const SILENT_NUDGE_FRAMES = 160;
	const SILENT_LEVEL = 2;
	let silentFrames = 0;
	let nudgeFired = false;

	function trackSilence(level) {
		if (level >= SILENT_LEVEL) {
			silentFrames = 0;
			nudgeFired = false;
			return;
		}
		silentFrames++;
		if (!nudgeFired && silentFrames >= SILENT_NUDGE_FRAMES) {
			nudgeFired = true;
			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: { type: 'info', message: "Can't hear you — check your mic?" }
				})
			);
		}
	}

	// ===== VISUALIZER UPDATE LOGIC (real analyser data from audioService) =====
	let frameSkipCounter = 0;
	const frameSkipRate = 2; // Process every 3rd frame — smooths bars and saves work

	function getIdleLevel() {
		return idleBaseLevel + Math.sin(Date.now() / 900) * 0.8;
	}

	function pushVisualizerLevel(level) {
		history = [clampLevel(level), ...history];
		if (history.length > historyLength) {
			history.pop();
		}
	}

	function smoothVisualizerLevel(targetLevel) {
		const factor = targetLevel > smoothedLevel ? 0.28 : 0.16;
		smoothedLevel += (targetLevel - smoothedLevel) * factor;
		return smoothedLevel;
	}

	// Create optimized animation controller that auto-pauses when tab is hidden
	const visualizerAnimation = createAnimationController(() => {
		if (!recording) return;

		// Skip frames to slow down the animation
		if (frameSkipCounter < frameSkipRate) {
			frameSkipCounter++;
			return;
		}
		frameSkipCounter = 0;

		const dataArray = $waveformData;

		// null = analyser is blind (suspended AudioContext) but recording is
		// live — show the simulated pattern instead of a dead flat line.
		if (dataArray === null) {
			audioLevel = smoothVisualizerLevel(nextSimulatedLevel());
			pushVisualizerLevel(audioLevel);
			return;
		}

		if (!dataArray || dataArray.length === 0) {
			audioLevel = smoothVisualizerLevel(getIdleLevel());
			pushVisualizerLevel(audioLevel);
			return;
		}

		const realLevel = getAudioDisplayLevel(dataArray);
		trackSilence(realLevel);
		const targetLevel = Math.max(realLevel, 1.5);
		audioLevel = smoothVisualizerLevel(targetLevel);
		pushVisualizerLevel(audioLevel);
	});

	// ===== LIFECYCLE HOOKS =====
	onMount(() => {
		recording = true;
		smoothedLevel = 0;
		history = Array(historyLength).fill(0);
		visualizerAnimation.start();
	});

	onDestroy(() => {
		recording = false;
		visualizerAnimation.stop();
		visualizerAnimation.destroy();
	});
</script>

<div class="history-container standard-container {animationClass}">
	{#each history as level, index (index)}
		<div
			class="history-bar"
			style="height: {level}%; width: {100 / historyLength}%; left: {index *
				(100 / historyLength)}%"
		></div>
	{/each}
</div>

<style>
	.history-container {
		position: relative;
		width: 100%;
		height: 5rem;
		display: flex;
		flex-direction: row-reverse;
		border-radius: 1rem;
		overflow: hidden;
		box-shadow: inset 0 0 15px rgba(249, 168, 212, 0.15);
		background: linear-gradient(to bottom, rgba(255, 255, 255, 0.5), rgba(255, 242, 248, 0.2));
		contain: content;
	}
	.history-bar {
		position: absolute;
		bottom: 0;
		/* Default peach gradient as fallback */
		background: linear-gradient(to top, #ffa573, #ff9f9a, #ff7fcd, #ffb6f3);
		transition: height 0.15s ease-in-out;
		border-radius: 3px 3px 0 0;
		margin-right: 1px; /* Add slight margin to prevent white line gaps */
		box-shadow: 0 0 8px rgba(249, 168, 212, 0.2); /* Subtle glow on bars */
		opacity: 0.95;
		will-change: transform;
		transform: translateZ(0);
		backface-visibility: hidden;
	}

	/* Theme-specific gradient styles - directly applied based on data-theme */
	:global([data-theme='peach'] .history-bar) {
		background: linear-gradient(to top, #ffa573, #ff9f9a, #ff7fcd, #ffb6f3);
	}

	:global([data-theme='mint'] .history-bar) {
		background: linear-gradient(to top, #86efac, #5eead4, #67e8f9);
	}

	:global([data-theme='bubblegum'] .history-bar) {
		background: linear-gradient(to top, #20c5ff, #4d7bff, #c85aff, #ee45f0, #ff3ba0, #ff1a8d);
	}

	:global([data-theme='rainbow'] .history-bar) {
		animation:
			hueShift 9.1s linear infinite,
			rainbowBars 3s ease-in-out infinite;
		background-image: linear-gradient(
			to top,
			#ff3d7f,
			#ff8d3c,
			#fff949,
			#4dff60,
			#35deff,
			#9f7aff,
			#ff3d7f
		);
		background-size: 100% 600%;
		box-shadow:
			0 0 8px rgba(255, 255, 255, 0.15),
			0 0 10px rgba(255, 156, 227, 0.1);
		will-change: transform, opacity;
		transform: translateZ(0);
		backface-visibility: hidden;
		background-position: 0% 0%;
	}

	/* Svelte-controlled animation states */
	:global(.animations-enabled [data-theme='rainbow'] .history-bar) {
		animation-play-state: running;
	}

	:global(.animations-paused [data-theme='rainbow'] .history-bar) {
		animation-play-state: paused;
	}

	/* Special animation for rainbow theme bars */
	@keyframes rainbowBars {
		0%,
		100% {
			filter: drop-shadow(0 0 2px rgba(255, 156, 227, 0.2));
			transform: scale(1);
		}
		25% {
			filter: drop-shadow(0 0 3px rgba(169, 255, 156, 0.2));
			transform: scale(1.01);
		}
		50% {
			filter: drop-shadow(0 0 3px rgba(156, 221, 255, 0.2));
			transform: scale(1.02);
		}
		75% {
			filter: drop-shadow(0 0 2px rgba(255, 234, 138, 0.2));
			transform: scale(1.01);
		}
	}

	@keyframes hueShift {
		0% {
			filter: hue-rotate(0deg) saturate(1.3) brightness(1.1);
			background-position: 0% 0%;
		}
		50% {
			filter: hue-rotate(180deg) saturate(1.35) brightness(1.125);
			background-position: 0% 300%;
		}
		100% {
			filter: hue-rotate(360deg) saturate(1.4) brightness(1.15);
			background-position: 0% 600%;
		}
	}
</style>
