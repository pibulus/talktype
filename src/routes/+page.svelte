<script>
	import AudioToText from '$lib/components/AudioToText.svelte';
	let audioToTextComponent;
	function startRecordingFromGhost(event) {
		// Stop event propagation to prevent bubbling
		event.stopPropagation();
		event.preventDefault();

		console.log('Ghost clicked! Current recording state:', audioToTextComponent?.recording);

		const iconContainer = event.currentTarget;

		if (audioToTextComponent) {
			if (audioToTextComponent.recording) {
				// If already recording, stop recording
				console.log('Stopping recording from ghost click');
				iconContainer.classList.remove('recording');
				audioToTextComponent.stopRecording();
			} else {
				// Otherwise start recording
				console.log('Starting recording from ghost click');
				iconContainer.classList.add('recording');
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
			<!-- Layered approach with gradient background and blinking eyes -->
			<div class="icon-layers">
				<!-- Gradient background (bottom layer) -->
				<img src="/talktype-icon-bg-gradient.svg" alt="" class="icon-bg" aria-hidden="true" />
				<!-- Outline without eyes (middle layer) -->
				<img src="/assets/talktype-icon-base.svg" alt="" class="icon-base" aria-hidden="true" />
				<!-- Just the eyes (top layer - for blinking) -->
				<img src="/assets/talktype-icon-eyes.svg" alt="TalkType Ghost Icon" class="icon-eyes" />
			</div>
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
	/* Subtle cream background with just enough texture/noise */
	:global(.bg-gradient-mesh) {
		background-color: #fefaf4; /* Base cream color */
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

	/* Layered icon styling */
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
		transition: all 0.3s ease;
	}

	/* Stack the layers correctly */
	.icon-bg {
		z-index: 1; /* Bottom layer */
	}

	.icon-base {
		z-index: 2; /* Middle layer */
	}

	.icon-eyes {
		z-index: 3; /* Top layer */
		animation: blink 6s infinite; /* Idle blinking */
	}

	/* Blinking animation */
	@keyframes blink {
		0%,
		45%,
		55%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0; /* Eyes completely disappear at midpoint */
		}
	}

	/* Faster blinking when recording is active */
	.icon-container.recording .icon-eyes {
		animation: blink-recording 4s infinite;
	}

	@keyframes blink-recording {
		0%,
		45%,
		55%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
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
