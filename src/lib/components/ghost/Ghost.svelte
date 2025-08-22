<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { appActive } from '$lib/services/infrastructure';

	import './ghost-animations.css';
	import ghostPathsUrl from './ghost-paths.svg?url';
	import { ANIMATION_STATES, CSS_CLASSES, PULSE_CONFIG, EYE_CONFIG } from './animationConfig.js';

	import { ghostStateStore, theme as localTheme, cssVariables } from './stores/index.js';
	import { animationService, blinkService } from './services/index.js';
	import { forceReflow } from './utils/animationUtils.js';
	import { initialGhostAnimation } from './actions/initialGhostAnimation.js';
	import { createEyeTracking } from './eyeTracking.js';

	export let isRecording = false;
	export let isProcessing = false;
	export let debug = false;
	export let debugAnim = false;
	export let seed = 0;
	export let externalTheme = null;
	export let width = '100%';
	export let height = '100%';
	export let opacity = 1;
	export let scale = 1;
	export let clickable = true;
	let ghostSvg;
	let leftEye;
	let rightEye;
	let backgroundElement;
	let ghostStyleElement;
	let ghostWobbleGroup;
	let lastRecordingState = false;
	let lastProcessingState = false;
	let currentTheme;
	let themeStore = externalTheme || localTheme;
	let unsubscribeTheme;
	let wakeUpBlinkTriggered = false;
	let eyeTracker;
	$: animationsEnabled = $appActive;
	$: animationClass = animationsEnabled ? 'animations-enabled' : 'animations-paused';

	// React to recording state changes
	$: if (browser && isRecording !== lastRecordingState) {
		ghostStateStore.setRecording(isRecording);
		lastRecordingState = isRecording;
	}

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
		});
	}

	// Sync state to store only when local props actually change
	function syncStateToStore() {
		if (!browser || !ghostSvg) return;

		// Only update recording state if it has changed
		if (isRecording !== lastRecordingState) {
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

		// Removed legacy animationState prop handling
		// State is now driven solely by isRecording and isProcessing props syncing to the store
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
		// cleanupAllAnimations(); // Commented out - Use CSS animations
		// initGradientAnimation(currentTheme, svgElement); // Commented out - Use CSS animations

		// Create or update dynamic styles element
		let ghostStyleElement = document.getElementById('ghost-dynamic-styles');
		if (!ghostStyleElement) {
			ghostStyleElement = document.createElement('style');
			ghostStyleElement.id = 'ghost-dynamic-styles';
			document.head.appendChild(ghostStyleElement);
		}

		// Get CSS variables from the store
		const gradientVars = $cssVariables;
		ghostStyleElement.textContent = `:root {\n  ${gradientVars}\n}`;

		// Log theme change if in debug mode
		if (debug) {
			console.log('[Ghost] Theme changed, styles updated');
		}

		// Removed call to injectAnimationVariables()

		// Log animation configuration if debug mode is enabled
		if (debugAnim && console) {
		}
	}

	// Removed handleMouseMove - eye tracking handled by blinkService/eyeTracking service

	// Clean up on destroy - ensure all animation resources are cleared
	onDestroy(() => {
		// Clean up theme store subscription
		if (unsubscribeTheme) {
			unsubscribeTheme();
		}

		// Removed cleanupTimers call (managed within services)

		// Clean up all gradient animations
		// cleanupAllAnimations(); // Commented out - Use CSS animations

		// Remove dynamic styles
		if (ghostStyleElement) {
			ghostStyleElement.remove();
			ghostStyleElement = null;
		}

		// Reset ghost state
		ghostStateStore.reset();
	});

	// Export function to adjust gradient animation settings during runtime
	export function updateGradientSettings(themeId, settings) {
		if (!settings || !themeId) return;

		// Re-initialize gradient animations with updated settings
		if (ghostSvg) {
			const svgElement = ghostSvg.querySelector('svg');
			if (svgElement) {
				// Animation updates handled by CSS classes now
				// Legacy gradient animation functions removed
			}
		}
	}

	// Removed exported forceWobble function - wobble should be triggered internally by state changes

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

	// Handle click on the ghost
	function handleClick() {
		if (clickable) {
			// Dispatch custom window event for direct communication
			window.dispatchEvent(new CustomEvent('talktype:toggle-recording'));

			// The wobble animation is now handled through the recording state change
			// in the ghostStateStore when setRecording is called
		}
	}

	// Variables to track component loading state
	let componentsLoaded = false;

	// Setup on mount
	onMount(() => {
		// Set initial values to prevent unnecessary updates
		lastRecordingState = isRecording;
		lastProcessingState = isProcessing;

		// Initial setup operations
		setDebugMode();
		setupThemeSubscription();

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

			// Initialize Eye Tracking Service
			eyeTracker = createEyeTracking({
				debug: debug, // Pass the debug prop
				eyeSensitivity: EYE_CONFIG.SMOOTHING,
				maxDistanceX: EYE_CONFIG.X_DIVISOR,
				maxDistanceY: EYE_CONFIG.Y_DIVISOR,
				maxXMovement: EYE_CONFIG.X_MULTIPLIER,
				maxYMovement: EYE_CONFIG.Y_MULTIPLIER
			});
			// Initialize with the main ghost SVG container (for getBoundingClientRect)
			eyeTracker.initialize(ghostSvg);
			// eyeTracker.start(); // start() is called by initialize() if not already active

			// Removed mousemove listener setup (handled by services)

			// Set debug mode
			ghostStateStore.setDebug(debug);

			// Check for first visit status on the client *before* reading the state
			ghostStateStore.checkAndSetFirstVisit();

			// Initialize animation state based on the potentially updated first visit status
			const state = $ghostStateStore; // Read the potentially updated state
			if (state.isFirstVisit) {
				ghostStateStore.setAnimationState(ANIMATION_STATES.INITIAL);
				// The Svelte action `initialGhostAnimation` (applied below in the template)
				// will handle applying the 'initial-load-effect' class and the timed blink.
				// It will then dispatch 'initialAnimationComplete'.
			} else {
				ghostStateStore.setAnimationState(ANIMATION_STATES.IDLE);
			}

			// Mark component as loaded
			componentsLoaded = true;

			// Add global event listeners for waking up / resetting inactivity
			document.addEventListener('mousemove', handleUserInteraction, { passive: true });
			document.addEventListener('pointerdown', handleUserInteraction, { passive: true });

			// Return cleanup function
			return () => {
				// Cleanup animations and services
				cleanupAnimations();
				cleanupBlinks();
				if (eyeTracker) {
					eyeTracker.cleanup(); // Cleanup eye tracker
				}
				// Cleanup global event listeners
				document.removeEventListener('mousemove', handleUserInteraction);
				document.removeEventListener('pointerdown', handleUserInteraction);
				// The Svelte action will handle its own timer cleanup via its destroy method.
			};
		}
	});

	function handleInitialAnimationComplete() {
		if (debug) ghostStateStore.completeFirstVisit();
		ghostStateStore.setAnimationState(ANIMATION_STATES.IDLE);
	}

	// Monitor theme changes - more idiomatic Svelte approach
	$: if (currentTheme && ghostSvg && browser) {
		applyThemeChanges();
	}

	// Reactive declaration for ghost ready state
	$: isGhostReady = browser && componentsLoaded && !!ghostSvg && !!currentTheme;

	// Track previous ready state to dispatch event once
	let wasReady = false;
	$: if (isGhostReady && !wasReady) {
		wasReady = true;
	}

	// Trigger a double blink when waking up sequence finishes (transition WAKING_UP -> IDLE)
	$: if (
		browser &&
		$ghostStateStore.previous === ANIMATION_STATES.WAKING_UP &&
		$ghostStateStore.current === ANIMATION_STATES.IDLE &&
		!wakeUpBlinkTriggered && // Check the flag
		leftEye &&
		rightEye
	) {
		wakeUpBlinkTriggered = true; // Set the flag immediately
		// Use a minimal timeout to ensure the state change has settled and CSS is potentially updated
		setTimeout(() => {
			// No need to double-check state if we trust the flag
			// The regular IDLE blink timer will start after this double blink completes
			// or based on its own logic within blinkService.
		}, 50); // Small delay (50ms)
	}

	// Reset the flag when the ghost is no longer IDLE (meaning it went to sleep, started recording, etc.)
	$: if ($ghostStateStore.current !== ANIMATION_STATES.IDLE && wakeUpBlinkTriggered) {
		wakeUpBlinkTriggered = false;
	}

	// Interaction handlers for inactivity timer and waking up
	function handleUserInteraction() {
		if (!browser) return;
		const currentState = $ghostStateStore.current;
		if (currentState === ANIMATION_STATES.IDLE) {
			ghostStateStore.resetInactivityTimer();
		} else if (currentState === ANIMATION_STATES.ASLEEP) {
			ghostStateStore.wakeUp();
		}
	}
</script>

<button
	bind:this={ghostSvg}
	class="ghost-container theme-{currentTheme} {animationClass}
      {$ghostStateStore.isRecording ? CSS_CLASSES.RECORDING : ''}
      {$ghostStateStore.current === ANIMATION_STATES.EASTER_EGG ? CSS_CLASSES.SPIN : ''}
      {$ghostStateStore.current === ANIMATION_STATES.ASLEEP ? CSS_CLASSES.ASLEEP : ''}
      {$ghostStateStore.current === ANIMATION_STATES.WAKING_UP ? CSS_CLASSES.WAKING_UP : ''}
      {!clickable ? 'ghost-non-clickable' : ''}"
	style="width: {width}; height: {height}; opacity: {opacity}; transform: scale({scale});"
	on:click={() => {
		if (clickable) {
			handleClick();
			handleUserInteraction();
		}
	}}
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
		class="ghost-svg theme-{currentTheme} {animationClass}"
		pointer-events="none"
		class:recording={$ghostStateStore.isRecording}
		class:spin={$ghostStateStore.current === ANIMATION_STATES.EASTER_EGG}
		class:asleep={$ghostStateStore.current === ANIMATION_STATES.ASLEEP}
		class:waking-up={$ghostStateStore.current === ANIMATION_STATES.WAKING_UP}
		class:ready={isGhostReady}
		class:debug-animation={debugAnim}
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

		<!-- New wrapper group for wobble transform - ID is used by store -->
		<g class="ghost-spin-pivot" id="ghost-spin-pivot">
			<g
				bind:this={ghostWobbleGroup}
				class="ghost-wobble-group"
				id="ghost-wobble-group"
				use:initialGhostAnimation={componentsLoaded && $ghostStateStore.isFirstVisit
					? { blinkService, leftEye, rightEye, debug, oneTimeOnly: true }
					: undefined}
				on:initialAnimationComplete={handleInitialAnimationComplete}
			>
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
		</g>
		<!-- End of ghost-spin-pivot -->
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
		contain: layout paint;
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

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.ghost-svg {
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		opacity: 1; /* Start visible to prevent flashing */
	}

	.ghost-svg.ready {
		/* Removed fade-in animation - ghost should always be visible */
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
		animation-timing-function:
			var(--ghost-shimmer-ease, ease-in-out),
			var(--ghost-peach-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	.ghost-svg.theme-mint #ghost-shape {
		animation-duration: var(--ghost-shimmer-duration, 6s), var(--ghost-mint-flow-duration, 10s);
		animation-timing-function:
			var(--ghost-shimmer-ease, ease-in-out),
			var(--ghost-mint-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	.ghost-svg.theme-bubblegum #ghost-shape {
		animation-duration:
			var(--ghost-shimmer-duration, 7s), var(--ghost-bubblegum-flow-duration, 12s);
		animation-timing-function:
			var(--ghost-shimmer-ease, ease-in-out),
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
		animation-duration:
			calc(var(--ghost-shimmer-duration, 5s) * 2), calc(var(--ghost-peach-flow-duration, 9s) * 2) !important;
	}

	/* Animation state control */
	.animations-enabled .ghost-svg #ghost-shape {
		animation-play-state: running;
	}

	.animations-paused .ghost-svg #ghost-shape {
		animation-play-state: paused;
	}
</style>
