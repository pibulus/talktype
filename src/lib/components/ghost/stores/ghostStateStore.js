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
	WOBBLE_CONFIG,
	BLINK_CONFIG
} from '../animationConfig.js';

const RAF_RECORDING_START_TIMEOUT = 'rafRecordingStart';
const WOBBLE_TIMEOUT_KEYS = [
	'startWobbleDelay',
	'stopWobbleDelay',
	'startWobbleCleanup',
	'stopWobbleCleanup'
];

function createGhostState(overrides = {}) {
	return {
		current: ANIMATION_STATES.IDLE,
		previous: null,
		isRecording: false,
		isProcessing: false,
		eyesClosed: false,
		eyePosition: { x: 0, y: 0 },
		isEyeTrackingEnabled: true,
		inactivityTimerId: null,
		debug: false,
		isFirstVisit: false,
		specialAnimation: null,
		stateTimeouts: {},
		...overrides
	};
}

/**
 * Create the ghost animation state machine
 */
function createGhostStateStore() {
	// Internal state store (make sure this 'state' is used throughout)
	const _state = writable(createGhostState({ current: ANIMATION_STATES.INITIAL }));
	let wobbleTargetElement = null;
	let wobbleTargetOwner = null;

	function setWobbleTarget(element, owner = null) {
		if (element) {
			wobbleTargetElement = element;
			wobbleTargetOwner = owner;
			return;
		}

		if (!owner || owner === wobbleTargetOwner) {
			clearWobbleTimeouts();
			wobbleTargetElement = null;
			wobbleTargetOwner = null;
		}
	}

	function clearScheduledWork(stateName, handle) {
		if (!handle) return;
		if (stateName === RAF_RECORDING_START_TIMEOUT) {
			cancelAnimationFrame(handle);
			return;
		}
		clearTimeout(handle);
	}

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
		if (!currentDebugFlag) return;
		console[level](`[GhostState] ${message}`);
	}

	/**
	 * Clear any timeout associated with a specific state
	 * @param {string} stateName - State to clear timeout for
	 */
	function clearStateTimeout(stateName) {
		const currentState = get(_state);

		if (currentState.stateTimeouts[stateName]) {
			clearScheduledWork(stateName, currentState.stateTimeouts[stateName]);
			setStateTimeout(stateName, null);
		}
	}

	function clearWobbleTimeouts() {
		WOBBLE_TIMEOUT_KEYS.forEach(clearStateTimeout);
	}

	function setStateTimeout(stateName, timeoutId) {
		_state.update((s) => ({
			...s,
			stateTimeouts: {
				...s.stateTimeouts,
				[stateName]: timeoutId
			}
		}));
	}

	// Forward declaration for use in setAnimationState
	let resetInactivityTimerFunc;

	/**
	 * Set a new animation state with proper validation
	 * @param {string} newState - Target animation state
	 * @returns {boolean} Whether the transition was successful
	 */
	function setAnimationState(newState) {
		const currentState = get(_state);

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
		} else if (
			currentState.current === ANIMATION_STATES.IDLE &&
			newState !== ANIMATION_STATES.ASLEEP
		) {
			// Clear inactivity timer if moving from IDLE to something other than ASLEEP
			if (get(_state).inactivityTimerId) {
				clearTimeout(get(_state).inactivityTimerId);
				_state.update((s) => ({ ...s, inactivityTimerId: null }));
			}
		}

		// Handle eye state for ASLEEP and WAKING_UP
		let newEyesClosedState = currentState.eyesClosed;
		if (newState === ANIMATION_STATES.ASLEEP) {
			// Eyes start open when falling asleep, animation closes them and holds state via 'forwards'
			newEyesClosedState = false;
		} else if (
			currentState.current === ANIMATION_STATES.ASLEEP &&
			newState === ANIMATION_STATES.WAKING_UP
		) {
			// Ensure eyes are open when starting the wake-up sequence
			newEyesClosedState = false; // Waking up opens eyes
		} else if (
			currentState.current === ANIMATION_STATES.WAKING_UP &&
			newState === ANIMATION_STATES.IDLE
		) {
			// Ensure eyes are open when finishing wake-up and going to IDLE
			newEyesClosedState = false;
		}

		// Update state
		_state.update((s) => ({
			// Use _state
			...s,
			previous: s.current,
			current: newState,
			specialAnimation: newState === ANIMATION_STATES.EASTER_EGG ? s.specialAnimation : null,
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
				const _currentState = get(_state);
				if (_currentState.current === newState) {
					setAnimationState(ANIMATION_STATES.IDLE);
				}
			}, behavior.cleanupDelay);

			setStateTimeout(newState, timeoutId);
		}

		return true;
	}

	/**
	 * Apply wobble animation to the ghost
	 * @param {'start' | 'stop'} type - Type of wobble animation
	 * @returns {void}
	 */
	function applyWobbleAnimation(type) {
		const spinPivot = wobbleTargetElement?.isConnected ? wobbleTargetElement : null;
		if (!spinPivot) {
			debugLog(`[Wobble] Could not find .ghost-spin-pivot target for ${type}`, 'warn');
			return;
		}

		clearWobbleTimeouts();

		// Check if initial load is running before cleaning
		const wobbleGroup = spinPivot.querySelector('.ghost-wobble-group');
		const hasInitialLoad =
			spinPivot.classList.contains('initial-load-effect') ||
			wobbleGroup?.classList.contains('initial-load-effect');

		// Clean up any existing animation classes first, including initial load
		wobbleGroup?.classList.remove('initial-load-effect');
		spinPivot.classList.remove('initial-load-effect', 'wobble-left', 'wobble-right', 'wobble-both');

		const wobbleClass =
			type === 'start' ? WOBBLE_CONFIG.RECORDING_START_CLASS : WOBBLE_CONFIG.RECORDING_STOP_CLASS;

		// Small delay if initial load effect was present to let animation settle
		if (hasInitialLoad) {
			const timeoutKey = `${type}WobbleDelay`;
			const timeoutId = setTimeout(() => {
				if (spinPivot.isConnected) {
					void spinPivot.offsetWidth;
					spinPivot.classList.add(wobbleClass);
					scheduleWobbleCleanup(type, spinPivot, wobbleClass);
				}
				debugLog(`[Wobble] Applied ${wobbleClass} after initial load delay`);
				clearStateTimeout(timeoutKey);
			}, 150);
			setStateTimeout(timeoutKey, timeoutId);
			return;
		}

		// Force reflow before adding class
		void spinPivot.offsetWidth;
		spinPivot.classList.add(wobbleClass);
		debugLog(`[Wobble] Applied ${wobbleClass} to spin pivot`);

		scheduleWobbleCleanup(type, spinPivot, wobbleClass);
	}

	function scheduleWobbleCleanup(type, spinPivot, wobbleClass) {
		const timeoutKey = `${type}WobbleCleanup`;
		const timeoutId = setTimeout(() => {
			if (spinPivot.isConnected) {
				spinPivot.classList.remove(wobbleClass);
			}
			clearStateTimeout(timeoutKey);
			debugLog(`[Wobble] Removed ${wobbleClass} from spin pivot`);
		}, WOBBLE_CONFIG.DURATION + 50);

		// Store timeout ID for potential cleanup
		setStateTimeout(timeoutKey, timeoutId);
	}

	/**
	 * Handle recording start sequence
	 * @param {Object} currentState - Current state object
	 */
	function handleRecordingStart(currentState) {
		debugLog('🎙️ Recording started - applying wobble effect first');

		// 1. Set isRecording flag immediately
		_state.update((s) => ({ ...s, isRecording: true }));

		// 2. Apply wobble animation
		applyWobbleAnimation('start');

		// 3. Schedule state transition to RECORDING on next frame
		if (currentState.stateTimeouts[RAF_RECORDING_START_TIMEOUT]) {
			cancelAnimationFrame(currentState.stateTimeouts[RAF_RECORDING_START_TIMEOUT]);
		}

		const rafId = requestAnimationFrame(() => {
			if (get(_state).isRecording) {
				debugLog('Next frame: Transitioning state to RECORDING');
				setAnimationState(ANIMATION_STATES.RECORDING);
			} else {
				debugLog('Recording stopped before next frame state transition could occur.');
			}
			setStateTimeout(RAF_RECORDING_START_TIMEOUT, null);
		});

		// Store RAF ID for potential cleanup
		setStateTimeout(RAF_RECORDING_START_TIMEOUT, rafId);
	}

	/**
	 * Handle recording stop sequence
	 * @param {Object} currentState - Current state object
	 */
	function handleRecordingStop(currentState) {
		debugLog('🛑 Recording stopped - applying wobble effect');

		// 1. Set isRecording flag to false immediately
		_state.update((s) => ({ ...s, isRecording: false }));

		// Clear any pending next-frame start transition
		if (currentState.stateTimeouts[RAF_RECORDING_START_TIMEOUT]) {
			cancelAnimationFrame(currentState.stateTimeouts[RAF_RECORDING_START_TIMEOUT]);
			setStateTimeout(RAF_RECORDING_START_TIMEOUT, null);
		}

		// 2. Transition to appropriate end state
		const endState = currentState.isProcessing ? ANIMATION_STATES.THINKING : ANIMATION_STATES.IDLE;
		setAnimationState(endState);

		// 3. Apply wobble animation
		applyWobbleAnimation('stop');
	}

	/**
	 * Set the recording state
	 * @param {boolean} isRecording - Whether recording is active
	 */
	function setRecording(isRecording) {
		const currentState = get(_state);
		const wasRecording = currentState.isRecording;

		// No change needed
		if (isRecording === wasRecording) {
			return;
		}

		if (isRecording && !wasRecording) {
			handleRecordingStart(currentState);
		} else if (!isRecording && wasRecording) {
			handleRecordingStop(currentState);
		}
	}

	/**
	 * Set the processing state
	 * @param {boolean} isProcessing - Whether processing is active
	 */
	function setProcessing(isProcessing) {
		_state.update((s) => ({ ...s, isProcessing }));

		// Auto-transition to thinking state if true
		if (isProcessing) {
			setAnimationState(ANIMATION_STATES.THINKING);
		} else if (get(_state).current === ANIMATION_STATES.THINKING) {
			// Use _state
			// If we were thinking, go back to idle unless recording
			const currentState = get(_state);
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
		_state.update((s) => ({ ...s, eyesClosed: closed }));
	}

	function setSpecialAnimation(animationName) {
		_state.update((s) => ({ ...s, specialAnimation: animationName || null }));
	}

	/**
	 * Checks if it's the first visit based on body attribute (client-side only)
	 * and updates the store state accordingly.
	 * @returns {boolean} True if it was determined to be the first visit, false otherwise.
	 */
	function checkAndSetFirstVisit() {
		if (browser) {
			// Use sessionStorage for first-visit detection (survives reload, not browser restart)
			const hasSeenGhost = sessionStorage.getItem('ghost-seen');
			const firstVisit = !hasSeenGhost;

			if (firstVisit) {
				debugLog('First visit detected, updating store.');
				sessionStorage.setItem('ghost-seen', 'true');
				_state.update((s) => ({ ...s, isFirstVisit: true }));
				return true;
			} else {
				// Ensure store reflects non-first visit
				_state.update((s) => ({ ...s, isFirstVisit: false }));
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
			_state.update((s) => ({ ...s, isFirstVisit: false }));
		}
	}

	/**
	 * Reset the state store
	 */
	function reset(owner = null) {
		if (owner && wobbleTargetOwner && owner !== wobbleTargetOwner) return;

		_state.update((s) => {
			// Use _state
			// Clean up all timeouts
			Object.entries(s.stateTimeouts).forEach(([stateName, handle]) => {
				clearScheduledWork(stateName, handle);
			});

			return createGhostState({
				debug: s.debug,
				current: ANIMATION_STATES.IDLE
			});
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
			_state.update((s) => ({ ...s, inactivityTimerId: newTimerId }));
		} else {
			_state.update((s) => ({ ...s, inactivityTimerId: null }));
		}
	}
	resetInactivityTimerFunc = resetInactivityTimer; // Assign to forward-declared variable

	/**
	 * Wakes the ghost up from ASLEEP state.
	 */
	function wakeUp() {
		const currentStoreState = get(_state);
		if (currentStoreState.current === ANIMATION_STATES.ASLEEP) {
			debugLog('Waking up from ASLEEP state, transitioning to WAKING_UP.');
			setAnimationState(ANIMATION_STATES.WAKING_UP);
			// The state machine will automatically transition from WAKING_UP to IDLE after cleanupDelay.
			// The transition to IDLE will then call resetInactivityTimer.
		}
	}

	/**
	 * Enable or disable debug mode
	 * @param {boolean} enabled - Whether debug is enabled
	 */
	function setDebug(enabled) {
		_state.update((s) => ({ ...s, debug: !!enabled })); // Ensure it's a boolean
	}

	// Combined store with public API
	const _ghostStateStore = {
		// Use internal name
		subscribe: _state.subscribe,
		setAnimationState,
		setRecording,
		setProcessing,
		setEyePosition,
		setEyesClosed,
		setSpecialAnimation,
		setWobbleTarget,
		setDebug,
		checkAndSetFirstVisit, // Expose the new method
		completeFirstVisit,
		reset,
		// Expose new methods for inactivity and wake up
		resetInactivityTimer,
		wakeUp
	};

	// --- Define derived stores here, inside the factory function (using underscore prefix) ---
	const _currentState = derived(_state, ($state) => $state.current);
	const _previousState = derived(_state, ($state) => $state.previous);
	const _isRecording = derived(_state, ($state) => $state.isRecording);
	const _isProcessing = derived(_state, ($state) => $state.isProcessing);
	const _eyePosition = derived(_state, ($state) => $state.eyePosition);
	const _eyesClosed = derived(_state, ($state) => $state.eyesClosed);
	const _isEyeTrackingEnabled = derived(_state, ($state) => $state.isEyeTrackingEnabled);
	const _isFirstVisit = derived(_state, ($state) => $state.isFirstVisit);
	const _specialAnimation = derived(_state, ($state) => $state.specialAnimation);
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
		isFirstVisit: _isFirstVisit,
		specialAnimation: _specialAnimation
	};
}

// Create singleton instance
export const ghostStateStore = createGhostStateStore();

// Default export for convenience
export default ghostStateStore;
