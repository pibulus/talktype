<script>
	export let analyser;
	export let scalingFactor = 40; // default scaling factor
	export let offset = 120; // default offset

	let audioDataArray;
	let animationFrameId;
	let audioLevel = 0;
	let recording = false; // Add recording state

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
		let linearLevel = Math.max(0, (sum / bufferLength + offset)); // Calculate linear level first
		let nonLinearLevel = Math.sqrt(linearLevel); // Apply square root for non-linear scaling
		audioLevel = Math.max(0, Math.min(100, nonLinearLevel * (100 / Math.sqrt(scalingFactor)))); // Rescale non-linear level
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

<div class="h-4 overflow-hidden rounded-full bg-base-200">
	<div class="h-full rounded-full bg-primary" style="width: {audioLevel}%"></div>
</div>
