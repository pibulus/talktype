<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import './ghost-animations.css';
	import './ghost-themes.css';
	import ghostPathsUrl from './ghost-paths.svg?url';
	import {
		initGradientAnimation,
		cleanupAnimation,
		cleanupAllAnimations
	} from './gradientAnimator';
	import {
		BLINK_CONFIG,
		WOBBLE_CONFIG,
		SPECIAL_CONFIG,
		PULSE_CONFIG,
		EYE_CONFIG,
		ANIMATION_TIMING,
		CSS_CLASSES,
		injectAnimationVariables,
		generateAnimationCssVariables
	} from './animationConfig';
	import { THEMES } from '$lib/constants.js';
	import { gradientAnimations, getThemeColor } from './gradientConfig';

	// Props to communicate state
	export let isRecording = false;
	export let isProcessing = false;
	export let animationState = 'idle'; // 'idle', 'wobble-start', 'wobble-stop'
	export let debug = false; // General debug mode
	export let debugAnim = false; // Animation debug mode - shows animation config

	// DOM element references
	let ghostSvg;
	let leftEye;
	let rightEye;
	let backgroundElement;
	let ghostStyleElement;

	// Local state
	let blinkTimeoutId = null;
	let wobbleTimeoutId = null;
	let specialAnimationTimeoutId = null;
	let eyesClosed = false;
	let isWobbling = false;
	let eyePositionX = 0; // For horizontal eye tracking: -1 to 1
	let eyePositionY = 0; // For vertical eye tracking: -1 to 1
	let doingSpecialAnimation = false; // For rare spin animation (easter egg)
	let currentTheme = 'peach';

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Force a browser reflow to ensure animations apply correctly
	function forceReflow(element) {
		if (!element) return;
		void element.offsetWidth;
	}

	// Update theme based on document attribute
	function updateTheme() {
		if (typeof document !== 'undefined') {
			// Get the previous theme to clean up its animations
			const previousTheme = currentTheme;

			// Update current theme
			currentTheme = document.documentElement.getAttribute('data-theme') || 'peach';

			// Regenerate dynamic CSS variables for new theme
			initDynamicStyles();

			// Apply theme animation after theme update
			if (ghostSvg) {
				const svgElement = ghostSvg.querySelector('svg');
				if (svgElement) {
					// Reset any animations by forcing reflow
					void svgElement.offsetWidth;

					// Get the shape element
					const shapeElem = svgElement.querySelector('#ghost-shape');

					if (shapeElem) {
						// Force shape animation restart
						void shapeElem.offsetWidth;
					}

					// Clean up previous gradient animation
					cleanupAnimation(previousTheme);

					// Initialize new gradient animation
					initGradientAnimation(currentTheme, svgElement);
				}
			}
		}
	}

	// Track mouse movement for eye tracking
	function handleMouseMove(event) {
		if (typeof window === 'undefined' || !ghostSvg || eyesClosed) return;

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
		const maxDistanceX = window.innerWidth / EYE_CONFIG.X_DIVISOR;
		const maxDistanceY = window.innerHeight / EYE_CONFIG.Y_DIVISOR;
		const normalizedX = Math.max(-1, Math.min(1, distanceX / maxDistanceX));
		const normalizedY = Math.max(-1, Math.min(1, distanceY / maxDistanceY));

		// Add smaller dead zone for more responsiveness
		if (Math.abs(normalizedX) < EYE_CONFIG.DEAD_ZONE) {
			eyePositionX = 0;
		} else {
			// Apply smoothing for better tactility
			eyePositionX = eyePositionX + (normalizedX - eyePositionX) * EYE_CONFIG.SMOOTHING;
		}

		// Vertical tracking with smaller movement range
		if (Math.abs(normalizedY) < EYE_CONFIG.DEAD_ZONE) {
			eyePositionY = 0;
		} else {
			// Apply smoothing for better tactility
			eyePositionY = eyePositionY + (normalizedY - eyePositionY) * EYE_CONFIG.SMOOTHING;
		}

		// Apply eye transforms directly with inline styles
		applyEyeTransforms();
	}

	// Apply eye transforms based on current state
	function applyEyeTransforms() {
		if (!leftEye || !rightEye) return;

		if (eyesClosed) {
			leftEye.style.transform = `scaleY(${EYE_CONFIG.CLOSED_SCALE})`;
			rightEye.style.transform = `scaleY(${EYE_CONFIG.CLOSED_SCALE})`;
		} else {
			leftEye.style.transform = `translate(${eyePositionX * EYE_CONFIG.X_MULTIPLIER}px, ${eyePositionY * EYE_CONFIG.Y_MULTIPLIER}px)`;
			rightEye.style.transform = `translate(${eyePositionX * EYE_CONFIG.X_MULTIPLIER}px, ${eyePositionY * EYE_CONFIG.Y_MULTIPLIER}px)`;
		}
	}

	// Helper function for single blink
	function performSingleBlink(onComplete) {
		eyesClosed = true;
		applyEyeTransforms();

		setTimeout(() => {
			eyesClosed = false;
			applyEyeTransforms();

			if (onComplete) {
				onComplete();
			}
		}, BLINK_CONFIG.SINGLE_DURATION);
	}

	// Helper function for double blink
	function performDoubleBlink(onComplete) {
		eyesClosed = true;
		applyEyeTransforms();

		setTimeout(() => {
			eyesClosed = false;
			applyEyeTransforms();

			setTimeout(() => {
				eyesClosed = true;
				applyEyeTransforms();

				setTimeout(() => {
					eyesClosed = false;
					applyEyeTransforms();

					if (onComplete) {
						onComplete();
					}
				}, BLINK_CONFIG.SINGLE_DURATION);
			}, BLINK_CONFIG.DOUBLE_PAUSE);
		}, BLINK_CONFIG.SINGLE_DURATION);
	}

	// Regular ambient blinking
	function scheduleBlink() {
		clearTimeout(blinkTimeoutId);

		// Don't blink during recording or processing
		if (isRecording || isProcessing) {
			return;
		}

		// Random delay between blinks using config settings
		const delay =
			BLINK_CONFIG.MIN_GAP + Math.random() * (BLINK_CONFIG.MAX_GAP - BLINK_CONFIG.MIN_GAP);

		blinkTimeoutId = setTimeout(() => {
			// Chance of double blink based on config
			if (Math.random() < BLINK_CONFIG.DOUBLE_CHANCE) {
				performDoubleBlink(() => scheduleBlink());
			} else {
				performSingleBlink(() => scheduleBlink());
			}
		}, delay);
	}

	// Handle click events
	function handleClick() {
		dispatch('toggleRecording');
	}

	/**
	 * Generate CSS variables for gradient colors
	 * Creates CSS variables for all themes and their color stops
	 */
	function generateCssVariables() {
		let cssVars = '';

		// Available themes
		const themes = ['peach', 'mint', 'bubblegum', 'rainbow'];

		// Add CSS variables for each theme's gradient colors
		themes.forEach((theme) => {
			if (!gradientAnimations[theme]) return;

			// Get stop positions from gradient config
			const positions = gradientAnimations[theme].stopPositions || [
				'start',
				'mid1',
				'mid2',
				'mid3',
				'end'
			];

			// Add variables for each color stop in both regular and bright variants
			positions.forEach((position) => {
				// Regular color
				const colorValue = getThemeColor(theme, position, false);
				cssVars += `--ghost-${theme}-${position}-color: ${colorValue};\n`;

				// Bright variant
				const brightColorValue = getThemeColor(theme, position, true);
				cssVars += `--ghost-${theme}-${position}-color-bright: ${brightColorValue};\n`;
			});

			// Add animation speed variables
			if (gradientAnimations[theme].position) {
				cssVars += `--ghost-${theme}-position-speed: ${gradientAnimations[theme].position.speed};\n`;
				cssVars += `--ghost-${theme}-position-amplitude: ${gradientAnimations[theme].position.amplitude}%;\n`;
			}
		});

		return cssVars;
	}

	// Initialize dynamic CSS variables
	function initDynamicStyles() {
		if (typeof document === 'undefined') return;

		// Create a style element if it doesn't exist for gradient variables
		if (!ghostStyleElement) {
			ghostStyleElement = document.createElement('style');
			ghostStyleElement.id = 'ghost-dynamic-styles';
			document.head.appendChild(ghostStyleElement);
		}

		// Generate and inject gradient CSS variables
		const gradientVars = generateCssVariables();
		ghostStyleElement.textContent = `:root {\n  ${gradientVars}\n}`;

		// Inject animation variables from animationConfig.js
		injectAnimationVariables();

		// Log animation configuration if debug mode is enabled
		if (debugAnim && console) {
			console.log('Ghost Animation Configuration:', {
				theme: currentTheme,
				gradientVariables: gradientVars.split('\n')
			});
		}
	}

	// Lifecycle hooks
	onMount(() => {
		// Initialize dynamic CSS variables
		initDynamicStyles();

		// Update theme on mount
		if (typeof document !== 'undefined') {
			updateTheme();

			// Initialize gradient animations
			if (ghostSvg) {
				const svgElement = ghostSvg.querySelector('svg');
				if (svgElement) {
					initGradientAnimation(currentTheme, svgElement);
				}
			}

			// Add initial-load class to container for entrance animation
			// Add it to document body so it persists across potential component rerenders
			document.body.classList.add(CSS_CLASSES.INITIAL_LOAD);

			// Remove the class after animation completes to prevent future triggers
			setTimeout(() => {
				document.body.classList.remove(CSS_CLASSES.INITIAL_LOAD);

				// Start greeting wobble animation after grow animation completes
				if (ghostSvg) {
					// Apply wobble-left directly to the SVG
					ghostSvg.querySelector('svg').classList.add(CSS_CLASSES.WOBBLE_LEFT);

					// Clear wobble after animation completes
					setTimeout(() => {
						ghostSvg.querySelector('svg').classList.remove(CSS_CLASSES.WOBBLE_LEFT);

						// Then do natural double blink after wobble completes
						performDoubleBlink(() => {
							scheduleBlink(); // Start ambient blinking after greeting
						});
					}, WOBBLE_CONFIG.CLEANUP_DELAY);
				} else {
					// Fallback if SVG not available
					performDoubleBlink(() => {
						scheduleBlink();
					});
				}
			}, ANIMATION_TIMING.INITIAL_LOAD_DURATION);

			// Listen for theme changes
			setTimeout(() => {
				const observer = new MutationObserver((mutations) => {
					mutations.forEach((mutation) => {
						if (mutation.attributeName === 'data-theme') {
							updateTheme();
						}
					});
				});

				observer.observe(document.documentElement, {
					attributes: true,
					attributeFilter: ['data-theme']
				});
			}, ANIMATION_TIMING.OBSERVER_SETUP_DELAY);

			// Start tracking mouse movement for eye position
			document.addEventListener('mousemove', handleMouseMove, { passive: true });

			// Start special animation detection (easter egg)
			maybeDoSpecialAnimation();

			return () => {
				observer.disconnect();
				document.removeEventListener('mousemove', handleMouseMove);
				clearTimeout(specialAnimationTimeoutId);
				clearTimeout(wobbleTimeoutId);
				cleanupAllAnimations();

				// Clean up style element on component destruction
				if (ghostStyleElement) {
					ghostStyleElement.remove();
				}
			};
		}
	});

	// Clean up on destroy
	onDestroy(() => {
		clearTimeout(blinkTimeoutId);
		clearTimeout(wobbleTimeoutId);
		clearTimeout(specialAnimationTimeoutId);
		cleanupAllAnimations();

		// Remove dynamic styles
		if (ghostStyleElement) {
			ghostStyleElement.remove();
		}
	});

	// Export function to adjust gradient animation settings during runtime
	export function updateGradientSettings(themeId, settings) {
		if (!settings || !themeId) return;

		// Re-initialize gradient animations with updated settings
		if (ghostSvg) {
			const svgElement = ghostSvg.querySelector('svg');
			if (svgElement) {
				// Clean up existing animations
				cleanupAnimation(themeId);

				// Reinitialize with new settings
				initGradientAnimation(themeId, svgElement);

				// Regenerate CSS variables
				initDynamicStyles();
			}
		}
	}

	// Special animations that rarely happen (easter egg)
	function maybeDoSpecialAnimation() {
		if (typeof window === 'undefined') return;

		clearTimeout(specialAnimationTimeoutId);

		// Special animation with configurable chance
		if (
			Math.random() < SPECIAL_CONFIG.CHANCE &&
			!isRecording &&
			!isProcessing &&
			!doingSpecialAnimation &&
			!eyesClosed
		) {
			doingSpecialAnimation = true;

			// Do a special animation (full spin)
			if (ghostSvg) {
				ghostSvg.classList.add(CSS_CLASSES.SPIN);
			}

			// Return to normal after animation
			setTimeout(() => {
				if (ghostSvg) {
					ghostSvg.classList.remove(CSS_CLASSES.SPIN);
				}
				doingSpecialAnimation = false;
			}, SPECIAL_CONFIG.DURATION);
		}

		// Schedule next check using config interval
		specialAnimationTimeoutId = setTimeout(maybeDoSpecialAnimation, SPECIAL_CONFIG.CHECK_INTERVAL);
	}

	// Public methods to expose animation controls
	export function pulse() {
		// Add subtle pulse animation
		if (ghostSvg) {
			ghostSvg.classList.add(CSS_CLASSES.PULSE);
			setTimeout(() => {
				ghostSvg.classList.remove(CSS_CLASSES.PULSE);
			}, PULSE_CONFIG.DURATION);
		}
	}

	export function startThinking() {
		// Add thinking hard animation for eyes
		if (leftEye && rightEye) {
			// Stop ambient blinking
			clearTimeout(blinkTimeoutId);

			// Thinking blink pattern
			const thinkingInterval = setInterval(() => {
				if (!isProcessing) {
					clearInterval(thinkingInterval);
					return;
				}

				// Close eyes
				eyesClosed = true;
				applyEyeTransforms();

				// Open after short delay
				setTimeout(() => {
					eyesClosed = false;
					applyEyeTransforms();
				}, BLINK_CONFIG.THINKING_RATE);
			}, BLINK_CONFIG.THINKING_INTERVAL);
		}

		isProcessing = true;
	}

	export function stopThinking() {
		isProcessing = false;

		// Resume ambient blinking
		setTimeout(() => {
			scheduleBlink();
		}, BLINK_CONFIG.RESUME_DELAY);
	}

	export function reactToTranscript(textLength = 0) {
		// Skip if no element
		if (!leftEye || !rightEye) return;

		clearTimeout(blinkTimeoutId);

		if (textLength === 0) {
			scheduleBlink();
			return;
		}

		// Small delay before reacting
		setTimeout(() => {
			if (textLength > EYE_CONFIG.TEXT_THRESHOLD) {
				// For longer transcripts, do a "satisfied" double blink
				performDoubleBlink(() => scheduleBlink());
			} else {
				// For short transcripts, just do a single blink
				performSingleBlink(() => scheduleBlink());
			}
		}, EYE_CONFIG.REACT_DELAY);
	}

	// Function to force wobble animation - works with both direct calls and animation state
	export function forceWobble(direction = '', isStartRecording = false) {
		// Make sure we're in browser context
		if (typeof window === 'undefined') return;

		// Force animation restart by setting to false first
		isWobbling = false;

		// Force a browser reflow to ensure the animation gets reapplied
		if (ghostSvg) {
			forceReflow(ghostSvg);
		}

		// Choose direction
		const wobbleDirection =
			direction ||
			(Math.random() < WOBBLE_CONFIG.LEFT_CHANCE
				? CSS_CLASSES.WOBBLE_LEFT
				: CSS_CLASSES.WOBBLE_RIGHT);

		// Apply animation class to the SVG element (child of the button)
		const svgElement = ghostSvg?.querySelector('svg');
		if (svgElement) {
			console.log(`Applying ${wobbleDirection} to SVG element`);
			svgElement.classList.add(wobbleDirection);
		} else {
			console.warn('SVG element not found for wobble animation');
		}

		// Now set to true to start animation
		isWobbling = true;

		// Clear any existing wobble timer
		clearTimeout(wobbleTimeoutId);

		// Schedule the wobble to end after animation completes
		wobbleTimeoutId = setTimeout(() => {
			if (svgElement) {
				svgElement.classList.remove(CSS_CLASSES.WOBBLE_LEFT, CSS_CLASSES.WOBBLE_RIGHT);
			}
			isWobbling = false;
		}, WOBBLE_CONFIG.DURATION);
	}

	// Track previous state to detect actual changes
	let wasRecording = false;
	let wasProcessing = false;

	// Watch for animation state changes
	$: if (animationState) {
		// Run only when animationState actually changes
		// Apply animations based on animation state
		if (animationState === 'wobble-start') {
			forceWobble(CSS_CLASSES.WOBBLE_LEFT, true);
		} else if (animationState === 'wobble-stop') {
			forceWobble(CSS_CLASSES.WOBBLE_RIGHT);
		}
	}

	// Watch for changes in recording/processing state - only for blinking
	$: {
		// Track previous state for blink management
		const wasRecordingTemp = wasRecording;
		const wasProcessingTemp = wasProcessing;

		// Blink handling
		if (isRecording || isProcessing) {
			// Clear any scheduled blinks during recording/processing
			clearTimeout(blinkTimeoutId);
		} else if ((wasRecordingTemp || wasProcessingTemp) && !isRecording && !isProcessing) {
			// Restart blinking after a delay when we're fully stopped
			setTimeout(() => {
				scheduleBlink();
			}, BLINK_CONFIG.RESUME_DELAY * 2);
		}

		// Update previous state for next comparison
		wasRecording = isRecording;
		wasProcessing = isProcessing;
	}
</script>

<button
	bind:this={ghostSvg}
	class="ghost-container theme-{currentTheme} 
      {isRecording
		? `${CSS_CLASSES.RECORDING} recording-theme-${currentTheme} ghost-recording-glow-${currentTheme}`
		: ''}
      {isWobbling
		? `ghost-wobble-${Math.random() < WOBBLE_CONFIG.LEFT_CHANCE ? 'left' : 'right'}`
		: ''} 
      {doingSpecialAnimation ? 'do-special-animation' : ''}"
	on:click={handleClick}
	on:keydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}}
	aria-label="Toggle Recording"
	aria-pressed={isRecording.toString()}
>
	<svg
		viewBox="0 0 1024 1024"
		xmlns="http://www.w3.org/2000/svg"
		xmlns:xlink="http://www.w3.org/1999/xlink"
		class="ghost-svg theme-{currentTheme} {isRecording ? CSS_CLASSES.RECORDING : ''} {debugAnim
			? 'debug-animation'
			: ''}"
	>
		<defs>
			<linearGradient id="peachGradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="var(--ghost-peach-start)" />
				<stop offset="35%" stop-color="var(--ghost-peach-mid1)" />
				<stop offset="65%" stop-color="var(--ghost-peach-mid2)" />
				<stop offset="85%" stop-color="var(--ghost-peach-mid3)" />
				<stop offset="100%" stop-color="var(--ghost-peach-end)" />
			</linearGradient>

			<linearGradient id="mintGradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="var(--ghost-mint-start)" />
				<stop offset="35%" stop-color="var(--ghost-mint-mid1)" />
				<stop offset="65%" stop-color="var(--ghost-mint-mid2)" />
				<stop offset="85%" stop-color="var(--ghost-mint-mid3)" />
				<stop offset="100%" stop-color="var(--ghost-mint-end)" />
			</linearGradient>

			<linearGradient id="bubblegumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="var(--ghost-bubblegum-start)" />
				<stop offset="35%" stop-color="var(--ghost-bubblegum-mid1)" />
				<stop offset="65%" stop-color="var(--ghost-bubblegum-mid2)" />
				<stop offset="85%" stop-color="var(--ghost-bubblegum-mid3)" />
				<stop offset="100%" stop-color="var(--ghost-bubblegum-end)" />
			</linearGradient>

			<linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="var(--ghost-rainbow-start)" />
				<stop offset="25%" stop-color="var(--ghost-rainbow-mid1)" />
				<stop offset="50%" stop-color="var(--ghost-rainbow-mid2)" />
				<stop offset="75%" stop-color="var(--ghost-rainbow-mid3)" />
				<stop offset="100%" stop-color="var(--ghost-rainbow-end)" />
			</linearGradient>
		</defs>

		<g class="ghost-layer ghost-bg" bind:this={backgroundElement}>
			<use
				xlink:href={ghostPathsUrl}
				href={ghostPathsUrl + '#ghost-background'}
				class="ghost-shape"
				id="ghost-shape"
				fill="url(#{currentTheme}Gradient)"
			/>
		</g>

		<g class="ghost-layer ghost-outline">
			<use
				xlink:href={ghostPathsUrl}
				href={ghostPathsUrl + '#ghost-body-path'}
				class="ghost-outline-path"
				fill="#000000"
				opacity="1"
			/>
		</g>

		<g class="ghost-layer ghost-eyes">
			<use
				bind:this={leftEye}
				xlink:href={ghostPathsUrl}
				href={ghostPathsUrl + '#ghost-eye-left-path'}
				class="ghost-eye ghost-eye-left"
				fill="#000000"
			/>
			<use
				bind:this={rightEye}
				xlink:href={ghostPathsUrl}
				href={ghostPathsUrl + '#ghost-eye-right-path'}
				class="ghost-eye ghost-eye-right"
				fill="#000000"
			/>
		</g>
	</svg>
</button>

<style>
	.ghost-container {
		position: relative;
		width: 100%;
		height: 100%;
		cursor: pointer;
		background: transparent;
		border: none;
		outline: none;
		-webkit-tap-highlight-color: transparent;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.ghost-container:focus,
	.ghost-container:active,
	.ghost-container:focus-visible {
		outline: none !important;
		outline-offset: 0 !important;
		box-shadow: none !important;
		border: none !important;
	}

	.ghost-svg {
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
	}

	.ghost-layer {
		transform-origin: center center;
	}

	/* Apply grow animation only on initial load with a separate class */
	:global(.initial-load) .ghost-layer {
		animation: grow-ghost var(--ghost-grow-duration, 2s) cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	/* Dynamically apply animation durations from config */
	.ghost-svg.theme-peach #ghost-shape {
		animation-duration: var(--ghost-shimmer-duration, 5s), var(--ghost-peach-flow-duration, 9s);
		animation-timing-function: var(--ghost-shimmer-ease, ease-in-out),
			var(--ghost-peach-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	.ghost-svg.theme-mint #ghost-shape {
		animation-duration: var(--ghost-shimmer-duration, 6s), var(--ghost-mint-flow-duration, 10s);
		animation-timing-function: var(--ghost-shimmer-ease, ease-in-out),
			var(--ghost-mint-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	.ghost-svg.theme-bubblegum #ghost-shape {
		animation-duration: var(--ghost-shimmer-duration, 7s), var(--ghost-bubblegum-flow-duration, 12s);
		animation-timing-function: var(--ghost-shimmer-ease, ease-in-out),
			var(--ghost-bubblegum-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	.ghost-svg.theme-rainbow #ghost-shape {
		animation-duration: var(--ghost-rainbow-flow-duration, 9s);
		animation-timing-function: var(--ghost-rainbow-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	/* Debug mode styles */
	.ghost-svg.debug-animation {
		border: 1px dashed rgba(255, 0, 0, 0.5);
	}

	.ghost-svg.debug-animation #ghost-shape {
		outline: 1px dotted rgba(0, 255, 0, 0.5);
	}

	.ghost-svg.debug-animation .ghost-eye {
		outline: 1px dotted rgba(0, 0, 255, 0.5);
	}

	/* Slow down animations in debug mode for easier inspection */
	.ghost-svg.debug-animation #ghost-shape {
		animation-duration: calc(var(--ghost-shimmer-duration, 5s) * 2),
			calc(var(--ghost-peach-flow-duration, 9s) * 2) !important;
	}
</style>
