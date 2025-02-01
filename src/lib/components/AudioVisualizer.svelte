<script>
	export let analyser;

	let audioDataArray;
	let animationFrameId;
	let audioLevel = 0;
	let recording = false; // Add recording state

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
		animationFrameId = requestAnimationFrame(updateVisualizer);
	}

	function startVisualizer() {
		if (recording && analyser) {
			updateVisualizer();
		}
	}

	function stopVisualizer() {
		recording = false;
		cancelAnimationFrame(animationFrameId);
		audioLevel = 0;
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

<div class="h-4 overflow-hidden rounded-full bg-base-200">
	<div class="h-full rounded-full bg-primary" style="width: {audioLevel}%" />
</div>
