<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { appActive } from '$lib/services/infrastructure';

	import './ghost-animations-optimized.css';
	import ghostPathsUrl from './ghost-paths.svg?url';
	import { ANIMATION_STATES, CSS_CLASSES, PULSE_CONFIG, EYE_CONFIG } from './animationConfig.js';

	import { ghostStateStore, theme as localTheme } from './stores/index.js';
	import { animationService, blinkService } from './services/index.js';
	import { forceReflow } from './utils/animationUtils.js';
	import { initialGhostAnimation } from './actions/initialGhostAnimation.js';
	import { createEyeTracking } from './eyeTracking.js';
	import { getGradientId } from './gradients.js';
	import { buildGhostPersonality } from './personality.js';

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
	const ghostInstanceId = Symbol('ghost-instance');
	let ghostSvg;
	let spinPivotElement;
	let leftEye;
	let rightEye;
	let backgroundElement;
	let lastRecordingState = false;
	let currentTheme = 'peach'; // Initialize immediately to prevent black silhouette flash
	let themeStore = externalTheme || localTheme;
	let unsubscribeTheme;
	let eyeTracker;
	let fullyReady = false; // Single initialization flag - prevents ALL rendering until ready
	let readyRafId = null; // Track RAF for cleanup
	let personalityStyle = '';
	let personalityMood = 'drift';
	const validThemes = new Set(['peach', 'mint', 'bubblegum', 'rainbow']);

	// === REACTIVE DECLARATIONS ===
	// All reactive logic gated by fullyReady to prevent cascade during initialization
	$: animationsEnabled = $appActive;
	$: animationClass = animationsEnabled ? 'animations-enabled' : 'animations-paused';
	$: gradientId = getGradientId(currentTheme);
	$: specialAnimationClass =
		$ghostStateStore.current === ANIMATION_STATES.EASTER_EGG && $ghostStateStore.specialAnimation
			? `ghost-special-${$ghostStateStore.specialAnimation}`
			: '';
	$: ghostLabel = clickable
		? $ghostStateStore.isRecording
			? 'Stop recording'
			: 'Start recording'
		: 'TalkType ghost mascot';

	// React to recording state changes ONLY when fully ready
	$: if (fullyReady && browser && isRecording !== lastRecordingState) {
		ghostStateStore.setRecording(isRecording);
		lastRecordingState = isRecording;
	}

	$: if (fullyReady && browser) {
		ghostStateStore.setProcessing(isProcessing);
	}

	// Theme changes trigger visual updates ONLY when fully ready
	// NOTE: CSS variables now injected at layout level, so no injection needed here
	$: if (fullyReady && currentTheme && ghostSvg && browser) {
		applyThemeChanges();
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

		if (typeof externalTheme === 'string') {
			currentTheme = validThemes.has(externalTheme) ? externalTheme : 'peach';
			unsubscribeTheme = null;
			return;
		}

		// Update the theme store reference
		themeStore =
			externalTheme && typeof externalTheme.subscribe === 'function' ? externalTheme : localTheme;

		unsubscribeTheme = themeStore.subscribe((value) => {
			currentTheme = validThemes.has(value) ? value : 'peach';
		});
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
		const shapeElem = svgElement.querySelector('.ghost-shape');
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
		// Cancel pending RAF
		if (readyRafId) {
			cancelAnimationFrame(readyRafId);
			readyRafId = null;
		}

		// Clean up theme store subscription
		if (unsubscribeTheme) {
			unsubscribeTheme();
		}

		// NOTE: No ghost style element to remove - CSS variables now managed at layout level

		// Reset ghost state
		ghostStateStore.setWobbleTarget(null, ghostInstanceId);
		ghostStateStore.reset(ghostInstanceId);
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
			if (spinPivotElement) {
				spinPivotElement.classList.remove('wobble-left', 'wobble-right', 'wobble-both');
				void spinPivotElement.offsetWidth;
				spinPivotElement.classList.add('wobble-both');
				setTimeout(() => {
					spinPivotElement.classList.remove('wobble-both');
				}, 650);
			}

			window.dispatchEvent(new CustomEvent('talktype:toggle-recording'));
		}
	}

	// Setup on mount with simplified initialization sequence
	onMount(() => {
		// Set initial values to prevent unnecessary updates
		lastRecordingState = isRecording;

		// CRITICAL: Setup theme subscription FIRST to ensure currentTheme is correct
		// This happens before setting fullyReady to prevent theme change flash
		setDebugMode();
		setupThemeSubscription();

		if (browser) {
			const personality = buildGhostPersonality({ seed });
			personalityStyle = personality.style;
			personalityMood = personality.mood;

			// Initialize element references for services
			const elements = {
				ghostSvg,
				leftEye,
				rightEye,
				backgroundElement
			};

			ghostStateStore.setWobbleTarget(spinPivotElement, ghostInstanceId);

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

			// FINAL STEP: Set fullyReady flag after all setup is complete
			// This prevents any reactive cascade during initialization
			// Single requestAnimationFrame ensures one clean render with all resources ready
			readyRafId = requestAnimationFrame(() => {
				fullyReady = true;
				readyRafId = null;
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
		ghostStateStore.completeFirstVisit();
		ghostStateStore.setAnimationState(ANIMATION_STATES.IDLE);
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
      {$ghostStateStore.current === ANIMATION_STATES.EASTER_EGG &&
	$ghostStateStore.specialAnimation === 'spin'
		? CSS_CLASSES.SPIN
		: ''}
      {specialAnimationClass}
      {$ghostStateStore.current === ANIMATION_STATES.INITIAL ? 'initializing' : ''}
      {$ghostStateStore.current === ANIMATION_STATES.ASLEEP ? CSS_CLASSES.ASLEEP : ''}
      {$ghostStateStore.current === ANIMATION_STATES.WAKING_UP ? CSS_CLASSES.WAKING_UP : ''}
      {!clickable ? 'ghost-non-clickable' : ''}"
	style="width: {width}; height: {height}; opacity: {opacity}; transform: scale({scale}); {personalityStyle}"
	data-ghost-mood={personalityMood}
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
	aria-label={ghostLabel}
	aria-pressed={clickable ? $ghostStateStore.isRecording.toString() : undefined}
	aria-disabled={!clickable}
	tabindex={clickable ? '0' : '-1'}
>
	<span class="ghost-float-stage">
		<svg
			viewBox="0 0 1024 1024"
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
			class="ghost-svg theme-{currentTheme} {animationClass}"
			pointer-events="none"
			class:visible={fullyReady}
			class:recording={$ghostStateStore.isRecording}
			class:spin={$ghostStateStore.current === ANIMATION_STATES.EASTER_EGG &&
				$ghostStateStore.specialAnimation === 'spin'}
			class:asleep={$ghostStateStore.current === ANIMATION_STATES.ASLEEP}
			class:waking-up={$ghostStateStore.current === ANIMATION_STATES.WAKING_UP}
			class:debug-animation={debugAnim}
		>
			<!-- Global gradient definitions are now in +layout.svelte -->

			<!-- Wrapper group for wobble and special transforms -->

			<g bind:this={spinPivotElement} class="ghost-spin-pivot">
				<g
					class="ghost-wobble-group"
					use:initialGhostAnimation={fullyReady && $ghostStateStore.isFirstVisit
						? { blinkService, leftEye, rightEye, debug, oneTimeOnly: true }
						: undefined}
					on:initialAnimationComplete={handleInitialAnimationComplete}
				>
					<g class="ghost-layer ghost-bg" bind:this={backgroundElement}>
						<use
							xlink:href={ghostPathsUrl}
							href={ghostPathsUrl + '#ghost-background'}
							class="ghost-shape"
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
	</span>
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
		contain: layout;
		/* Safari-specific fixes for flashing */
		-webkit-backface-visibility: hidden;
		-webkit-transform: translateZ(0);
		transform: translateZ(0);
	}

	.ghost-container:focus,
	.ghost-container:active {
		outline: none !important;
		outline-offset: 0 !important;
		box-shadow: none !important;
		border: none !important;
	}

	.ghost-container:focus-visible {
		outline: 3px solid rgba(245, 158, 11, 0.95) !important;
		outline-offset: 0.5rem !important;
		border-radius: 999px;
		box-shadow: 0 0 0 0.35rem rgba(255, 250, 239, 0.95) !important;
	}

	.ghost-non-clickable {
		cursor: default;
		pointer-events: none;
	}

	.ghost-float-stage {
		display: flex;
		width: 100%;
		height: 100%;
		align-items: center;
		justify-content: center;
		line-height: 0;
		pointer-events: none;
		transform-origin: center center;
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
		position: relative;
		z-index: 1;
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
	.ghost-svg.theme-peach .ghost-shape {
		animation-duration: var(--ghost-shimmer-duration, 5s), var(--ghost-peach-flow-duration, 9s);
		animation-timing-function:
			var(--ghost-shimmer-ease, ease-in-out),
			var(--ghost-peach-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	.ghost-svg.theme-mint .ghost-shape {
		animation-duration: var(--ghost-shimmer-duration, 6s), var(--ghost-mint-flow-duration, 10s);
		animation-timing-function:
			var(--ghost-shimmer-ease, ease-in-out),
			var(--ghost-mint-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	.ghost-svg.theme-bubblegum .ghost-shape {
		animation-duration:
			var(--ghost-shimmer-duration, 7s), var(--ghost-bubblegum-flow-duration, 12s);
		animation-timing-function:
			var(--ghost-shimmer-ease, ease-in-out),
			var(--ghost-bubblegum-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	.ghost-svg.theme-rainbow .ghost-shape {
		animation-duration: var(--ghost-rainbow-flow-duration, 9s);
		animation-timing-function: var(--ghost-rainbow-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	/* Debug mode styles */
	.ghost-svg.debug-animation {
		border: 1px dashed rgba(255, 0, 0, 0.5);
	}

	.ghost-svg.debug-animation .ghost-shape {
		outline: 1px dotted rgba(0, 255, 0, 0.5);
	}

	.ghost-svg.debug-animation .ghost-eye {
		outline: 1px dotted rgba(0, 0, 255, 0.5);
	}

	/* Slow down animations in debug mode for easier inspection */
	.ghost-svg.debug-animation .ghost-shape {
		animation-duration:
			calc(var(--ghost-shimmer-duration, 5s) * 2), calc(var(--ghost-peach-flow-duration, 9s) * 2) !important;
	}

	/* Animation state control */
	.animations-enabled .ghost-svg .ghost-shape {
		animation-play-state: running;
	}

	.animations-paused .ghost-svg .ghost-shape {
		animation-play-state: paused;
	}
</style>
