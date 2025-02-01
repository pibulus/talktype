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
		audioLevel = Math.max(0, Math.min(100, (sum / bufferLength + offset) * (100 / scalingFactor)));
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

	// Optional: Initialize visualizer if analyser is immediately available
	// on component mount (if needed in future scenarios)
	// $: if (analyser && recording) {
	//   startVisualizer();
	// }

	onDestroy(() => {
		stopVisualizer();
	});

	import { onDestroy } from 'svelte';
</script>

<div class="h-4 overflow-hidden rounded-full bg-base-200">
	<div class="h-full rounded-full bg-primary" style="width: {audioLevel}%"></div>
</div>
