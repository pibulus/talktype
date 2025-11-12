<script>
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { appActive } from '$lib/services/infrastructure';

	import './ghost-animations-optimized.css';
	import ghostPathsUrl from './ghost-paths.svg?url';
	import { ANIMATION_STATES, CSS_CLASSES, PULSE_CONFIG, EYE_CONFIG } from './animationConfig.js';

	import { ghostStateStore, theme as localTheme, FALLBACK_THEME } from './stores/index.js';
	import { animationService, blinkService } from './services/index.js';
	import { forceReflow } from './utils/animationUtils.js';
	import { initialGhostAnimation } from './actions/initialGhostAnimation.js';
	import { createEyeTracking } from './eyeTracking.js';
	import GradientDefs from './GradientDefs.svelte';
	import { getGradientId } from './gradients.js';

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
	const resolveThemeSource = () => externalTheme || localTheme;
	const normalizeTheme = (themeValue) =>
		typeof themeValue === 'string' && themeValue.length > 0 ? themeValue : FALLBACK_THEME;
	const readThemeValue = (source) => {
		if (source && typeof source.subscribe === 'function') {
			return normalizeTheme(get(source));
		}

		return normalizeTheme(source);
	};

	let ghostSvg;
	let leftEye;
	let rightEye;
	let backgroundElement;
	let ghostWobbleGroup;
	let lastRecordingState = false;
	let lastProcessingState = false;
	let activeThemeSource = resolveThemeSource();
	let currentTheme = readThemeValue(activeThemeSource);
	let pendingTheme = currentTheme;
	let unsubscribeTheme;
	let wakeUpBlinkTriggered = false;
	let eyeTracker;
	let fullyReady = false; // Single initialization flag - prevents ALL rendering until ready

	// === REACTIVE DECLARATIONS ===
	let gradientId = getGradientId(currentTheme);
	let animationClass = 'animations-paused';
	let isGhostReady = false;

	$: gradientId = getGradientId(currentTheme || FALLBACK_THEME);

	// Simplified ready check - prevent any visual output until everything is ready
	$: isGhostReady = fullyReady && browser && !!ghostSvg && !!currentTheme;

	$: animationClass = isGhostReady && $appActive ? 'animations-enabled' : 'animations-paused';

	// Swap subscriptions if parent swaps external theme store
	$: if (fullyReady) {
		subscribeToThemeChanges(resolveThemeSource());
	}

	// React to recording state changes ONLY when fully ready
	$: if (isGhostReady && browser && isRecording !== lastRecordingState) {
		ghostStateStore.setRecording(isRecording);
		lastRecordingState = isRecording;
	}

	function setDebugMode() {
		if (browser) {
			ghostStateStore.setDebug(debug);
		}
	}

	function commitThemeChange() {
		const nextTheme = normalizeTheme(pendingTheme);
		if (currentTheme !== nextTheme) {
			currentTheme = nextTheme;
		}

		if (browser && ghostSvg) {
			applyThemeChanges();
		}
	}

	function subscribeToThemeChanges(source) {
		const isStoreSource = source && typeof source.subscribe === 'function';

		if (isStoreSource) {
			if (activeThemeSource === source && unsubscribeTheme) {
				return;
			}

			if (unsubscribeTheme) {
				unsubscribeTheme();
			}

			activeThemeSource = source;
			unsubscribeTheme = source.subscribe((value) => {
				pendingTheme = normalizeTheme(value);
				if (fullyReady) {
					commitThemeChange();
				}
			});
		} else {
			if (unsubscribeTheme) {
				unsubscribeTheme();
				unsubscribeTheme = undefined;
			}

			activeThemeSource = source;
			pendingTheme = readThemeValue(source);
			if (fullyReady) {
				commitThemeChange();
			}
		}
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
	}

	// Apply theme changes when they occur
	// NOTE: CSS variables are now injected at layout level (+layout.svelte)
	// This function only handles visual reflow to ensure smooth transitions
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

		// Log theme change if in debug mode
		if (debug) {
			console.log('[Ghost] Theme changed, reflow applied');
		}
	}

	// Clean up on destroy - ensure all animation resources are cleared
	onDestroy(() => {
		// Clean up theme store subscription
		if (unsubscribeTheme) {
			unsubscribeTheme();
		}

		// NOTE: No ghost style element to remove - CSS variables now managed at layout level

		// Reset ghost state
		ghostStateStore.reset();
	});

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

	// Setup on mount with simplified initialization sequence
	onMount(() => {
		// Set initial values to prevent unnecessary updates
		lastRecordingState = isRecording;
		lastProcessingState = isProcessing;

		setDebugMode();
		pendingTheme = readThemeValue(resolveThemeSource());
		currentTheme = pendingTheme;

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

			// FINAL STEP: Ensure theme commits once DOM nodes exist, then mark ready
			// Theme subscription is deferred until after the first paint is locked in
			requestAnimationFrame(() => {
				const latestThemeSource = resolveThemeSource();
				pendingTheme = readThemeValue(latestThemeSource);
				commitThemeChange();
				subscribeToThemeChanges(latestThemeSource);
				fullyReady = true;
			});

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
      {!isGhostReady || !clickable ? 'ghost-non-clickable' : ''}"
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
		class:visible={isGhostReady}
		class:recording={$ghostStateStore.isRecording}
		class:spin={$ghostStateStore.current === ANIMATION_STATES.EASTER_EGG}
		class:asleep={$ghostStateStore.current === ANIMATION_STATES.ASLEEP}
		class:waking-up={$ghostStateStore.current === ANIMATION_STATES.WAKING_UP}
		class:debug-animation={debugAnim}
	>
		<defs>
			<GradientDefs />
		</defs>

		<!-- New wrapper group for wobble transform - ID is used by store -->
		<g class="ghost-spin-pivot" id="ghost-spin-pivot">
			<g
				bind:this={ghostWobbleGroup}
				class="ghost-wobble-group"
				id="ghost-wobble-group"
				use:initialGhostAnimation={isGhostReady && $ghostStateStore.isFirstVisit
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
						fill="url(#{gradientId})"
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
		/* Safari-specific fixes for flashing */
		-webkit-backface-visibility: hidden;
		-webkit-transform: translateZ(0);
		transform: translateZ(0);
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
		/* Safari-specific fixes */
		-webkit-backface-visibility: hidden;
		-webkit-transform: translateZ(0);
		transform: translateZ(0);
		will-change: transform;
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
