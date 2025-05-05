<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';

	// CSS imports
	import './ghost-animations.css';
	// Removed import for ghost-themes.css (styles injected dynamically)

	// SVG paths
	import ghostPathsUrl from './ghost-paths.svg?url';

	// Configuration
	import {
		ANIMATION_STATES,
		CSS_CLASSES,
		PULSE_CONFIG
		// Removed EYE_CONFIG, WOBBLE_CONFIG (used internally by services/stores)
		// Removed injectAnimationVariables (handled by themeStore)
	} from './animationConfig.js';

	// Removed THEMES import (managed by themeStore)

	// Import stores (main instances)
	import { ghostStateStore, theme as localTheme, cssVariables } from './stores/index.js';

	// Import services (main instances)
	import { animationService, blinkService } from './services/index.js';

	// Import animation utilities
	import { forceReflow } from './utils/animationUtils.js'; // Only forceReflow needed directly

	// Import gradient animator for theme updates
	import { cleanupAllAnimations, initGradientAnimation } from './gradientAnimator.js';

	// Props to communicate state
	export let isRecording = false;
	export let isProcessing = false;
	export let animationState = ANIMATION_STATES.IDLE; // Current animation state
	export let debug = false; // General debug mode
	export let debugAnim = false; // Animation debug mode - shows animation config
	export let seed = 0; // Seed for randomizing animations, allows multiple ghosts to have unsynchronized animations
	export let externalTheme = null; // Optional external theme store for integration with app-level theme

	// Style props for flexible sizing and appearance
	export let width = '100%';
	export let height = '100%';
	export let opacity = 1;
	export let scale = 1;
	export let clickable = true; // Whether the ghost responds to clicks

	// DOM element references
	let ghostSvg;
	let leftEye;
	let rightEye;
	let backgroundElement;
	let ghostStyleElement;

	// Timer references for cleanup
	const timers = {};

	// State tracking to prevent infinite loops
	let lastRecordingState = false;
	let lastProcessingState = false;
	let lastAnimationState = animationState;
	let lastAppliedWobbleDirection = null;

	// Additional state variables
	let currentTheme;
	let themeStore = externalTheme || localTheme;
	let unsubscribeTheme;
	let isRecordingTransition = false;
	let manualStateChange = false;

	// Reactive variable for wobble group classes
	$: wobbleGroupClasses = `ghost-wobble-group ${
		$ghostStateStore.isWobbling && $ghostStateStore.wobbleDirection === CSS_CLASSES.WOBBLE_LEFT
			? CSS_CLASSES.WOBBLE_LEFT
			: ''
	} ${
		$ghostStateStore.isWobbling && $ghostStateStore.wobbleDirection === CSS_CLASSES.WOBBLE_RIGHT
			? CSS_CLASSES.WOBBLE_RIGHT
			: ''
	}`.trim();

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Configure debug mode in stores once, not reactively
	function setDebugMode() {
		if (browser) {
			ghostStateStore.setDebug(debug);
		}
	}

	// Watch for changes to externalTheme prop in a safer way
	function setupThemeSubscription() {
		// Clean up previous subscription if it exists
		if (unsubscribeTheme) unsubscribeTheme();

		// Update the theme store reference
		themeStore = externalTheme || localTheme;

		// Create new subscription
		unsubscribeTheme = themeStore.subscribe((value) => {
			currentTheme = value;
			if (debug)
				console.log(
					`Ghost theme updated to: ${value} (using ${externalTheme ? 'external' : 'local'} store)`
				);
		});
	}

	// Sync state to store only when local props actually change
	function syncStateToStore() {
		if (!browser || !ghostSvg) return;

		// Only update recording state if it has changed
		if (isRecording !== lastRecordingState) {
			const isStartingRecording = isRecording && !lastRecordingState;
			const isStoppingRecording = !isRecording && lastRecordingState;

			// Update local tracking state first
			lastRecordingState = isRecording;

			// Inform the store about the state change.
			// The store now handles the wobble sequence internally.
			ghostStateStore.setRecording(isRecording);
		}

		// Only update processing state if it has changed
		if (isProcessing !== lastProcessingState) {
			lastProcessingState = isProcessing;
			ghostStateStore.setProcessing(isProcessing);
		}

		// Only update animation state if it has changed
		if (animationState !== lastAnimationState) {
			lastAnimationState = animationState;
			manualStateChange = true;

			// Handle legacy animation commands
			if (animationState === 'wobble-start') {
				// Special legacy transition command
				animationService.applyWobbleEffect(ghostSvg, {
					direction: CSS_CLASSES.WOBBLE_LEFT,
					updateStore: true
				});
			} else if (animationState === 'wobble-stop') {
				// Special legacy transition command
				animationService.applyWobbleEffect(ghostSvg, {
					direction: CSS_CLASSES.WOBBLE_RIGHT,
					updateStore: true
				});
			} else if (Object.values(ANIMATION_STATES).includes(animationState)) {
				// Direct state command
				ghostStateStore.setAnimationState(animationState);
			}

			// Reset flag after processing
			setTimeout(() => {
				manualStateChange = false;
			}, 50);
		}
	}

	// Apply theme changes when they occur
	function applyThemeChanges() {
		if (!browser || !ghostSvg || !currentTheme) return;

		const svgElement = ghostSvg.querySelector('svg');
		if (!svgElement) return;

		// Force a reflow to ensure CSS transitions apply correctly
		forceReflow(svgElement);

		// Get the shape element
		const shapeElem = svgElement.querySelector('#ghost-shape');
		if (shapeElem) {
			// Force shape animation restart
			forceReflow(shapeElem);
		}

		// Clean up previous gradient animations and initialize new ones
		cleanupAllAnimations();
		initGradientAnimation(currentTheme, svgElement);

		// Update dynamic styles (now only injects gradient vars)
		initDynamicStyles();

		// Log theme change if in debug mode
		if (debug) {
			console.log(`Ghost theme updated to: ${currentTheme}`);
		}
	}

	// Initialize dynamic CSS variables using the centralized store
	function initDynamicStyles() {
		if (typeof document === 'undefined') return;

		// Create a style element if it doesn't exist for gradient variables
		if (!ghostStyleElement) {
			ghostStyleElement = document.createElement('style');
			ghostStyleElement.id = 'ghost-dynamic-styles';
			document.head.appendChild(ghostStyleElement);
		}

		// Get CSS variables from the store
		const gradientVars = $cssVariables;
		ghostStyleElement.textContent = `:root {\n  ${gradientVars}\n}`;

		// Removed call to injectAnimationVariables()

		// Log animation configuration if debug mode is enabled
		if (debugAnim && console) {
			console.log('Ghost Animation Configuration:', {
				theme: currentTheme,
				gradientVariables: gradientVars.split('\n')
			});
		}
	}

	// Removed handleMouseMove - eye tracking handled by blinkService/eyeTracking service

	// Handle click events
	function handleClick() {
		dispatch('toggleRecording');
	}

	// Clean up on destroy - ensure all animation resources are cleared
	onDestroy(() => {
		// Clean up theme store subscription
		if (unsubscribeTheme) unsubscribeTheme();

		// Removed cleanupTimers call (managed within services)

		// Clean up all gradient animations
		cleanupAllAnimations();

		// Remove dynamic styles
		if (ghostStyleElement) {
			ghostStyleElement.remove();
			ghostStyleElement = null;
		}

		// Reset ghost state
		ghostStateStore.reset();

		// Debug log
		if (debug) console.log('Ghost component destroyed and all animations cleaned up');
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

				// Update dynamic styles
				initDynamicStyles();
			}
		}
	}

	// Public API: Force wobble animation (simplified)
	export function forceWobble(direction = '') {
		if (!ghostSvg) return;

		console.log('🔄 Ghost.forceWobble called with direction:', direction);

		// Use the store's simplified method to trigger the wobble effect
		// It handles setting flags and the cleanup timeout internally.
		ghostStateStore.setWobbling(true, direction || null); // Pass null for random direction
	}

	// Public methods to expose animation controls
	export function pulse() {
		// Add subtle pulse animation
		if (ghostSvg) {
			// Pass duration from config
			animationService.applyPulseEffect(ghostSvg, PULSE_CONFIG.DURATION);
		}
	}

	export function startThinking() {
		// Transition to thinking state
		ghostStateStore.setAnimationState(ANIMATION_STATES.THINKING);
		ghostStateStore.setProcessing(true);
	}

	export function stopThinking() {
		// Transition to idle state
		ghostStateStore.setAnimationState(ANIMATION_STATES.IDLE);
		ghostStateStore.setProcessing(false);
	}

	export function reactToTranscript(textLength = 0) {
		blinkService.reactToTranscript({ leftEye, rightEye }, textLength);
	}

	// Setup on mount
	onMount(() => {
		// Set initial values to prevent unnecessary updates
		lastRecordingState = isRecording;
		lastProcessingState = isProcessing;
		lastAnimationState = animationState;

		// Initial setup operations
		setDebugMode();
		setupThemeSubscription();
		initDynamicStyles();

		if (browser) {
			// Initialize element references for services
			const elements = {
				ghostSvg,
				leftEye,
				rightEye,
				backgroundElement
			};

			// Initialize animation services
			const cleanupAnimations = animationService.initAnimations(elements, {
				seed,
				theme: currentTheme
			});

			// Initialize blink service
			const cleanupBlinks = blinkService.initBlinking(elements, {
				seed
			});

			// Removed mousemove listener setup (handled by services)

			// Set debug mode
			ghostStateStore.setDebug(debug);

			// Initialize animation state based on first visit status
			const state = $ghostStateStore;
			if (state.isFirstVisit) {
				ghostStateStore.setAnimationState(ANIMATION_STATES.INITIAL);
				animationService.applyInitialLoadEffect(ghostSvg);
			} else {
				ghostStateStore.setAnimationState(ANIMATION_STATES.IDLE);
			}

			// Return cleanup function
			return () => {
				// Removed mousemove listener cleanup
				cleanupAnimations();
				cleanupBlinks();
			};
		}
	});
	// Monitor theme changes
	$: if (currentTheme && ghostSvg && browser) {
		// Schedule on the next tick to avoid recursive updates
		setTimeout(applyThemeChanges, 0);
	}

	// Monitor props for changes
	$: if (browser) {
		// Schedule on the next tick to avoid reactive loop
		setTimeout(syncStateToStore, 0);
	}
</script>

<button
	bind:this={ghostSvg}
	class="ghost-container theme-{currentTheme} 
      {$ghostStateStore.isRecording
		? `${CSS_CLASSES.RECORDING} recording-theme-${currentTheme} ghost-recording-glow-${currentTheme}`
		: ''}
      
      {$ghostStateStore.isSpecialAnimationActive ? 'do-special-animation' : ''}
      {!clickable ? 'ghost-non-clickable' : ''}"
	style="width: {width}; height: {height}; opacity: {opacity}; transform: scale({scale});"
	on:click={clickable ? handleClick : undefined}
	on:keydown={(e) => {
		if (clickable && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			handleClick();
		}
	}}
	aria-label={clickable ? 'Toggle Recording' : 'Ghost'}
	aria-pressed={clickable ? $ghostStateStore.isRecording.toString() : undefined}
	tabindex={clickable ? '0' : '-1'}
>
	<svg
		viewBox="0 0 1024 1024"
		xmlns="http://www.w3.org/2000/svg"
		xmlns:xlink="http://www.w3.org/1999/xlink"
		class="ghost-svg theme-{currentTheme}
      {$ghostStateStore.isRecording ? CSS_CLASSES.RECORDING : ''}
      
      {debugAnim ? 'debug-animation' : ''}"
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

		<!-- New wrapper group for wobble transform - Apply computed classes here -->
		<g class={wobbleGroupClasses}>
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
		</g>
		<!-- End of ghost-wobble-group -->
	</svg>
</button>

<!-- Removed duplicated SVG content from here -->

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

	.ghost-non-clickable {
		cursor: default;
		pointer-events: none;
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
