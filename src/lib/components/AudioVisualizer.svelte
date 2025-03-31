<script>
	import { onMount, onDestroy } from 'svelte';

	let audioDataArray;
	let animationFrameId;
	let audioLevel = 0;
	let history = []; // Array to store audio level history
	const historyLength = 30; // Number of bars to display in history
	let analyser;
	let audioContext;
	let recording = false; // Track recording state within the component

	// Tweakable variables within AudioVisualizer
	let scalingFactor;
	let offset;
	let exponent;
	let detectedDevice = 'Unknown'; // Variable to store detected device

	// Platform detection for default settings
	const userAgent = navigator.userAgent;
	const isAndroid = /Android/i.test(userAgent);
	const isiPhone = /iPhone/i.test(userAgent);
	const isMac = /Macintosh/i.test(userAgent);

	if (isAndroid) {
		// Android specific settings
		scalingFactor = 40;
		offset = 80;
		exponent = 0.5;
		detectedDevice = 'Android';
	} else if (isiPhone) {
		// iPhone specific settings
		scalingFactor = 40;
		offset = 80;
		exponent = 0.2;
		detectedDevice = 'iPhone';
	} else if (isMac) {
		// macOS specific settings
		scalingFactor = 20;
		offset = 100;
		exponent = 0.5;
		detectedDevice = 'Mac';
	} else {
		// Default settings for other platforms
		scalingFactor = 2000;
		offset = 80;
		exponent = 0.5;
		detectedDevice = 'PC';
	}

	onMount(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			audioContext = new (globalThis.window.AudioContext || globalThis.window.webkitAudioContext)();
			analyser = audioContext.createAnalyser();
			const source = audioContext.createMediaStreamSource(stream);
			source.connect(analyser);
			analyser.fftSize = 256;
			recording = true; // Set recording to true when component mounts and stream is obtained
			startVisualizer();
		} catch (error) {
			console.error('Error accessing microphone for visualizer:', error);
			recording = false; // Set recording to false if stream fails
			// Optionally handle error display in the component
		}
	});

	$: {
		// Reactively update recording state - might not be needed now as recording is managed internally
		if (recording && analyser) {
			startVisualizer();
		} else if (!recording) {
			stopVisualizer();
		}
	}

	let frameSkipCounter = 0;
	const frameSkipRate = 2; // Adjust this value to control the speed (higher value = slower animation)

	function updateVisualizer() {
		if (!recording || !analyser) return;

		// Skip frames to slow down the animation
		if (frameSkipCounter < frameSkipRate) {
			frameSkipCounter++;
			animationFrameId = requestAnimationFrame(updateVisualizer);
			return;
		}
		frameSkipCounter = 0;

		const bufferLength = analyser.frequencyBinCount;
		audioDataArray = new Float32Array(bufferLength);
		analyser.getFloatFrequencyData(audioDataArray);
		let sum = 0;
		for (let i = 0; i < bufferLength; i++) {
			sum += audioDataArray[i];
		}
		let linearLevel = Math.max(0, sum / bufferLength + offset); // Calculate linear level first
		let nonLinearLevel = Math.pow(linearLevel, exponent); // Apply power function for non-linear scaling
		audioLevel = Math.max(
			0,
			Math.min(100, nonLinearLevel * (100 / Math.pow(scalingFactor, exponent))) // Rescale non-linear level
		);

		// Update history - add new level to the start, remove oldest if history is too long
		history = [audioLevel, ...history];
		if (history.length > historyLength) {
			history.pop();
		}

		animationFrameId = requestAnimationFrame(updateVisualizer);
	}

	function startVisualizer() {
		if (recording && analyser) {
			history = Array(historyLength).fill(0); // Initialize history with zeros when recording starts
			updateVisualizer();
		}
	}

	function stopVisualizer() {
		recording = false;
		cancelAnimationFrame(animationFrameId);
		audioLevel = 0;
		history = []; // Clear history when recording stops
		if (audioContext) {
			audioContext.close(); // Close audio context when visualizer stops
			audioContext = null;
			analyser = null;
		}
	}

	onDestroy(() => {
		stopVisualizer();
	});
</script>

<div class="history-container">
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
		background: linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,242,248,0.2));
	}
	.history-bar {
		position: absolute;
		bottom: 0;
		background: linear-gradient(
			to top,
			#ff7eb3,
			/* Pink - matches ghost icon gradient */ #7b68ee /* Purple - matches ghost icon gradient */
		);
		transition: height 0.15s ease-in-out;
		border-radius: 3px 3px 0 0;
		margin-right: 1px; /* Add slight margin to prevent white line gaps */
		box-shadow: 0 0 8px rgba(249, 168, 212, 0.2); /* Subtle glow on bars */
		opacity: 0.95;
	}
</style>