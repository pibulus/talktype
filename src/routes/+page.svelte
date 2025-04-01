<script>
	import AudioToText from '$lib/components/AudioToText.svelte';
	let audioToTextComponent;
		// Import at the top
	import { onMount } from 'svelte';
	
	// Simple state tracking
	let blinkTimeouts = [];
	let isRecording = false;
	
	// Simple ambient blinking system restore
	function startAmbientBlinking() {
		console.log("Restoring CSS ambient blinking");
		
		const eyes = document.querySelector('.icon-eyes');
		if (!eyes) {
			console.log("Eyes element not found");
			return;
		}
		
		// Check recording state
		if (isRecording) {
			console.log("Recording active, skipping ambient blinks");
			return;
		}
		
		// Reset animation to ambient blinking
		eyes.style.animation = 'blink 10s infinite';
	}
	
	// Helper function to clear all scheduled blinks
	function clearAllBlinkTimeouts() {
		debug('SYSTEM', `Clearing ${blinkTimeouts.length} blink timeouts`);
		blinkTimeouts.forEach(timeout => clearTimeout(timeout));
		blinkTimeouts = [];
	}
	
	// Simple greeting blink on page load
	function greetingBlink() {
		const eyes = document.querySelector('.icon-eyes');
		if (!eyes) {
			// Retry if eyes not found yet
			console.log("Eyes not found for greeting, retrying");
			setTimeout(greetingBlink, 300);
			return;
		}
		
		console.log("Performing greeting blink");
		
		// Let default CSS animation run first, then do a special double-blink
		setTimeout(() => {
			// Reset animation
			eyes.style.animation = 'none';
			
			// Force reflow
			void eyes.offsetWidth;
			
			// Do a friendly double-blink
			eyes.classList.add('blink-once');
			setTimeout(() => {
				eyes.classList.remove('blink-once');
				setTimeout(() => {
					eyes.classList.add('blink-once');
					setTimeout(() => {
						eyes.classList.remove('blink-once');
						
						// Restore normal ambient blinking
						eyes.style.animation = 'blink 10s infinite';
					}, 200);
				}, 250);
			}, 200);
		}, 1000);
	}
	
	// Component lifecycle
	onMount(() => {
		console.log("Component mounted");
		// Simple greeting with slight delay for DOM to be ready
		setTimeout(greetingBlink, 500);
		
		return () => {
			// Clean up any timers
			blinkTimeouts.forEach(timeout => clearTimeout(timeout));
			blinkTimeouts = [];
		};
	});
	
	// SIMPLE WORKING VERSION - with direct CSS animations
	function startRecordingFromGhost(event) {
		// Stop event propagation to prevent bubbling
		event.stopPropagation();
		event.preventDefault();
		
		// Debug current state
		console.log("Ghost clicked!");
		
		// Get DOM elements
		const iconContainer = event.currentTarget;
		if (!iconContainer) return;
		
		const eyes = document.querySelector('.icon-eyes');
		if (!eyes) return;
		
		if (!audioToTextComponent) return;

		// Use DOM class as source of truth
		const hasRecordingClass = iconContainer.classList.contains('recording');
		console.log(`Current state: ${hasRecordingClass ? 'RECORDING' : 'NOT RECORDING'}`);
		
		if (hasRecordingClass) {
			// STOPPING RECORDING
			console.log("Stopping recording...");
			
			// Update state
			isRecording = false;
			
			// Remove recording class
			iconContainer.classList.remove('recording');
			
			// Blink animation
			eyes.classList.add('blink-once');
			setTimeout(() => {
				eyes.classList.remove('blink-once');
				
				// Resume ambient blinking
				eyes.style.animation = 'blink 10s infinite';
			}, 300);
			
			// Stop recording
			audioToTextComponent.stopRecording();
			
		} else {
			// STARTING RECORDING
			console.log("Starting recording...");
			
			// Update state
			isRecording = true;
			
			// Pause ambient blinking
			eyes.style.animation = 'none';
			
			// Do a quick blink
			setTimeout(() => {
				eyes.classList.add('blink-once');
				setTimeout(() => {
					eyes.classList.remove('blink-once');
					// Add recording class after blink
					iconContainer.classList.add('recording');
				}, 200);
			}, 50);
			
			// Start recording
			audioToTextComponent.startRecording();
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
		animation: blink 10s infinite; /* Occasional ambient blinking - quick and snappy */
		transform-origin: center center; /* Squinch exactly in the middle */
	}

	/* Simple quick snappy ambient blinking animation */
	@keyframes blink {
		0%, 96.5%, 100% { 
			transform: scaleY(1); 
		}
		97.5% { 
			transform: scaleY(0); /* Quick blink - just closed and open */
		}
		98.5% {
			transform: scaleY(1); 
		}
	}

	/* "Thinking" animation when recording is active */
	.icon-container.recording .icon-eyes {
		animation: blink-thinking 4s infinite; /* Slightly slower - more deliberate */
		transform-origin: center center; /* Squinch exactly in the middle */
	}
	
	/* Quick snappy blink animation for programmatic use */
	.icon-eyes.blink-once {
		animation: blink-once 0.2s forwards !important;
		transform-origin: center center;
	}
	
	@keyframes blink-once {
		0%, 30% { transform: scaleY(1); }
		50% { transform: scaleY(0); } /* Closed eyes */
		65%, 100% { transform: scaleY(1); } /* Quick snappy open */
	}
	
	/* Special animation for when the ghost is thinking hard (transcribing) */
	.icon-eyes.blink-thinking-hard {
		animation: blink-thinking-hard 1.5s infinite !important;
		transform-origin: center center;
	}
	
	@keyframes blink-thinking-hard {
		0%, 10%, 50%, 60% { 
			transform: scaleY(1); 
		}
		12%, 48% { 
			transform: scaleY(0); /* Closed eyes - concentrating */
		}
		90%, 100% { 
			transform: scaleY(0.2); /* Squinting - thinking hard */
		}
	}

	@keyframes blink-thinking {
		/* First quick blink */
		0%, 23%, 100% { 
			transform: scaleY(1); 
		}
		3% { 
			transform: scaleY(0); /* Fast blink */
		}
		4% {
			transform: scaleY(1); /* Very snappy */
		}
		
		/* Second blink - thinking pattern */
		40% { 
			transform: scaleY(1);
		}
		42% { 
			transform: scaleY(0); /* First close */
		}
		43% { 
			transform: scaleY(0.2); /* Short peek */
		}
		46% { 
			transform: scaleY(0); /* Second close (squinty thinking) */
		}
		48% {
			transform: scaleY(1); /* Open again */
		}
		
		/* Third quick blink */
		80% {
			transform: scaleY(1);
		}
		82% {
			transform: scaleY(0); /* Fast blink */
		}
		83% {
			transform: scaleY(1); /* Snappy */
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
