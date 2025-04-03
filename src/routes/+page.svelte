<script context="module">
	let showExtensionInfo = false;
	let showAboutInfo = false;
</script>

<script>
	import { onMount } from 'svelte';
	import AudioToText from '$lib/components/AudioToText.svelte';

	let audioToTextComponent;

	// Brian Eno-inspired ambient blinking system with proper state tracking
	let blinkTimeouts = [];
	let isRecording = false;
	let eyesElement = null;
	let domReady = false;

	// Debug Helper that won't pollute console in production but helps during development
	function debug(message) {
		console.log(`[Ghost Eyes] ${message}`);
	}

	// Animation state variables
	let titleAnimationComplete = false;
	let subtitleAnimationComplete = false;

	// Get eyes element safely with retry mechanism
	function getEyesElement() {
		if (eyesElement) return eyesElement;

		eyesElement = document.querySelector('.icon-eyes');
		if (!eyesElement) {
			debug('Eyes element not found yet');
			return null;
		}

		debug('Eyes element found');
		return eyesElement;
	}

	// Single blink using CSS classes
	function performSingleBlink() {
		const eyes = getEyesElement();
		if (!eyes) return;

		debug('Performing single blink');

		// Add class then remove it after animation completes
		eyes.classList.add('blink-once');

		const timeout = setTimeout(() => {
			eyes.classList.remove('blink-once');
		}, 400);

		blinkTimeouts.push(timeout);
	}

	// Double blink using CSS classes and timeouts
	function performDoubleBlink() {
		const eyes = getEyesElement();
		if (!eyes) return;

		debug('Performing double blink');

		// First blink
		eyes.classList.add('blink-once');

		const timeout1 = setTimeout(() => {
			eyes.classList.remove('blink-once');

			// Short pause between blinks
			const timeout2 = setTimeout(() => {
				// Second blink
				eyes.classList.add('blink-once');

				const timeout3 = setTimeout(() => {
					eyes.classList.remove('blink-once');
				}, 300);

				blinkTimeouts.push(timeout3);
			}, 180);

			blinkTimeouts.push(timeout2);
		}, 300);

		blinkTimeouts.push(timeout1);
	}

	// Triple blink pattern
	function performTripleBlink() {
		const eyes = getEyesElement();
		if (!eyes) return;

		debug('Performing triple blink');

		// First blink
		eyes.classList.add('blink-once');

		const timeout1 = setTimeout(() => {
			eyes.classList.remove('blink-once');

			// Short pause between blinks
			const timeout2 = setTimeout(() => {
				// Second blink
				eyes.classList.add('blink-once');

				const timeout3 = setTimeout(() => {
					eyes.classList.remove('blink-once');

					// Another short pause
					const timeout4 = setTimeout(() => {
						// Third blink
						eyes.classList.add('blink-once');

						const timeout5 = setTimeout(() => {
							eyes.classList.remove('blink-once');
						}, 250);

						blinkTimeouts.push(timeout5);
					}, 150);

					blinkTimeouts.push(timeout4);
				}, 250);

				blinkTimeouts.push(timeout3);
			}, 150);

			blinkTimeouts.push(timeout2);
		}, 250);

		blinkTimeouts.push(timeout1);
	}

	// Generative ambient blinking system - Brian Eno style
	function startAmbientBlinking() {
		debug('Starting ambient blinking system');

		if (!domReady) {
			debug('DOM not ready, delaying ambient blinking');
			setTimeout(startAmbientBlinking, 500);
			return;
		}

		const eyes = getEyesElement();
		if (!eyes) {
			debug('Eyes element not found, delaying ambient blinking');
			setTimeout(startAmbientBlinking, 500);
			return;
		}

		// Clear any existing timeouts to avoid conflicts
		clearAllBlinkTimeouts();

		// Don't run ambient blinks if recording
		if (isRecording) {
			debug('Recording active, skipping ambient blinks');
			return;
		}

		// Parameters for generative system - Brian Eno style (more frequent now)
		const minGap = 4000; // Minimum time between blinks (4s - was 7s)
		const maxGap = 9000; // Maximum time between blinks (9s - was 16s)

		// Blink type probabilities
		const blinkTypes = [
			{ type: 'single', probability: 0.6 }, // 60%
			{ type: 'double', probability: 0.3 }, // 30%
			{ type: 'triple', probability: 0.1 } // 10%
		];

		// Schedule the next blink recursively
		function scheduleNextBlink() {
			// Random time interval with Brian Eno-like indeterminacy
			const nextInterval = Math.floor(minGap + Math.random() * (maxGap - minGap));

			debug(`Next blink in ${nextInterval}ms`);

			const timeout = setTimeout(() => {
				// Exit if we've switched to recording state
				if (isRecording) {
					debug('Recording active, skipping scheduled blink');
					return;
				}

				// Choose blink type based on probability distribution
				const rand = Math.random();
				let cumulativeProbability = 0;
				let selectedType = 'single'; // Default

				for (const blink of blinkTypes) {
					cumulativeProbability += blink.probability;
					if (rand <= cumulativeProbability) {
						selectedType = blink.type;
						break;
					}
				}

				debug(`Selected ${selectedType} blink`);

				// Execute the selected blink pattern
				if (selectedType === 'single') {
					performSingleBlink();
				} else if (selectedType === 'double') {
					performDoubleBlink();
				} else {
					performTripleBlink();
				}

				// Schedule the next blink
				scheduleNextBlink();
			}, nextInterval);

			blinkTimeouts.push(timeout);
		}

		// Start with a slight delay
		setTimeout(scheduleNextBlink, 1000);
	}

	// Helper function to clear all scheduled blinks
	function clearAllBlinkTimeouts() {
		debug(`Clearing ${blinkTimeouts.length} blink timeouts`);
		blinkTimeouts.forEach((timeout) => clearTimeout(timeout));
		blinkTimeouts = [];
	}

	// Greeting blink on page load
	function greetingBlink() {
		const eyes = getEyesElement();
		if (!eyes) {
			// Retry if eyes not found yet
			debug('Eyes not found for greeting, retrying');
			setTimeout(greetingBlink, 300);
			return;
		}

		debug('Performing greeting blink');

		// First apply a gentle wobble to the ghost icon
		const iconContainer = document.querySelector('.icon-container');
		if (iconContainer) {
			// Add slight wobble animation to ghost
			setTimeout(() => {
				debug('Adding greeting wobble to ghost');

				// Apply the wobble animation
				const wobbleClass = 'ghost-wobble-greeting';
				iconContainer.classList.add(wobbleClass);

				// Remove class after animation completes
				setTimeout(() => {
					iconContainer.classList.remove(wobbleClass);
				}, 1000);
			}, 1000); // Start the wobble after the text starts animating
		}

		// Do a friendly double-blink after animations complete
		setTimeout(() => {
			performDoubleBlink();

			// Start ambient blinking system after greeting
			setTimeout(startAmbientBlinking, 1000);
		}, 2000); // Delay long enough for text animations
	}

	// Domain Ready and Observer setup
	function setupDomObserver() {
		debug('Setting up DOM observer');

		// Check if we can find the eyes immediately
		eyesElement = document.querySelector('.icon-eyes');
		if (eyesElement) {
			debug('Eyes element found immediately');
			domReady = true;
			greetingBlink();
			return;
		}

		// If not found, set up observer to watch for it
		const observer = new MutationObserver((mutations, obs) => {
			const eyes = document.querySelector('.icon-eyes');
			if (eyes) {
				debug('Eyes element found via MutationObserver');
				eyesElement = eyes;
				domReady = true;
				greetingBlink();
				obs.disconnect(); // Stop observing once we've found it
			}
		});

		// Start observing
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});

		// Fallback in case observer doesn't trigger
		setTimeout(() => {
			if (!domReady) {
				debug('Fallback DOM ready check');
				eyesElement = document.querySelector('.icon-eyes');
				if (eyesElement) {
					domReady = true;
					greetingBlink();
				}
			}
		}, 1000);
	}

	// Function to handle title animation complete
	function handleTitleAnimationComplete() {
		debug('Title animation complete');
		titleAnimationComplete = true;
	}

	// Function to handle subtitle animation complete
	function handleSubtitleAnimationComplete() {
		debug('Subtitle animation complete');
		subtitleAnimationComplete = true;
	}

	// Component lifecycle
	onMount(() => {
		debug('Component mounted');
		setupDomObserver();

		// Set up animation sequence timing
		setTimeout(handleTitleAnimationComplete, 1200); // After staggered animation
		setTimeout(handleSubtitleAnimationComplete, 2000); // After subtitle slide-in

		return () => {
			debug('Component unmounting, clearing timeouts');
			clearAllBlinkTimeouts();
		};
	});

	// Reliable recording toggle with ambient blinking support
	function startRecordingFromGhost(event) {
		// Stop event propagation to prevent bubbling
		event.stopPropagation();
		event.preventDefault();

		// Debug current state
		debug(`Ghost clicked! Recording state: ${audioToTextComponent?.recording}`);

		// Get DOM elements with error checking
		const iconContainer = event.currentTarget;
		if (!iconContainer) {
			debug('No icon container found during click handler');
			return;
		}

		const eyes = getEyesElement();
		if (!eyes) {
			debug('Eyes element not found during click handler');
			return;
		}

		if (!audioToTextComponent) {
			debug('No audioToTextComponent found');
			return;
		}

		// Use DOM class as source of truth (reliable)
		const hasRecordingClass = iconContainer.classList.contains('recording');
		debug(`DOM state: has 'recording' class = ${hasRecordingClass}`);

		if (hasRecordingClass) {
			// STOPPING RECORDING
			debug('Stopping recording');

			// Update recording state
			isRecording = false;

			// Reset all animation state
			eyes.style.animation = 'none';

			// Remove the recording class
			iconContainer.classList.remove('recording');

			// Add wobble animation when stopping from ghost click
			debug('Applying wobble animation to ghost icon on stop');
			// Force reflow to ensure animation applies
			void iconContainer.offsetWidth;

			// Clear any existing animation classes first
			iconContainer.classList.remove('ghost-wobble-left', 'ghost-wobble-right');

			const wobbleClass = Math.random() > 0.5 ? 'ghost-wobble-left' : 'ghost-wobble-right';
			debug(`Adding class: ${wobbleClass}`);
			iconContainer.classList.add(wobbleClass);
			console.log('Current classes:', iconContainer.className);
			setTimeout(() => {
				debug(`Removing class: ${wobbleClass}`);
				iconContainer.classList.remove(wobbleClass);
			}, 600);

			// Blink once to acknowledge stop
			setTimeout(() => {
				debug('Performing stop acknowledgment blink');
				performSingleBlink();

				// Resume ambient blinking after a pause
				setTimeout(() => {
					debug('Resuming ambient blinking');
					startAmbientBlinking();
				}, 1000);
			}, 100);

			// Stop the recording
			try {
				audioToTextComponent.stopRecording();
				debug('Called stopRecording() on component');
			} catch (err) {
				debug(`Error stopping recording: ${err.message}`);
			}
		} else {
			// STARTING RECORDING
			debug('Starting recording');

			// Update recording state and stop ambient system
			isRecording = true;
			clearAllBlinkTimeouts();

			// Reset any existing animations
			eyes.style.animation = 'none';

			// Add wobble animation when starting from ghost click
			debug('Applying wobble animation to ghost icon on start');
			// Force reflow to ensure animation applies
			void iconContainer.offsetWidth;

			// Clear any existing animation classes first
			iconContainer.classList.remove('ghost-wobble-left', 'ghost-wobble-right');

			const wobbleClass = Math.random() > 0.5 ? 'ghost-wobble-left' : 'ghost-wobble-right';
			debug(`Adding class: ${wobbleClass}`);
			iconContainer.classList.add(wobbleClass);
			console.log('Current classes:', iconContainer.className);
			setTimeout(() => {
				debug(`Removing class: ${wobbleClass}`);
				iconContainer.classList.remove(wobbleClass);
			}, 600);

			// Give a tiny delay to ensure animation reset
			setTimeout(() => {
				// Random chance for different start behaviors
				const startBehavior = Math.random();

				if (startBehavior < 0.7) {
					// 70% chance: Standard quick blink
					debug('Performing standard start blink');
					performSingleBlink();
				} else if (startBehavior < 0.9) {
					// 20% chance: Double blink (excited)
					debug('Performing excited double start blink');
					performDoubleBlink();
				} else {
					// 10% chance: Triple blink (super attentive)
					debug('Performing attentive triple start blink');
					performTripleBlink();
				}

				// Add recording class after the blink animation completes
				setTimeout(() => {
					debug('Adding recording class');
					iconContainer.classList.add('recording');
				}, 600);

				// Start recording
				try {
					audioToTextComponent.startRecording();
					debug('Called startRecording() on component');
				} catch (err) {
					debug(`Error starting recording: ${err.message}`);
				}
			}, 50);
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

		<!-- Typography - Always using animated version for consistency -->
		<h1
			class="staggered-text mb-1 text-center text-5xl font-black tracking-tight sm:mb-2 sm:text-6xl md:mb-2 md:text-7xl lg:text-8xl xl:text-9xl"
		>
			<span class="stagger-letter">T</span><span class="stagger-letter">a</span><span
				class="stagger-letter">l</span
			><span class="stagger-letter">k</span><span class="stagger-letter">T</span><span
				class="stagger-letter">y</span
			><span class="stagger-letter">p</span><span class="stagger-letter">e</span>
		</h1>
		<p
			class="slide-in-subtitle mx-auto mb-4 max-w-sm text-center text-xl text-gray-700 sm:mb-4 sm:max-w-md sm:text-2xl md:mb-6 md:max-w-lg md:text-3xl"
		>
			Fast, accurate, and free voice-to-text transcription.
		</p>

		<!-- Audio component - Wider container for better transcript layout -->
		<div class="w-full max-w-xl sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
			<AudioToText bind:this={audioToTextComponent} />
		</div>
	</div>

	<!-- Footer section with attribution and Chrome extension info -->
	<footer
		class="fixed bottom-0 left-0 right-0 border-t border-pink-100/40 bg-gradient-to-r from-white/40 to-pink-50/30 px-4 py-4 text-center text-xs text-gray-600 shadow-[0_-4px_15px_rgba(249,168,212,0.1)] backdrop-blur-md sm:py-5"
	>
		<div class="container mx-auto flex flex-col items-center justify-between gap-3 sm:flex-row">
			<div class="copyright flex items-center">
				<span class="mr-1 text-sm font-medium tracking-tight">
					© {new Date().getFullYear()} TalkType
				</span>
				<span class="mx-2 text-pink-200">•</span>
				<span class="font-light text-gray-500"
					>Made with
					<span
						class="mx-0.5 inline-block transform animate-pulse text-pink-400 transition-transform duration-300 hover:scale-110"
						>❤️</span
					>
					by Dennis & Pablo
				</span>
			</div>
			<div class="flex items-center gap-4">
				<a
					href="#about"
					class="text-gray-500 transition-colors duration-200 hover:text-amber-600"
					on:click|preventDefault={() => (showAboutInfo = !showAboutInfo)}
				>
					About
				</a>
				<a
					href="#extension"
					class="group relative rounded-full bg-gradient-to-r from-amber-100/80 to-amber-200/70 px-3 py-1.5 text-amber-700 transition-all duration-200 hover:from-amber-200/90 hover:to-amber-300/80 hover:text-amber-800 hover:shadow-md"
					on:click|preventDefault={() => (showExtensionInfo = !showExtensionInfo)}
				>
					<span class="relative z-10 text-xs font-medium">Chrome Extension</span>
					<span
						class="absolute inset-0 rounded-full bg-white/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
					></span>
				</a>
			</div>
		</div>

		{#if showExtensionInfo}
			<div
				class="extension-info fixed inset-0 z-50 flex items-center justify-center bg-black/50"
				on:click|self={() => (showExtensionInfo = false)}
			>
				<div class="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
					<div class="bg-gradient-to-r from-amber-50/80 to-pink-100/70 px-6 py-4">
						<h3 class="text-lg font-bold text-gray-800">TalkType Chrome Extension</h3>
					</div>
					<div class="p-6">
						<p class="mb-4 text-sm leading-relaxed text-gray-600">
							Use TalkType directly in any text field across the web!
						</p>

						<div
							class="mb-5 rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/50 to-white p-4"
						>
							<h4 class="mb-2 text-sm font-medium text-amber-700">Installation Instructions:</h4>
							<ol class="mt-2 list-decimal space-y-2 pl-5 text-left text-xs text-gray-700">
								<li>
									Download the extension files <a
										href="#"
										class="text-amber-600 transition-colors hover:text-amber-700 hover:underline"
										>here</a
									>
								</li>
								<li>
									Open Chrome and go to <code
										class="rounded-md bg-amber-100/70 px-1.5 py-0.5 font-mono text-amber-800"
										>chrome://extensions</code
									>
								</li>
								<li>Enable "Developer mode" in the top-right corner</li>
								<li>Click "Load unpacked" and select the extension folder</li>
								<li>TalkType will appear in your extensions toolbar</li>
							</ol>
						</div>

						<div class="flex justify-end">
							<button
								class="rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-medium text-black shadow-sm transition-colors hover:from-amber-500 hover:to-amber-600"
								on:click={() => (showExtensionInfo = false)}
							>
								Close
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		{#if showAboutInfo}
			<div
				class="about-info fixed inset-0 z-50 flex items-center justify-center bg-black/50"
				on:click|self={() => (showAboutInfo = false)}
			>
				<div class="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
					<div class="bg-gradient-to-r from-pink-100/80 to-amber-50/70 px-6 py-4">
						<h3 class="text-lg font-bold text-gray-800">About TalkType</h3>
					</div>
					<div class="p-6">
						<p class="mb-4 text-sm leading-relaxed text-gray-600">
							TalkType is a minimalist voice-to-text tool that makes transcription simple and
							delightful. Part of the Soft Stack family of tools designed to be emotionally
							intelligent and tactile.
						</p>

						<div class="mb-4 border-l-2 border-amber-200 py-1 pl-3">
							<p class="text-xs italic text-gray-500">
								"A little bit of soul, a hint of chaos, and a deep love for clarity."
							</p>
						</div>

						<p class="text-sm text-gray-600">
							Made in Melbourne, Australia with care and attention to the details that matter.
						</p>

						<div class="mt-6 flex justify-end">
							<button
								class="rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-medium text-black shadow-sm transition-colors hover:from-amber-500 hover:to-amber-600"
								on:click={() => (showAboutInfo = false)}
							>
								Close
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</footer>
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
		animation: blink 6s infinite; /* More frequent ambient blinking (was 10s) */
		transform-origin: center center; /* Squinch exactly in the middle */
	}

	/* Simple quick snappy ambient blinking animation */
	@keyframes blink {
		0%,
		96.5%,
		100% {
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
		0%,
		30% {
			transform: scaleY(1);
		}
		50% {
			transform: scaleY(0);
		} /* Closed eyes */
		65%,
		100% {
			transform: scaleY(1);
		} /* Quick snappy open */
	}

	/* Special animation for when the ghost is thinking hard (transcribing) */
	.icon-eyes.blink-thinking-hard {
		animation: blink-thinking-hard 1.5s infinite !important;
		transform-origin: center center;
	}

	@keyframes blink-thinking-hard {
		0%,
		10%,
		50%,
		60% {
			transform: scaleY(1);
		}
		12%,
		48% {
			transform: scaleY(0); /* Closed eyes - concentrating */
		}
		90%,
		100% {
			transform: scaleY(0.2); /* Squinting - thinking hard */
		}
	}

	@keyframes blink-thinking {
		/* First quick blink */
		0%,
		23%,
		100% {
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

	/* Ghost wobble animations */
	@keyframes ghost-wobble-left {
		0% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(-5deg);
		}
		50% {
			transform: rotate(3deg);
		}
		75% {
			transform: rotate(-2deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}

	@keyframes ghost-wobble-right {
		0% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(5deg);
		}
		50% {
			transform: rotate(-3deg);
		}
		75% {
			transform: rotate(2deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}

	:global(.ghost-wobble-left) {
		animation: ghost-wobble-left 0.6s ease-in-out !important;
	}

	:global(.ghost-wobble-right) {
		animation: ghost-wobble-right 0.6s ease-in-out !important;
	}

	/* Staggered text animation for title - more reliable approach */
	.staggered-text {
		animation: none; /* Reset any existing animations */
		opacity: 1; /* Default to visible */
	}

	.stagger-letter {
		display: inline-block;
		opacity: 0;
		transform: translateY(15px);
		animation: staggerFadeIn 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards;
		will-change: transform, opacity;
	}

	/* Apply different delays to each letter */
	.stagger-letter:nth-child(1) {
		animation-delay: 0.05s;
	}
	.stagger-letter:nth-child(2) {
		animation-delay: 0.1s;
	}
	.stagger-letter:nth-child(3) {
		animation-delay: 0.15s;
	}
	.stagger-letter:nth-child(4) {
		animation-delay: 0.2s;
	}
	.stagger-letter:nth-child(5) {
		animation-delay: 0.25s;
	}
	.stagger-letter:nth-child(6) {
		animation-delay: 0.3s;
	}
	.stagger-letter:nth-child(7) {
		animation-delay: 0.35s;
	}
	.stagger-letter:nth-child(8) {
		animation-delay: 0.4s;
	}

	@keyframes staggerFadeIn {
		0% {
			opacity: 0;
			transform: translateY(15px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Slide-in animation for subtitle - with hardware acceleration for performance */
	.slide-in-subtitle {
		opacity: 0;
		transform: translateY(10px);
		animation: slideIn 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
		animation-delay: 0.6s; /* Start before title animation completes */
		will-change: transform, opacity;
		backface-visibility: hidden;
	}

	@keyframes slideIn {
		0% {
			opacity: 0;
			transform: translateY(10px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Title shimmer effect */
	.title-shimmer {
		position: relative;
		overflow: hidden;
	}

	.title-shimmer::after {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 50%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		animation: shimmer 3s ease-out 2.5s;
	}

	@keyframes shimmer {
		0% {
			left: -100%;
		}
		100% {
			left: 200%;
		}
	}

	/* Subtle hover effect for paragraphs */
	.subtle-hover {
		transition:
			color 0.3s ease,
			text-shadow 0.3s ease;
	}

	.subtle-hover:hover {
		color: #000;
		text-shadow: 0 0 1px rgba(0, 0, 0, 0.1);
	}

	/* Default cursor for non-editable text */
	.cursor-default {
		cursor: default;
	}

	/* Greeting wobble animation for ghost icon */
	@keyframes ghost-wobble-greeting {
		0% {
			transform: rotate(0deg);
		}
		20% {
			transform: rotate(-3deg) scale(1.02);
		}
		40% {
			transform: rotate(2deg) scale(1.04);
		}
		60% {
			transform: rotate(-1deg) scale(1.02);
		}
		80% {
			transform: rotate(1deg) scale(1.01);
		}
		100% {
			transform: rotate(0deg) scale(1);
		}
	}

	.ghost-wobble-greeting {
		animation: ghost-wobble-greeting 1s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
		transform-origin: center center;
	}

	/* Title hover effect */
	.title-hover {
		transition: text-shadow 0.3s ease;
	}

	.title-hover:hover {
		text-shadow: 0 0 15px rgba(249, 168, 212, 0.6);
	}

	/* Subtitle hover effect */
	.subtitle-hover {
		transition:
			color 0.3s ease,
			text-shadow 0.3s ease;
	}

	.subtitle-hover:hover {
		color: #000;
		text-shadow: 0 0 8px rgba(249, 168, 212, 0.3);
	}

	/* TalkType Logo Typography Fixes - Simplified and Stabilized */
	.talktype-logo {
		/* Font smoothing for better rendering */
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		text-rendering: optimizeLegibility;
		/* Ensure proper vertical spacing and prevent y descender clipping */
		line-height: 1.3; /* Increased line height for better descender handling */
		padding-bottom: 6px; /* Increased padding to prevent descender clipping */
		/* Subtle letter-spacing for better visual balance */
		letter-spacing: 0.01em;
		/* Ensure the container has enough height and doesn't clip */
		overflow: visible;
		/* Make sure the element is a block for stable animations */
		display: inline-block;
		/* Smooth transition for hover */
		transition: all 0.2s ease;
	}

	/* Simple, cohesive hover effect that treats the wordmark as one unit */
	.talktype-logo:hover {
		letter-spacing: 0.02em;
		transform: translateY(-1px);
	}

	/* Custom kerning for specific letter pairs */
	.talktype-logo .letter-t1 {
		margin-right: -0.05em; /* Tighten spacing between T and a */
	}

	/* Tighter kerning for "a" - pull it closer to "T" */
	.talktype-logo .letter-a1 {
		margin-left: -0.06em; /* Pull "a" closer to "T" */
	}

	.talktype-logo .letter-k {
		margin-right: -0.02em; /* Adjust k-T spacing */
	}

	.talktype-logo .letter-t2 {
		margin-right: -0.02em; /* Adjust T-y spacing */
	}

	/* Fix for the 'y' descender to prevent clipping */
	.talktype-logo .letter-y {
		/* Ensure the y descender is fully visible */
		display: inline-block;
		position: relative;
		margin-bottom: 3px; /* Increased margin to prevent descender clipping */
	}

	/* No complicated per-letter animations - removed for stability */
</style>
