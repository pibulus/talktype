<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';

	// Props
	export let currentTheme = 'peach';
	export let isRecording = false;
	export let isBlinking = false;
	export let currentAnimation = 'none';
	export let eyePosition = 'center';
	export let ambientBlinking = true;
	export let doingSpecialAnimation = false;
	export let isHoverSimulation = false;
	export let isRainbowSparkle = false;
	export let useThemeSpecificRecording = true;
	export let eyeTrackingEnabled = false;
	export let isProcessing = false;

	// References to SVG elements
	let ghostSvg;
	let eyesElement;

	// Animation timeout references
	let animationTimeout;
	let blinkTimeoutId;
	let wobbleTimeoutId;
	let specialAnimationTimeoutId;

	// Event dispatcher
	const dispatch = createEventDispatcher();

	onMount(() => {
		// Get references to SVG elements
		eyesElement = ghostSvg?.querySelector('.ghost-eyes');

		// Start ambient blinking with better control
		if (ambientBlinking && eyesElement) {
			scheduleBlink();
		}

		// Start special animation detection (easter egg)
		if (eyesElement) {
			maybeDoSpecialAnimation();
		}

		// Start with a greeting animation
		setTimeout(() => {
			greetingAnimation();
		}, 1500);

		// Set up eye tracking if enabled
		if (eyeTrackingEnabled) {
			document.addEventListener('mousemove', handleMouseMove);
		}

		// Apply theme at mount
		applyTheme();

		return () => {
			// Clear any timeouts on unmount
			if (animationTimeout) clearTimeout(animationTimeout);
			clearTimeout(blinkTimeoutId);
			clearTimeout(wobbleTimeoutId);
			clearTimeout(specialAnimationTimeoutId);

			// Clean up event listener if enabled
			if (eyeTrackingEnabled) {
				document.removeEventListener('mousemove', handleMouseMove);
			}
		};
	});

	// Clean up on destroy
	onDestroy(() => {
		clearTimeout(blinkTimeoutId);
		clearTimeout(wobbleTimeoutId);
		clearTimeout(specialAnimationTimeoutId);
		clearTimeout(animationTimeout);

		// Clean up event listener if enabled
		if (eyeTrackingEnabled) {
			document.removeEventListener('mousemove', handleMouseMove);
		}
	});

	// Watch for theme changes
	$: if (ghostSvg && currentTheme) {
		applyTheme();
	}

	// Watch for eye position changes
	$: if (eyesElement && eyePosition) {
		updateEyePosition();
	}

	// Watch for recording state changes
	$: if (ghostSvg && isRecording !== undefined) {
		updateRecordingState();
	}

	// Watch for hover simulation changes
	$: if (ghostSvg && isHoverSimulation !== undefined) {
		updateHoverSimulation();
	}

	// Watch for rainbow sparkle changes
	$: if (ghostSvg && isRainbowSparkle !== undefined && currentTheme === 'rainbow') {
		updateRainbowSparkle();
	}

	// Watch for eye tracking changes
	$: if (eyesElement && eyeTrackingEnabled !== undefined) {
		updateEyeTracking();
	}

	// Watch for blink state changes
	$: if (eyesElement && isBlinking !== undefined) {
		updateBlinkState();
	}

	// Watch for processing state changes
	$: if (eyesElement && isProcessing !== undefined) {
		updateProcessingState();
	}

	// Theme handling
	function applyTheme() {
		// Rainbow needs special handling
		if (currentTheme === 'rainbow' && ghostSvg) {
			const bgLayer = ghostSvg.querySelector('.ghost-bg');
			if (bgLayer) {
				bgLayer.classList.add('rainbow-animated');
			}
		} else if (ghostSvg) {
			const bgLayer = ghostSvg.querySelector('.ghost-bg');
			if (bgLayer) {
				bgLayer.classList.remove('rainbow-animated');
			}
		}

		// Update rainbow sparkle if needed
		if (currentTheme === 'rainbow' && isRainbowSparkle) {
			updateRainbowSparkle();
		}
	}

	// Animation handlers
	function triggerAnimation(animation) {
		// Reset any existing animations
		resetAnimations();

		// Apply the new animation
		currentAnimation = animation;
		// Do not dispatch event when called internally to prevent potential circular reference

		if (animation === 'wobble-left') {
			ghostSvg.classList.add('wobble-left');

			// Reset after animation completes
			animationTimeout = setTimeout(() => {
				ghostSvg.classList.remove('wobble-left');
				currentAnimation = 'none';
				// Do not dispatch event to prevent potential circular reference
			}, 600);
		} else if (animation === 'wobble-right') {
			ghostSvg.classList.add('wobble-right');

			// Reset after animation completes
			animationTimeout = setTimeout(() => {
				ghostSvg.classList.remove('wobble-right');
				currentAnimation = 'none';
				// Do not dispatch event to prevent potential circular reference
			}, 600);
		} else if (animation === 'spin') {
			ghostSvg.classList.add('spin');
			doingSpecialAnimation = true;
			// Do not dispatch event to prevent potential circular reference

			// Reset after animation completes
			animationTimeout = setTimeout(() => {
				ghostSvg.classList.remove('spin');
				currentAnimation = 'none';
				doingSpecialAnimation = false;
				// Do not dispatch events to prevent potential circular reference
			}, 1500);
		}
	}

	// Eye position handler
	function updateEyePosition() {
		if (!eyesElement) return;

		// Remove all position classes first
		eyesElement.classList.remove('looking-left', 'looking-right', 'looking-up', 'looking-down');

		// Apply new position
		if (eyePosition !== 'center') {
			eyesElement.classList.add(`looking-${eyePosition}`);
		}
	}

	// Greeting animation - matches Ghost.svelte
	function greetingAnimation() {
		// Use the wobble animation for greeting
		triggerAnimation('wobble-left');

		// Then do natural double blink with good vibe after wobble completes
		setTimeout(() => {
			// First blink
			if (eyesElement) {
				eyesElement.classList.add('blink-once');
				setTimeout(() => {
					eyesElement.classList.remove('blink-once');

					// Second blink after a short pause
					setTimeout(() => {
						eyesElement.classList.add('blink-once');
						setTimeout(() => {
							eyesElement.classList.remove('blink-once');

							// Start ambient blinking
							scheduleBlink();
						}, 150); // More natural close time
					}, 180); // Better pause between blinks
				}, 150); // More natural open time
			}
		}, 600); // Wait for wobble to complete
	}

	// Regular ambient blinking - matching the original Ghost.svelte behavior
	function scheduleBlink() {
		clearTimeout(blinkTimeoutId);

		// Don't blink during recording or processing
		if (isRecording || isProcessing || doingSpecialAnimation) {
			return;
		}

		// Random delay between blinks (4-8 seconds)
		const delay = 4000 + Math.random() * 4000;

		blinkTimeoutId = setTimeout(() => {
			if (!eyesElement) return;

			// Force a browser reflow to ensure the animation gets reapplied
			void eyesElement.offsetWidth;

			// Single or double blink with good vibe from original component
			if (Math.random() < 0.25) {
				// Double blink (25% chance) - natural feel
				eyesElement.classList.add('blink-double');
				setTimeout(() => {
					eyesElement.classList.remove('blink-double');
					scheduleBlink(); // Schedule next blink
				}, 680); // Duration of double blink animation
			} else {
				// Single blink (75% chance) - natural timing
				eyesElement.classList.add('blink-single');
				setTimeout(() => {
					eyesElement.classList.remove('blink-single');
					scheduleBlink(); // Schedule next blink
				}, 300); // Duration of single blink animation
			}
		}, delay);
	}

	// Special animations that rarely happen (easter egg)
	function maybeDoSpecialAnimation() {
		clearTimeout(specialAnimationTimeoutId);

		// Very rare animation (5% chance when conditions are right)
		if (Math.random() < 0.05 && !isRecording && !isProcessing && !doingSpecialAnimation) {
			triggerAnimation('spin');
		}

		// Schedule next check
		specialAnimationTimeoutId = setTimeout(maybeDoSpecialAnimation, 45000); // Check every 45 seconds
	}

	// Manual blinking handlers
	function updateBlinkState() {
		if (!eyesElement) return;

		if (isBlinking) {
			eyesElement.classList.add('blinking');
			// Pause ambient blinking while manually blinking
			clearTimeout(blinkTimeoutId);
		} else {
			eyesElement.classList.remove('blinking');
			// Resume ambient blinking
			if (ambientBlinking) {
				scheduleBlink();
			}
		}
	}

	export function toggleAmbientBlinking() {
		if (!eyesElement) return;

		ambientBlinking = !ambientBlinking;
		// Remove event dispatch to prevent potential circular reference

		if (ambientBlinking) {
			scheduleBlink();
		} else {
			clearTimeout(blinkTimeoutId);
		}
	}

	// Start thinking animation
	export function startThinking() {
		if (!eyesElement) return;

		// Clear other blink animations
		clearTimeout(blinkTimeoutId);
		eyesElement.classList.remove('blink-single', 'blink-double', 'blinking');

		// Add thinking animation
		eyesElement.classList.add('blink-thinking-hard');
	}

	// Stop thinking animation
	export function stopThinking() {
		if (!eyesElement) return;

		eyesElement.classList.remove('blink-thinking-hard');

		// Resume ambient blinking
		if (ambientBlinking) {
			scheduleBlink();
		}
	}

	// Update processing state
	function updateProcessingState() {
		if (isProcessing) {
			// Clear blink scheduling during processing
			clearTimeout(blinkTimeoutId);
			startThinking();
		} else {
			stopThinking();

			// Resume ambient blinking after a delay
			if (ambientBlinking) {
				setTimeout(() => {
					scheduleBlink();
				}, 1000);
			}
		}
	}

	// Pulse animation (subtle grow/shrink)
	export function pulse() {
		if (!ghostSvg) return;

		// Add pulse class
		ghostSvg.classList.add('ghost-pulse');

		// Remove class after animation completes
		setTimeout(() => {
			ghostSvg.classList.remove('ghost-pulse');
		}, 600);
	}

	// React to transcript length animation
	export function reactToTranscript(textLength = 'long') {
		if (!eyesElement) return;

		// Clear other animations
		clearTimeout(blinkTimeoutId);

		if (textLength === 'long') {
			// For longer transcripts, do a "satisfied" double blink
			setTimeout(() => {
				eyesElement.classList.add('blink-once');
				setTimeout(() => {
					eyesElement.classList.remove('blink-once');
					setTimeout(() => {
						eyesElement.classList.add('blink-once');
						setTimeout(() => {
							eyesElement.classList.remove('blink-once');
							// Resume ambient blinking
							if (ambientBlinking) {
								scheduleBlink();
							}
						}, 200);
					}, 200);
				}, 200);
			}, 500);
		} else {
			// For short transcripts, just do a single blink
			setTimeout(() => {
				eyesElement.classList.add('blink-once');
				setTimeout(() => {
					eyesElement.classList.remove('blink-once');
					// Resume ambient blinking
					if (ambientBlinking) {
						scheduleBlink();
					}
				}, 300);
			}, 500);
		}
	}

	// Special reaction animations
	export function doSpecialAnimation() {
		if (!ghostSvg) return;

		// Clear other animations
		resetAnimations();

		// Force special animation
		doingSpecialAnimation = true;
		// Remove event dispatch to prevent potential circular reference
		triggerAnimation('spin');
	}

	// Combined animation sequence
	export function doFullAnimationSequence() {
		if (!ghostSvg || !eyesElement) return;

		// Step 1: Wobble
		triggerAnimation('wobble-left');

		// Step 2: Double blink after wobble
		setTimeout(() => {
			reactToTranscript('long');

			// Step 3: Pulse after reaction
			setTimeout(() => {
				pulse();

				// Step 4: Finally, do the spin (rarely seen)
				setTimeout(() => {
					doSpecialAnimation();
				}, 1500);
			}, 1500);
		}, 800);
	}

	// Recording state handler
	function updateRecordingState() {
		if (isRecording) {
			// Clear blink scheduling during recording
			clearTimeout(blinkTimeoutId);

			// Add recording class
			ghostSvg.classList.add('recording');

			// Apply theme-specific recording class if enabled
			if (useThemeSpecificRecording) {
				// Specific recording styles are applied through CSS based on theme class
				console.log(`Using theme-specific recording for ${currentTheme}`);
			}
		} else {
			ghostSvg.classList.remove('recording');

			// Resume ambient blinking after a delay
			if (ambientBlinking) {
				setTimeout(() => {
					scheduleBlink();
				}, 1000);
			}
		}
	}

	// Reset all animations
	export function resetAnimations() {
		if (!ghostSvg || !eyesElement) return;

		// Clear any pending timeouts
		if (animationTimeout) clearTimeout(animationTimeout);

		// Remove animation classes
		ghostSvg.classList.remove('wobble-left', 'wobble-right', 'spin');
		eyesElement.classList.remove('blink-single', 'blink-double', 'blink-thinking-hard');

		// Reset state
		currentAnimation = 'none';
		// Do not dispatch event to prevent potential circular reference
	}

	// Function to restart the grow-ghost entrance animation
	export function restartGrowAnimation() {
		if (!ghostSvg) return;

		// First, temporarily hide the ghost layers
		const layers = ghostSvg.querySelectorAll('.ghost-layer');
		layers.forEach((layer) => {
			layer.style.animation = 'none';
			layer.style.opacity = '0';
			layer.style.transform = 'scale(0)';
		});

		// Force browser reflow
		void ghostSvg.offsetWidth;

		// Then restart the animation after a tiny delay
		setTimeout(() => {
			layers.forEach((layer) => {
				layer.style.animation = '';
				layer.style.opacity = '';
				layer.style.transform = '';

				// Re-add the grow-ghost animation
				layer.style.animation = 'grow-ghost 2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
			});
		}, 50);
	}

	// Toggle hover simulation
	function updateHoverSimulation() {
		if (isHoverSimulation) {
			ghostSvg.classList.add('hover-simulation');
		} else {
			ghostSvg.classList.remove('hover-simulation');
		}
	}

	// Toggle rainbow sparkle effect (only works with rainbow theme)
	function updateRainbowSparkle() {
		const bgLayer = ghostSvg.querySelector('.ghost-bg');
		if (!bgLayer) return;

		if (isRainbowSparkle) {
			bgLayer.classList.add('rainbow-sparkle');
		} else {
			bgLayer.classList.remove('rainbow-sparkle');
		}
	}

	// Toggle theme-specific recording
	export function toggleThemeSpecificRecording() {
		useThemeSpecificRecording = !useThemeSpecificRecording;
		dispatch('themeSpecificRecordingChange', { useThemeSpecificRecording });

		// If recording, update the effect immediately
		if (isRecording) {
			// Remove standard recording class
			ghostSvg.classList.remove('recording');

			// Force reflow
			void ghostSvg.offsetWidth;

			// Re-add with updated value
			ghostSvg.classList.add('recording');
		}
	}

	// Track mouse movement for eyes
	let lastMouseX = 0;
	let lastMouseY = 0;

	function handleMouseMove(event) {
		if (!eyeTrackingEnabled || !ghostSvg || !eyesElement) return;

		// Get ghost element bounding box
		const ghostRect = ghostSvg.getBoundingClientRect();
		const ghostCenterX = ghostRect.left + ghostRect.width / 2;
		const ghostCenterY = ghostRect.top + ghostRect.height / 2;

		// Calculate mouse position relative to ghost center
		const mouseX = event.clientX;
		const mouseY = event.clientY;
		const distanceX = mouseX - ghostCenterX;
		const distanceY = mouseY - ghostCenterY;

		// Normalize to values between -1 and 1
		const maxDistanceX = window.innerWidth / 3;
		const maxDistanceY = window.innerHeight / 3;
		const normalizedX = Math.max(-1, Math.min(1, distanceX / maxDistanceX));
		const normalizedY = Math.max(-1, Math.min(1, distanceY / maxDistanceY));

		// Apply directly to eye element
		eyesElement.style.transform = `translate(${normalizedX * 4}px, ${normalizedY * 2}px)`;

		// Store last position
		lastMouseX = normalizedX;
		lastMouseY = normalizedY;
	}

	// Update eye tracking state
	function updateEyeTracking() {
		if (eyeTrackingEnabled) {
			// Remove any eye position classes
			eyesElement.classList.remove('looking-left', 'looking-right', 'looking-up', 'looking-down');

			// Add event listener
			document.addEventListener('mousemove', handleMouseMove);
		} else {
			// Reset eyes
			eyesElement.style.transform = '';

			// Reapply current eye position if any
			if (eyePosition !== 'center') {
				eyesElement.classList.add(`looking-${eyePosition}`);
			}

			// Remove event listener
			document.removeEventListener('mousemove', handleMouseMove);
		}
	}

	// Export setter functions for parent component use
	export function setEyePosition(position) {
		eyePosition = position;
		// Remove event dispatch to prevent infinite loop
		updateEyePosition();
	}
</script>

<svg
	bind:this={ghostSvg}
	viewBox="0 0 1024 1024"
	xmlns="http://www.w3.org/2000/svg"
	xmlns:xlink="http://www.w3.org/1999/xlink"
	class="ghost-svg theme-{currentTheme} {isRecording ? 'recording' : ''}"
>
	<!-- Gradient definitions -->
	<defs>
		<!-- Peach Theme Gradient (Default) -->
		<linearGradient id="peachGradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="var(--ghost-peach-start)" />
			<stop offset="35%" stop-color="var(--ghost-peach-mid1)" />
			<stop offset="65%" stop-color="var(--ghost-peach-mid2)" />
			<stop offset="85%" stop-color="var(--ghost-peach-mid3)" />
			<stop offset="100%" stop-color="var(--ghost-peach-end)" />
		</linearGradient>

		<!-- Mint Theme Gradient -->
		<linearGradient id="mintGradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="var(--ghost-mint-start)" />
			<stop offset="35%" stop-color="var(--ghost-mint-mid1)" />
			<stop offset="65%" stop-color="var(--ghost-mint-mid2)" />
			<stop offset="85%" stop-color="var(--ghost-mint-mid3)" />
			<stop offset="100%" stop-color="var(--ghost-mint-end)" />
		</linearGradient>

		<!-- Bubblegum Theme Gradient -->
		<linearGradient id="bubblegumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="var(--ghost-bubblegum-start)" />
			<stop offset="35%" stop-color="var(--ghost-bubblegum-mid1)" />
			<stop offset="65%" stop-color="var(--ghost-bubblegum-mid2)" />
			<stop offset="85%" stop-color="var(--ghost-bubblegum-mid3)" />
			<stop offset="100%" stop-color="var(--ghost-bubblegum-end)" />
		</linearGradient>

		<!-- Rainbow Theme Gradient -->
		<linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="var(--ghost-rainbow-start)" />
			<stop offset="25%" stop-color="var(--ghost-rainbow-mid1)" />
			<stop offset="50%" stop-color="var(--ghost-rainbow-mid2)" />
			<stop offset="75%" stop-color="var(--ghost-rainbow-mid3)" />
			<stop offset="100%" stop-color="var(--ghost-rainbow-end)" />
		</linearGradient>
	</defs>

	<!-- LAYER 1: Background with Gradient Fill -->
	<g class="ghost-layer ghost-bg">
		<use
			xlink:href="/ghost-data/ghost-paths.svg#ghost-background"
			class="ghost-shape"
			fill="url(#{currentTheme}Gradient)"
		/>
	</g>

	<!-- LAYER 2: Outline Layer -->
	<g class="ghost-layer ghost-outline">
		<use
			xlink:href="/ghost-data/ghost-paths.svg#ghost-body-path"
			class="ghost-outline-path"
			fill="#000000"
			opacity="1"
		/>
	</g>

	<!-- LAYER 3: Eyes Layer -->
	<g class="ghost-layer ghost-eyes {isBlinking ? 'blinking' : ''}">
		<!-- Left Eye -->
		<use
			xlink:href="/ghost-data/ghost-paths.svg#ghost-eye-left-path"
			class="ghost-eye ghost-eye-left"
			fill="#000000"
		/>

		<!-- Right Eye -->
		<use
			xlink:href="/ghost-data/ghost-paths.svg#ghost-eye-right-path"
			class="ghost-eye ghost-eye-right"
			fill="#000000"
		/>
	</g>
</svg>

<style>
	.ghost-svg {
		width: 100%;
		max-width: 200px;
		height: auto;
	}
</style>
