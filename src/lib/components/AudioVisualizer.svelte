<script>
	export let analyser;

	let audioDataArray;
	let animationFrameId;
	let audioLevel = 0;
	let recording = false; // Add recording state

	// Tweakable variables within AudioVisualizer
	let scalingFactor = 40; // default scaling factor - now in this component and tweakable
	let offset = 120; // default offset - now in this component and tweakable
	let exponent = 0.5; // default exponent for square root - now tweakable

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
	<label for="scalingFactor" class="label">
		<span class="label-text">Scaling Factor:</span>
	</label>
	<input
		id="scalingFactor"
		type="number"
		class="input input-bordered input-sm w-24"
		bind:value={scalingFactor}
	/>

	<label for="offset" class="label">
		<span class="label-text">Offset:</span>
	</label>
	<input
		id="offset"
		type="number"
		class="input input-bordered input-sm w-24"
		bind:value={offset}
	/>

	<label for="exponent" class="label">
		<span class="label-text">Exponent:</span>
	</label>
	<input
		id="exponent"
		type="number"
		step="0.1"
		class="input input-bordered input-sm w-24"
		bind:value={exponent}
	/>
</div>

<div class="h-4 overflow-hidden rounded-full bg-base-200">
	<div class="h-full rounded-full bg-primary" style="width: {audioLevel}%" />
</div>
