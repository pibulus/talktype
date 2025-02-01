<script>
	export let analyser;

	let audioDataArray;
	let animationFrameId;
	let audioLevel = 0;
	let recording = false; // Add recording state
	let history = []; // Array to store audio level history
	const historyLength = 30; // Number of bars to display in history

	// Tweakable variables within AudioVisualizer
	let scalingFactor;
	let offset;
	let exponent;
	let detectedDevice = 'Unknown'; // Variable to store detected device

	// Platform detection for default settings
	const userAgent = navigator.userAgent;
	const isAndroid = /Android/i.test(userAgent);
	const isiPhone = /iPhone/i.test(userAgent);

	if (isAndroid) {
		// Android specific settings (based on your feedback: offset 80, scale 40)
		scalingFactor = 40;
		offset = 80;
		exponent = 0.5;
		detectedDevice = 'Android';
	} else if (isiPhone) {
		// iPhone specific settings (you can adjust these based on testing)
		scalingFactor = 40;
		offset = 130;
		exponent = 0.5;
		detectedDevice = 'iPhone';
	} else {
		// Default settings for other platforms (based on your feedback: offset 100, scale 20)
		scalingFactor = 20;
		offset = 100;
		exponent = 0.5;
		detectedDevice = 'PC or Other';
	}

	$: {
		// Reactively update recording state based on analyser
		recording = !!analyser; // analyser is truthy when recording, falsy otherwise
		if (recording) {
			startVisualizer();
		} else {
			stopVisualizer();
		}
	}

	function updateVisualizer() {
		if (!recording || !analyser) return;
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
	}

	onDestroy(() => {
		stopVisualizer();
	});

	import { onDestroy } from 'svelte';
</script>

<div class="mb-2">
	<p class="text-sm italic">Detected device: {detectedDevice}</p>
	<label for="scalingFactor" class="label">
		<span class="label-text">Scaling Factor:</span>
	</label>
	<input
		id="scalingFactor"
		type="number"
		class="input input-sm input-bordered w-24"
		bind:value={scalingFactor}
	/>

	<label for="offset" class="label">
		<span class="label-text">Offset:</span>
	</label>
	<input id="offset" type="number" class="input input-sm input-bordered w-24" bind:value={offset} />

	<label for="exponent" class="label">
		<span class="label-text">Exponent:</span>
	</label>
	<input
		id="exponent"
		type="number"
		step="0.1"
		class="input input-sm input-bordered w-24"
		bind:value={exponent}
	/>
</div>

<div class="history-wrapper bg-base-200 rounded-box p-2">
	<div class="history-container">
		{#each history as level, index (index)}
			<div
				class="history-bar bg-primary"
				style="height: {level}%; width: {(100 / historyLength)}%; left: {(index * (100 / historyLength))}%"
			></div>
		{/each}
	</div>
</div>

<style>
	.history-wrapper {
		overflow-x: hidden; /* Prevent horizontal scrollbar */
	}
	.history-container {
		position: relative; /* Needed for absolute positioning of bars */
		width: 100%;
		height: 4rem; /* Adjust as needed */
		display: flex; /* Use flexbox for horizontal bar layout */
		flex-direction: row-reverse; /* Reverse direction so new bars appear on the left */
		/* border: 1px solid red;  for debugging layout */
	}
	.history-bar {
		position: absolute; /* Position bars absolutely within container */
		bottom: 0; /* Align bars to the bottom */
		/* width:  calc(100% / 30);  Width calculated based on historyLength */
		/* margin-right: 1px;  Optional spacing between bars */
		background-color: theme('colors.primary'); /* Use Tailwind primary color */
		transition: height 0.1s ease-in-out; /* Smooth height transitions */
	}
</style>
