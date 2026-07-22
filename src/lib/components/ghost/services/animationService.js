/**
 * Ghost Animation Service
 *
 * Handles imperative animations for the Ghost component.
 * This service bridges the reactive state and imperative DOM manipulation
 * for performance-critical animations.
 */

import { get } from 'svelte/store';
import { forceReflow, seedRandom, isBrowser, cleanupTimers } from '../utils/animationUtils.js';
import { ANIMATION_STATES, CSS_CLASSES, SPECIAL_CONFIG } from '../animationConfig.js';
import { ghostStateStore } from '../stores/ghostStateStore.js';
import { initGradientAnimation } from '../gradientAnimator.js';
import { pickSpecialAnimation } from '../personality.js';

// Animation timers
const timers = {
	specialAnimationTimeoutId: null,
	wobbleTimeoutId: null
};
let specialAnimationCounter = 0;

/**
 * Initialize all animation systems
 *
 * @param {Object} elements - DOM elements references
 * @param {Object} config - Animation configuration
 * @returns {Function} Cleanup function
 */
export function initAnimations(elements, config = {}) {
	if (!elements || !isBrowser()) return () => {};

	const { seed = 0 } = config;

	// Initialize ghost shape gradient animation
	if (elements.ghostSvg && elements.ghostSvg.querySelector('svg')) {
		const svgEl = elements.ghostSvg.querySelector('svg');
		initThemeAnimation(svgEl, config.theme);
	}

	// Start watching for special animations (easter eggs)
	startSpecialAnimationWatch(elements.ghostSvg, seed);

	// Return cleanup function
	return () => {
		stopSpecialAnimationWatch();
		cleanupTimers(timers);
	};
}

/**
 * Initialize theme-based gradient animation
 *
 * @param {SVGElement} svgElement - SVG element to animate
 * @param {string} theme - Theme name
 */
export function initThemeAnimation(svgElement, theme) {
	if (!svgElement || !theme) return;

	// Force a reflow to ensure CSS transitions apply correctly
	forceReflow(svgElement);

	// Get the shape element
	const shapeElem = svgElement.querySelector('.ghost-shape');
	if (shapeElem) {
		forceReflow(shapeElem);
	}

	// Initialize gradient animations
	initGradientAnimation(theme, svgElement);
}

/**
 * Start watching for special animation opportunities (easter eggs)
 *
 * @param {HTMLElement} ghostSvg - Ghost SVG container
 * @param {number} seed - Random seed
 */
export function startSpecialAnimationWatch(ghostSvg, seed = 0) {
	if (!isBrowser() || !ghostSvg) return;

	// Clean up any existing timer
	stopSpecialAnimationWatch();

	// Schedule special animation check
	function checkForSpecialAnimation() {
		const state = get(ghostStateStore);

		// Don't interrupt other animations or states
		// Only run if current state is IDLE and eyes are open.
		// The state machine will prevent transitioning from EASTER_EGG to EASTER_EGG if needed.
		if (state.current !== ANIMATION_STATES.IDLE || state.eyesClosed) {
			scheduleNextCheck();
			return;
		}

		// Random chance for special animation
		const random = seedRandom(seed, Date.now(), 0, 1);
		if (random < SPECIAL_CONFIG.CHANCE) {
			// Transition to EASTER_EGG state.
			// The state machine's cleanupDelay for EASTER_EGG will handle transitioning back to IDLE.
			ghostStateStore.setSpecialAnimation(
				pickSpecialAnimation(seed, specialAnimationCounter++, new Date())
			);
			ghostStateStore.setAnimationState(ANIMATION_STATES.EASTER_EGG);
		}

		scheduleNextCheck();
	}

	function scheduleNextCheck() {
		// Schedule next check with slight variation
		const checkInterval = SPECIAL_CONFIG.CHECK_INTERVAL + seedRandom(seed, Date.now(), -5000, 5000);

		timers.specialAnimationTimeoutId = setTimeout(checkForSpecialAnimation, checkInterval);
	}

	// Start the check cycle
	scheduleNextCheck();
}

/**
 * Stop watching for special animations
 */
export function stopSpecialAnimationWatch() {
	if (timers.specialAnimationTimeoutId) {
		clearTimeout(timers.specialAnimationTimeoutId);
		timers.specialAnimationTimeoutId = null;
	}
}

/**
 * Apply a pulse animation
 *
 * @param {HTMLElement} ghostSvg - Ghost SVG container
 * @param {number} duration - Pulse duration in ms
 */
export function applyPulseEffect(ghostSvg, duration) {
	if (!ghostSvg) return;

	// Add pulse class
	ghostSvg.classList.add(CSS_CLASSES.PULSE);

	// Remove class after animation completes
	setTimeout(() => {
		ghostSvg.classList.remove(CSS_CLASSES.PULSE);
	}, duration);
}

// Export the animation service
export default {
	initAnimations,
	initThemeAnimation,
	applyPulseEffect,
	startSpecialAnimationWatch,
	stopSpecialAnimationWatch
};
