/**
 * Animation Utilities
 *
 * Shared utility functions for ghost animations to reduce duplication
 * and centralize common animation operations.
 */

import { browser } from '$app/environment';

/**
 * Force browser reflow to ensure animations apply correctly
 * This is necessary when changing CSS classes or styles that affect animations
 *
 * @param {HTMLElement|SVGElement} element - DOM element to force reflow on
 * @returns {void}
 */
export function forceReflow(element) {
	if (!element) return;

	// Reading offsetWidth causes the browser to recalculate layout
	void element.offsetWidth;
}

/**
 * Clean up all timers in an object
 * @param {Object} timers - Object containing timer IDs
 * @returns {void}
 */
export function cleanupTimers(timers) {
	if (!timers) return;

	Object.entries(timers).forEach(([key, timer]) => {
		if (timer) {
			if (key.toLowerCase().includes('interval')) {
				clearInterval(timer);
			} else {
				clearTimeout(timer);
			}

			timers[key] = null;
		}
	});
}

/**
 * Toggle CSS classes on an element safely
 * @param {HTMLElement|SVGElement} element - DOM element to modify classes on
 * @param {Array<string>} classesToRemove - Array of class names to remove
 * @param {string|null} classToAdd - Class name to add (optional)
 * @param {boolean} forceRefresh - Whether to force a reflow between class operations
 * @returns {void}
 */
export function toggleClasses(element, classesToRemove, classToAdd = null, forceRefresh = true) {
	if (!element) return;

	// Remove classes
	if (classesToRemove?.length) {
		classesToRemove.forEach((cls) => {
			if (cls) element.classList.remove(cls);
		});
	}

	// Force reflow between removing and adding classes if needed
	if (forceRefresh) {
		forceReflow(element);
	}

	// Add new class if provided
	if (classToAdd) {
		element.classList.add(classToAdd);
	}
}

/**
 * Seeded random number generator for deterministic but unique animations
 * @param {number} seed - Seed value for randomization
 * @param {number} counter - Counter to advance the seeded generation
 * @param {number} min - Minimum value for the random number
 * @param {number} max - Maximum value for the random number
 * @returns {number} Random number between min and max
 */
export function seedRandom(seed, counter, min, max) {
	// Simple seeded random number generator based on sine function
	const x = Math.sin(seed + counter) * 10000;
	const random = x - Math.floor(x);
	return min + random * (max - min);
}

/**
 * Check if browser environment is available
 * @returns {boolean} True if in browser environment
 */
export function isBrowser() {
	return browser && typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Create a scheduled animation loop
 * @param {Function} callback - Animation frame callback
 * @param {number} delay - Optional delay between frames in ms
 * @returns {Object} Animation controller with start/stop methods
 */
export function createAnimationLoop(callback, delay = 0) {
	let frameId = null;
	let lastFrameTime = 0;
	let active = false;

	function animate(timestamp) {
		if (!active) return;

		const elapsed = timestamp - lastFrameTime;

		if (elapsed >= delay) {
			lastFrameTime = timestamp;
			callback(timestamp);
		}

		frameId = requestAnimationFrame(animate);
	}

	return {
		start() {
			if (active) return;
			active = true;
			lastFrameTime = 0;
			frameId = requestAnimationFrame(animate);
		},

		stop() {
			if (!active) return;
			active = false;
			if (frameId) {
				cancelAnimationFrame(frameId);
				frameId = null;
			}
		},

		isActive() {
			return active;
		}
	};
}

/**
 * Helper function to get CSS variable value
 * @param {string} name - CSS variable name without -- prefix
 * @param {*} fallback - Optional fallback value
 * @returns {string} CSS variable value or fallback
 */
export function getCssVariable(name, fallback = '') {
	if (!isBrowser()) return fallback;
	return (
		getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim() || fallback
	);
}
