<script>
	export let progress = 0;
</script>

<!-- Transcribing: Progress bar fills up (shows actual progress) -->
<div
	class="progress-container relative mx-auto flex h-[64px] w-[90%] max-w-[420px] items-center justify-center overflow-hidden rounded-full bg-amber-200 shadow-md shadow-black/10 sm:h-[64px] sm:w-[85%]"
	role="progressbar"
	aria-label="Transcription progress"
	aria-valuenow={progress}
	aria-valuemin="0"
	aria-valuemax="100"
>
	<div
		class="progress-bar h-full bg-gradient-to-r from-amber-400 to-rose-300 transition-all duration-300"
		style="width: {progress}%;"
	>
		<!-- Visual-only progress bar, no text needed -->
		<span class="sr-only">Processing {progress}%</span>
	</div>
</div>

<style>
	/* Progress container styling */
	.progress-container {
		position: relative;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.progress-bar {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		transition: width 0.3s ease;
		animation: pulse-glow 1.5s infinite ease-in-out;
	}

	@keyframes pulse-glow {
		0% {
			box-shadow: inset 0 0 5px rgba(255, 190, 60, 0.5);
		}
		50% {
			box-shadow: inset 0 0 15px rgba(255, 190, 60, 0.8);
		}
		100% {
			box-shadow: inset 0 0 5px rgba(255, 190, 60, 0.5);
		}
	}
</style>
