/**
 * Svelte Action for Ghost Initial Animation Sequence
 *
 * This action orchestrates the initial animation for the ghost:
 * 1. Applies a CSS class to trigger the grow and wobble animation.
 * 2. Schedules a double blink to occur towards the end of the CSS animation.
 * 3. Dispatches an 'initialAnimationComplete' event when the sequence is finished.
 */

import { ANIMATION_TIMING, WOBBLE_CONFIG } from '../animationConfig.js';

export function initialGhostAnimation(node, initialParams) {
	let blinkTimeoutId = null;
	let hasRunOnce = false; // Prevent multiple executions
	// Persist debug state across updates, initialized from the first set of params.
	let currentDebugState = initialParams?.debug || false;

	function runSetup(params) {
		// If oneTimeOnly is set and we've already run, skip
		if (params?.oneTimeOnly && hasRunOnce) {
			if (currentDebugState) {
			blinkTimeoutId = null;
		}
		node.classList.remove('initial-load-effect');

		// Update the debug state based on the current parameters being processed.
		currentDebugState = params?.debug || false;

		// If params is falsy (e.g., undefined) or essential properties are missing,
		// the action should not proceed with its main logic.
		if (!params || !params.blinkService || !params.leftEye || !params.rightEye) {
			if (currentDebugState) {
			}
			return; // Exit setup if prerequisites are not met.
		}
		
		// Mark as run
		hasRunOnce = true;

		// Destructure after confirming params and its properties are valid.
		const { blinkService, leftEye, rightEye } = params;

		if (currentDebugState) {
		}

		// 1. Apply CSS class to trigger grow & wobble
		node.classList.add('initial-load-effect');
		if (currentDebugState) {
		}

		blinkTimeoutId = setTimeout(() => {
			// Re-check debug state as it might have changed if update was called.
			// However, currentDebugState is updated at the start of runSetup.
			if (currentDebugState) {
			}

			// It's good practice to ensure blinkService and eyes are still valid,
			// though they should be if this timeout is running from a valid setup.
			if (
				blinkService &&
				typeof blinkService.performDoubleBlink === 'function' &&
				leftEye &&
				rightEye
			) {
				blinkService.performDoubleBlink({ leftEye, rightEye }, () => {
					if (currentDebugState) {
					}
					node.dispatchEvent(new CustomEvent('initialAnimationComplete'));
				});
			} else {
				if (currentDebugState) {
					console.warn(
						'[Action initialGhostAnimation] Could not perform double blink during timeout. Missing blinkService, eye elements, or function.'
					);
				}
				// Fallback: dispatch completion event anyway so the app doesn't get stuck
				node.dispatchEvent(new CustomEvent('initialAnimationComplete'));
			}
		}, blinkStartDelay);
	}

	// Initial setup call with the parameters provided when the action is first applied.
	runSetup(initialParams);

	return {
		update(newParams) {
			// When Svelte updates the action's parameters, re-run the setup.
			// This handles transitions like:
			// - params initially undefined, then becoming defined (action activates).
			// - params initially defined, then becoming undefined (action deactivates/cleans up).
			// - params changing (e.g., debug flag toggling).
			runSetup(newParams);
		},
		destroy() {
			// Cleanup when the element is unmounted.
			if (blinkTimeoutId) {
				clearTimeout(blinkTimeoutId);
				blinkTimeoutId = null;
			}
			node.classList.remove('initial-load-effect'); // Ensure class is removed.
			if (currentDebugState) {
				// Log based on the last known debug state.
