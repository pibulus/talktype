<script>
	import AudioToText from '$lib/components/AudioToText.svelte';
	let audioToTextComponent;
	function startRecordingFromGhost(event) {
		// Stop event propagation to prevent bubbling
		event.stopPropagation();
		event.preventDefault();

		console.log('Ghost clicked! Current recording state:', audioToTextComponent?.recording);

		if (audioToTextComponent) {
			if (audioToTextComponent.recording) {
				// If already recording, stop recording
				console.log('Stopping recording from ghost click');
				audioToTextComponent.stopRecording();
			} else {
				// Otherwise start recording
				console.log('Starting recording from ghost click');
				audioToTextComponent.startRecording();
			}
		}
	}
</script>

<section
	class="bg-gradient-mesh mt-[-5vh] flex min-h-screen flex-col items-center justify-center px-4 py-8 pb-28 pt-[6vh] font-sans text-black antialiased sm:px-6 md:px-10 md:pt-[8vh] lg:py-12 lg:pb-32"
>
	<div
		class="mx-auto flex w-full max-w-md flex-col items-center sm:max-w-lg md:max-w-2xl lg:max-w-3xl"
	>
		<!-- Ghost Icon - Mobile: tight, Desktop: chunky -->
		<div
			class="icon-container mb-0 h-32 w-32 cursor-pointer sm:h-40 sm:w-40 md:mb-0 md:h-56 md:w-56 lg:h-64 lg:w-64"
			on:click|preventDefault|stopPropagation={startRecordingFromGhost}
			role="button"
			tabindex="0"
			aria-label="Toggle Recording"
		>
			<img src="/talktype-icon.svg" alt="TalkType Ghost Icon" class="h-full w-full" />
		</div>

		<!-- Typography - Tighter on mobile, more spacious on desktop -->
		<h1
			class="mb-1 text-center text-5xl font-black tracking-tight sm:mb-2 sm:text-6xl md:mb-2 md:text-7xl lg:text-8xl xl:text-9xl"
		>
			TalkType
		</h1>
		<p
			class="mx-auto mb-4 max-w-sm text-center text-xl text-gray-700 sm:mb-4 sm:max-w-md sm:text-2xl md:mb-6 md:max-w-lg md:text-3xl"
		>
			Fast, accurate, and free voice-to-text transcription.
		</p>

		<!-- Audio component - Wider container for better transcript layout -->
		<div class="w-full max-w-xl sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
			<AudioToText bind:this={audioToTextComponent} />
		</div>
	</div>
</section>

<style>
	/* Final subtle cream background with soft vignette */
	:global(.bg-gradient-mesh) {
		background-color: #fefaf4; /* Original cream base */
		background-image: radial-gradient(
			circle at center,
			#fefaf4 0%,
			#fefaf4 50%,
			#fdf7ef 85%,
			#fcf5ea 100%
		);
		background-attachment: fixed;
	}

	.icon-container {
		filter: drop-shadow(0 0 8px rgba(255, 156, 243, 0.15));
		transition: all 0.3s ease;
	}

	.icon-container:hover,
	.icon-container:active {
		filter: drop-shadow(0 0 18px rgba(249, 168, 212, 0.45))
			drop-shadow(0 0 30px rgba(255, 156, 243, 0.3));
		transform: scale(1.03);
		animation: gentle-pulse 3s infinite;
	}

	.icon-container.recording {
		animation: recording-glow 1.5s infinite;
		transform: scale(1.05);
	}

	@media (min-width: 768px) {
		.icon-container {
			filter: drop-shadow(0 0 12px rgba(249, 168, 212, 0.25))
				drop-shadow(0 0 15px rgba(255, 156, 243, 0.15));
		}

		.icon-container:hover {
			filter: drop-shadow(0 0 25px rgba(249, 168, 212, 0.5))
				drop-shadow(0 0 35px rgba(255, 156, 243, 0.4));
		}
	}

	@keyframes gentle-pulse {
		0% {
			filter: drop-shadow(0 0 15px rgba(249, 168, 212, 0.4))
				drop-shadow(0 0 20px rgba(255, 156, 243, 0.25));
		}
		50% {
			filter: drop-shadow(0 0 25px rgba(249, 168, 212, 0.55))
				drop-shadow(0 0 30px rgba(255, 156, 243, 0.35));
		}
		100% {
			filter: drop-shadow(0 0 15px rgba(249, 168, 212, 0.4))
				drop-shadow(0 0 20px rgba(255, 156, 243, 0.25));
		}
	}

	/* Glowing animation for active recording state */
	@keyframes recording-glow {
		0% {
			filter: drop-shadow(0 0 15px rgba(255, 100, 243, 0.5))
				drop-shadow(0 0 25px rgba(249, 168, 212, 0.4));
		}
		50% {
			filter: drop-shadow(0 0 25px rgba(255, 100, 243, 0.8))
				drop-shadow(0 0 35px rgba(255, 120, 170, 0.5))
				drop-shadow(0 0 40px rgba(249, 168, 212, 0.4));
		}
		100% {
			filter: drop-shadow(0 0 15px rgba(255, 100, 243, 0.5))
				drop-shadow(0 0 25px rgba(249, 168, 212, 0.4));
		}
	}
</style>
