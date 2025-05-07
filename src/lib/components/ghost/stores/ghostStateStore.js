/**
 * Ghost Animation State Store
 *
 * A reactive store for managing ghost animation states and transitions
 * using a formal state machine approach. This centralizes all state
 * management while leaving actual animation implementation to services.
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import {
	ANIMATION_STATES,
	ANIMATION_TRANSITIONS,
	ANIMATION_BEHAVIORS,
	CSS_CLASSES,
	WOBBLE_CONFIG, // Import WOBBLE_CONFIG
	BLINK_CONFIG // Import BLINK_CONFIG
} from '../animationConfig.js';

/**
 * Create the ghost animation state machine
 */
function createGhostStateStore() {
	// Internal state store (make sure this 'state' is used throughout)
	const _state = writable({
		// Current animation state
		current: ANIMATION_STATES.INITIAL,
		// Previous animation state for transition effects
		previous: null,
		// Whether the ghost is recording
		isRecording: false,
		// Whether the ghost is processing
		isProcessing: false,
		// Whether the eyes are closed (for blinking)
		eyesClosed: false,
		// Eye tracking position
		eyePosition: { x: 0, y: 0 },
		// Whether eye tracking is enabled
		isEyeTrackingEnabled: true,
		// --- Wobble state removed - handled imperatively ---
		// isWobbling: false,
		inactivityTimerId: null, // Timer for falling asleep
		// wobbleDirection: null,
		// wobbleTimeoutId: null,
		// ---
		// isSpecialAnimationActive is now handled by current === ANIMATION_STATES.EASTER_EGG
		// Debug mode
		debug: true,
		inactivityTimerId: null, // Clear timer on reset
		// First visit (for initial animation) - Default to false for SSR safety
		isFirstVisit: false,
		// Animation state timeouts
		stateTimeouts: {}
	});

	/**
	 * Validate a state transition against the defined transition map
	 * @param {string} fromState - Current state
	 * @param {string} toState - Target state
	 * @returns {boolean} Whether the transition is valid
	 */
	function isValidTransition(fromState, toState) {
		// Always allow transition to the same state
		if (fromState === toState) return true;

		// Check transition map
		return ANIMATION_TRANSITIONS[fromState]?.includes(toState) || false;
	}

	/**
	 * Debug log helper that respects debug setting
	 * @param {string} message - Message to log
	 * @param {string} level - Log level ('log', 'warn', 'error')
	 */
	function debugLog(message, level = 'log') {
		const currentDebugFlag = get(_state).debug;
		// ADD THIS LINE
		console.log(
			`[GhostStateStore DEBUGLOG_CHECK] Attempting to log (debugLog): "${message}". Current debug flag in store: ${currentDebugFlag}`
		);
		// END ADD
		if (!currentDebugFlag) return;
		console[level](`[GhostState] ${message}`);
	}

	/**
	 * Clear any timeout associated with a specific state
	 * @param {string} stateName - State to clear timeout for
	 */
	function clearStateTimeout(stateName) {
		const currentState = get(_state); // Use _state

		if (currentState.stateTimeouts[stateName]) {
			clearTimeout(currentState.stateTimeouts[stateName]);

			_state.update((s) => ({
				// Use _state
				...s,
				stateTimeouts: {
					...s.stateTimeouts,
					[stateName]: null
				}
			}));
		}
	}

	// Forward declaration for use in setAnimationState
	let resetInactivityTimerFunc;

	/**
	 * Set a new animation state with proper validation
	 * @param {string} newState - Target animation state
	 * @returns {boolean} Whether the transition was successful
	 */
	function setAnimationState(newState) {
		const currentState = get(_state); // Use _state

		// Validate state exists
		if (!Object.values(ANIMATION_STATES).includes(newState)) {
			debugLog(`Invalid state: ${newState}`, 'warn');
			return false;
		}

		// Check if already in this state
		if (currentState.current === newState) {
			debugLog(`Already in state: ${newState}`);
			return true;
		}

		// Validate state transition
		if (!isValidTransition(currentState.current, newState)) {
			debugLog(`Invalid state transition: ${currentState.current} → ${newState}`, 'warn');
			return false;
		}

		debugLog(`Animation state transition: ${currentState.current} → ${newState}`);

		// Get behavior for new state
		const behavior = ANIMATION_BEHAVIORS[newState];

		// Clear current state timeout if exists (except for inactivity timer which is managed separately)
		if (currentState.current !== ANIMATION_STATES.IDLE || newState === ANIMATION_STATES.ASLEEP) {
			clearStateTimeout(currentState.current);
		}

		// Manage inactivity timer based on transitions
		if (newState === ANIMATION_STATES.IDLE) {
			// Defer starting timer to allow other logic to complete
			setTimeout(() => resetInactivityTimerFunc?.(), 0);
		} else if (currentState.current === ANIMATION_STATES.IDLE && newState !== ANIMATION_STATES.ASLEEP) {
			// Clear inactivity timer if moving from IDLE to something other than ASLEEP
			if (get(_state).inactivityTimerId) {
				clearTimeout(get(_state).inactivityTimerId);
				_state.update(s => ({ ...s, inactivityTimerId: null }));
			}
		}
		
		// Handle eye state for ASLEEP - Eyes are now controlled by CSS animation, not state flag
		let newEyesClosedState = currentState.eyesClosed;
		if (newState === ANIMATION_STATES.ASLEEP) {
			newEyesClosedState = false; // Start with eyes open, animation will close them
		} else if (currentState.current === ANIMATION_STATES.ASLEEP && newState === ANIMATION_STATES.IDLE) {
			// Waking up to IDLE, ensure eyes open unless IDLE itself dictates otherwise (it doesn't)
			newEyesClosedState = false;
		}


		// Update state
		_state.update((s) => ({
			// Use _state
			...s,
			previous: s.current,
			current: newState,
			isEyeTrackingEnabled: behavior.eyeTracking,
			eyesClosed: newEyesClosedState
			// isWobbling flag is managed separately now
		}));

		// Log successful state transition
		debugLog(`Successfully transitioned to state: ${newState}`);

		// Set up cleanup timeout if needed (e.g., for REACTING or EASTER_EGG state)
		if (behavior.cleanupDelay && behavior.cleanupDelay > 0) {
			debugLog(`Setting cleanup timeout for ${newState} → IDLE in ${behavior.cleanupDelay}ms`);

			const timeoutId = setTimeout(() => {
				const _currentState = get(_state); // Use _state
				if (_currentState.current === newState) {
					setAnimationState(ANIMATION_STATES.IDLE);
				}
			}, behavior.cleanupDelay);

			_state.update((s) => ({
				// Use _state
				...s,
				stateTimeouts: {
					...s.stateTimeouts,
					[newState]: timeoutId
				}
			}));
		}

		return true;
	}

	/**
	 * Set the recording state
	 * @param {boolean} isRecording - Whether recording is active
	 */
	function setRecording(isRecording) {
		console.log(`[Debug Step 1] setRecording called with: ${isRecording}`); // Log function entry
		const currentState = get(_state); // Use _state
		const wasRecording = currentState.isRecording;

		// Skip if state is already correct to prevent cycles
		if (currentState.isRecording === isRecording) {
			console.log(`Skipping redundant recording state update: already ${isRecording}`);
			console.log('[Debug Step 2] Exiting setRecording early - state already matches.'); // Log early exit
			return;
		}

		// Debug logging
		if (currentState.debug) {
			console.log(`Setting recording state: ${wasRecording} → ${isRecording}`);
		}

		// Update recording state
		// state.update((s) => ({ ...s, isRecording })); // This is handled below now

		// --- Recording Start Sequence ---
		if (isRecording && !wasRecording) {
			debugLog('🎙️ Recording started - applying wobble effect first');

			// 1. Set isRecording flag immediately
			_state.update((s) => ({ ...s, isRecording: true })); // Use _state

			// 2. Imperatively trigger wobble animation
			const wobbleGroupStart = document.getElementById('ghost-wobble-group');
			console.log('[Debug Step 3 - Start] Wobble group element:', wobbleGroupStart); // Log element check result
			if (wobbleGroupStart) {
				// Always use the combined wobble class
				const wobbleClassStart = CSS_CLASSES.WOBBLE_BOTH;
				debugLog(`[Imperative Wobble] Adding class ${wobbleClassStart} for start`);
				console.log(
					`[Wobble Debug ${Date.now()}] BEFORE adding start wobble class: ${wobbleClassStart}`
				); // Timestamp log
				wobbleGroupStart.classList.add(wobbleClassStart);
				console.log(
					`[Wobble Debug ${Date.now()}] AFTER adding start wobble class: ${wobbleClassStart}`
				); // Timestamp log

				// Schedule class removal and style reset (using updated duration from WOBBLE_CONFIG)
				const startTimeoutId = setTimeout(() => {
					debugLog(`[Imperative Wobble] Removing class ${wobbleClassStart} after start`);
					wobbleGroupStart.classList.remove(wobbleClassStart);
					clearStateTimeout('startWobbleCleanup'); // Clear self
				}, WOBBLE_CONFIG.DURATION + 50); // Duration + buffer (Now uses doubled duration)

				// Store timeout ID for potential cleanup
				_state.update((s) => ({
					// Use _state
					...s,
					stateTimeouts: { ...s.stateTimeouts, startWobbleCleanup: startTimeoutId }
				}));
			} else {
				debugLog('[Imperative Wobble] Could not find wobble group for start', 'warn');
			}

			// 3. Schedule setting the RECORDING *animation state* on the *next animation frame*
			// This ensures the wobble transform renders before recording animations start.
			// Clear any pending frame request first
			if (currentState.stateTimeouts.rafRecordingStart) {
				cancelAnimationFrame(currentState.stateTimeouts.rafRecordingStart);
			}
			const rafId = requestAnimationFrame(() => {
				// Check if we are still intending to record (user might have stopped quickly)
				if (get(_state).isRecording) {
					// Use _state
					debugLog('Next frame: Transitioning state to RECORDING');
					setAnimationState(ANIMATION_STATES.RECORDING);
				} else {
					debugLog('Recording stopped before next frame state transition could occur.');
				}
				// Clear the stored RAF ID after execution
				_state.update((s) => ({
					// Use _state
					...s,
					stateTimeouts: { ...s.stateTimeouts, rafRecordingStart: null }
				}));
			});

			// Store RAF ID for potential cleanup if user stops recording quickly
			_state.update((s) => ({
				// Use _state
				...s,
				stateTimeouts: { ...s.stateTimeouts, rafRecordingStart: rafId }
			}));
		}
		// --- Recording Stop Sequence ---
		else if (!isRecording && wasRecording) {
			debugLog('🛑 Recording stopped - applying wobble effect');

			// Clear any pending next-frame start transition
			if (currentState.stateTimeouts.rafRecordingStart) {
				cancelAnimationFrame(currentState.stateTimeouts.rafRecordingStart);
				_state.update((s) => ({
					// Use _state
					...s,
					stateTimeouts: { ...s.stateTimeouts, rafRecordingStart: null }
				}));
			}

			// 1. Transition directly to appropriate end state
			const endState = currentState.isProcessing
				? ANIMATION_STATES.THINKING
				: ANIMATION_STATES.IDLE;
			setAnimationState(endState);

			// 2. Imperatively trigger wobble animation
			const wobbleGroupStop = document.getElementById('ghost-wobble-group');
			console.log('[Debug Step 3 - Stop] Wobble group element:', wobbleGroupStop); // Log element check result
			if (wobbleGroupStop) {
				// Always use the combined wobble class
				const wobbleClassStop = CSS_CLASSES.WOBBLE_BOTH;
				debugLog(`[Imperative Wobble] Adding class ${wobbleClassStop} for stop`);
				console.log(
					`[Wobble Debug ${Date.now()}] BEFORE adding stop wobble class: ${wobbleClassStop}`
				); // Timestamp log
				wobbleGroupStop.classList.add(wobbleClassStop);
				console.log(
					`[Wobble Debug ${Date.now()}] AFTER adding stop wobble class: ${wobbleClassStop}`
				); // Timestamp log

				// Schedule class removal and style reset (using updated duration from WOBBLE_CONFIG)
				const stopTimeoutId = setTimeout(() => {
					debugLog(`[Imperative Wobble] Removing class ${wobbleClassStop} after stop`);
					wobbleGroupStop.classList.remove(wobbleClassStop);
					clearStateTimeout('stopWobbleCleanup'); // Clear self
				}, WOBBLE_CONFIG.DURATION + 50); // Duration + buffer (Now uses doubled duration)

				// Store timeout ID for potential cleanup
				_state.update((s) => ({
					// Use _state
					...s,
					stateTimeouts: { ...s.stateTimeouts, stopWobbleCleanup: stopTimeoutId }
				}));
			} else {
				debugLog('[Imperative Wobble] Could not find wobble group for stop', 'warn');
			}
		}
	}

	/**
	 * Set the processing state
	 * @param {boolean} isProcessing - Whether processing is active
	 */
	function setProcessing(isProcessing) {
		_state.update((s) => ({ ...s, isProcessing })); // Use _state

		// Auto-transition to thinking state if true
		if (isProcessing) {
			setAnimationState(ANIMATION_STATES.THINKING);
		} else if (get(_state).current === ANIMATION_STATES.THINKING) {
			// Use _state
			// If we were thinking, go back to idle unless recording
			const currentState = get(_state); // Use _state
			if (currentState.isRecording) {
				setAnimationState(ANIMATION_STATES.RECORDING);
			} else {
				setAnimationState(ANIMATION_STATES.IDLE);
			}
		}
	}

	/**
	 * Set eye position for tracking
	 * @param {number} x - Normalized X position (-1 to 1)
	 * @param {number} y - Normalized Y position (-1 to 1)
	 */
	function setEyePosition(x, y) {
		_state.update((s) => ({
			// Use _state
			...s,
			eyePosition: { x, y }
		}));
	}

	/**
	 * Set the eye closed state
	 * @param {boolean} closed - Whether eyes are closed
	 */
	function setEyesClosed(closed) {
		_state.update((s) => ({ ...s, eyesClosed: closed })); // Use _state
	}

	// --- Removed applyWobbleEffectFlags function ---

	/**
	 * Set the wobble direction (now primarily used by external triggers)
	 * @param {string} direction - Wobble direction CSS class
	 */
	// function setWobbleDirection(direction) { // Removed unused function
	// 	// Get current state to check if this is a redundant update
	// 	const currentState = get(_state); // Use _state
	//
	// 	// Skip if current direction already matches target direction to prevent cycles
	// 	if (currentState.wobbleDirection === direction) {
	// 		if (currentState.debug) {
	// 			console.log(`Skipping redundant wobble direction update: already ${direction}`);
	// 		}
	// 		return; // This return makes the debugLog below unreachable
	// 		// This function is now effectively a no-op as wobble is triggered directly
	// 		// in setRecording. Could be removed if no external calls remain.
	// 		// debugLog(`setWobbleDirection called with ${direction} - currently no-op`, 'warn');
	// 	}
	// } // Removed unused function

	/**
	 * Checks if it's the first visit based on body attribute (client-side only)
	 * and updates the store state accordingly.
	 * @returns {boolean} True if it was determined to be the first visit, false otherwise.
	 */
	function checkAndSetFirstVisit() {
		if (browser) {
			const firstVisit = !document.body.hasAttribute('data-ghost-animated');
			if (firstVisit) {
				debugLog('First visit detected, updating store.');
				_state.update((s) => ({ ...s, isFirstVisit: true })); // Use _state
				return true;
			} else {
				// Ensure store reflects non-first visit if attribute is present
				_state.update((s) => ({ ...s, isFirstVisit: false })); // Use _state
			}
		}
		return false; // Not first visit or not in browser
	}

	/**
	 * Mark first visit animation as complete
	 */
	function completeFirstVisit() {
		if (browser) {
			document.body.setAttribute('data-ghost-animated', 'true');
			_state.update((s) => ({ ...s, isFirstVisit: false })); // Use _state
		}
	}

	/**
	 * Reset the state store
	 */
	function reset() {
		_state.update((s) => {
			// Use _state
			// Clean up all timeouts
			Object.values(s.stateTimeouts).forEach((timeout) => {
				if (timeout) clearTimeout(timeout);
			});

			return {
				current: ANIMATION_STATES.IDLE,
				previous: null,
				isRecording: false,
				isProcessing: false,
				eyesClosed: false,
				eyePosition: { x: 0, y: 0 },
				isEyeTrackingEnabled: true,
				// isWobbling: false, // Removed
				// wobbleDirection: null, // Removed
				// wobbleTimeoutId: null, // Removed
				// isSpecialAnimationActive removed
				inactivityTimerId: null, // Clear inactivity timer on reset
				debug: s.debug,
				isFirstVisit: false, // Assume reset happens after first visit
				stateTimeouts: {}
			};
		});
	}

	/**
	 * Resets the inactivity timer. If in IDLE state, starts a new timer.
	 * If the timer expires, transitions to ASLEEP state.
	 */
	function resetInactivityTimer() {
		const currentStoreState = get(_state);
		if (currentStoreState.inactivityTimerId) {
			clearTimeout(currentStoreState.inactivityTimerId);
		}

		if (currentStoreState.current === ANIMATION_STATES.IDLE) {
			debugLog(`Starting inactivity timer for ${BLINK_CONFIG.INACTIVITY_TIMEOUT}ms.`);
			const newTimerId = setTimeout(() => {
				debugLog('Inactivity timer expired. Transitioning to ASLEEP.');
				setAnimationState(ANIMATION_STATES.ASLEEP);
			}, BLINK_CONFIG.INACTIVITY_TIMEOUT);
			_state.update(s => ({ ...s, inactivityTimerId: newTimerId }));
		} else {
			_state.update(s => ({ ...s, inactivityTimerId: null }));
		}
	}
	resetInactivityTimerFunc = resetInactivityTimer; // Assign to forward-declared variable

	/**
	 * Wakes the ghost up from ASLEEP state.
	 */
	function wakeUp() {
		const currentStoreState = get(_state);
		if (currentStoreState.current === ANIMATION_STATES.ASLEEP) {
			debugLog('Waking up from ASLEEP state.');
			setAnimationState(ANIMATION_STATES.IDLE);
			// The transition to IDLE will automatically call resetInactivityTimer.
		}
	}

	/**
	 * Enable or disable debug mode
	 * @param {boolean} enabled - Whether debug is enabled
	 */
	function setDebug(enabled) {
		// ADD THESE LINES
		const storeBefore = get(_state);
		console.log(
			`[GhostStateStore SETDEBUG_CALL] Called with: ${enabled}. Type: ${typeof enabled}. Current store debug before update: ${storeBefore.debug}`
		);
		// END ADD
		_state.update((s) => ({ ...s, debug: !!enabled })); // Ensure it's a boolean
		// ADD THIS LINE
		console.log(`[GhostStateStore SETDEBUG_RESULT] Store debug after update: ${get(_state).debug}`);
		// END ADD
	}

	// Derived store for component props
	const props = derived(_state, ($state) => ({
		// Use _state
		animationState: $state.current,
		isRecording: $state.isRecording,
		isProcessing: $state.isProcessing
	}));

	// Combined store with public API
	const _ghostStateStore = {
		// Use internal name
		subscribe: _state.subscribe, // Use _state
		props: props,
		setAnimationState,
		setRecording,
		setProcessing,
		setEyePosition,
		setEyesClosed,
		// --- Removed setWobbling and setWobbleDirection from public API ---
		// setSpecialAnimation is removed, use setAnimationState(ANIMATION_STATES.EASTER_EGG)
		setDebug,
		checkAndSetFirstVisit, // Expose the new method
		completeFirstVisit,
		reset,
		// Expose new methods for inactivity and wake up
		resetInactivityTimer,
		wakeUp
	};

	// --- Define derived stores here, inside the factory function (using underscore prefix) ---
	const _currentState = derived(_state, ($state) => $state.current); // Use _state
	const _previousState = derived(_state, ($state) => $state.previous); // Use _state
	const _isRecording = derived(_state, ($state) => $state.isRecording); // Use _state
	const _isProcessing = derived(_state, ($state) => $state.isProcessing); // Use _state
	const _eyePosition = derived(_state, ($state) => $state.eyePosition); // Use _state
	const _eyesClosed = derived(_state, ($state) => $state.eyesClosed); // Use _state
	const _isEyeTrackingEnabled = derived(_state, ($state) => $state.isEyeTrackingEnabled); // Use _state
	const _isFirstVisit = derived(_state, ($state) => $state.isFirstVisit); // Use _state
	// ---

	// Add derived stores to the public API object (mapping names)
	return {
		..._ghostStateStore, // Spread existing methods from internal object
		// Add derived stores
		currentState: _currentState,
		previousState: _previousState,
		isRecording: _isRecording,
		isProcessing: _isProcessing,
		eyePosition: _eyePosition,
		eyesClosed: _eyesClosed,
		isEyeTrackingEnabled: _isEyeTrackingEnabled,
		isFirstVisit: _isFirstVisit
	};
} // <-- Closing brace for createGhostStateStore function moved here

// Create singleton instance
export const ghostStateStore = createGhostStateStore();

// --- Removed redundant top-level derived exports ---
// Convenience exports are now part of the ghostStateStore object itself

// Default export for convenience
export default ghostStateStore;
