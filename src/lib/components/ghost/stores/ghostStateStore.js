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
  WOBBLE_CONFIG // Import WOBBLE_CONFIG
} from '../animationConfig.js';

/**
 * Create the ghost animation state machine
 */
function createGhostStateStore() {
  // Internal state store
  const state = writable({
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
    // Whether the ghost is wobbling (visual effect only)
    isWobbling: false,
    // Wobble direction (CSS_CLASSES.WOBBLE_LEFT or CSS_CLASSES.WOBBLE_RIGHT)
    wobbleDirection: null,
    // Timeout ID for clearing wobble effect
    wobbleTimeoutId: null,
    // Whether a special animation is active
    isSpecialAnimationActive: false,
    // Debug mode
    debug: false,
    // First visit (for initial animation)
    isFirstVisit: browser ? !document.body.hasAttribute('data-ghost-animated') : true,
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
    if (!get(state).debug) return;
    console[level](`[GhostState] ${message}`);
  }

  /**
   * Clear any timeout associated with a specific state
   * @param {string} stateName - State to clear timeout for
   */
  function clearStateTimeout(stateName) {
    const currentState = get(state);
    
    if (currentState.stateTimeouts[stateName]) {
      clearTimeout(currentState.stateTimeouts[stateName]);
      
      state.update(s => ({
        ...s,
        stateTimeouts: {
          ...s.stateTimeouts,
          [stateName]: null
        }
      }));
    }
  }

  /**
   * Set a new animation state with proper validation
   * @param {string} newState - Target animation state
   * @returns {boolean} Whether the transition was successful
   */
  function setAnimationState(newState) {
    const currentState = get(state);
    
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
    
    // Clear current state timeout if exists
    clearStateTimeout(currentState.current);
    
    // Update state
    state.update(s => ({
      ...s,
      previous: s.current,
      current: newState,
      isEyeTrackingEnabled: behavior.eyeTracking
      // isWobbling flag is managed separately now
    }));
    
    // Set up cleanup timeout if needed (e.g., for REACTING state)
    if (behavior.cleanupDelay && behavior.cleanupDelay > 0) {
      debugLog(`Setting cleanup timeout for ${newState} → IDLE in ${behavior.cleanupDelay}ms`);
      
      const timeoutId = setTimeout(() => {
        const state = get(ghostStateStore);
        if (state.current === newState) {
          setAnimationState(ANIMATION_STATES.IDLE);
        }
      }, behavior.cleanupDelay);
      
      state.update(s => ({
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
    const currentState = get(state);
    const wasRecording = currentState.isRecording;
    
    // Skip if state is already correct to prevent cycles
    if (currentState.isRecording === isRecording) {
      console.log(`Skipping redundant recording state update: already ${isRecording}`);
      return;
    }
    
    // Debug logging
    if (currentState.debug) {
      console.log(`Setting recording state: ${wasRecording} → ${isRecording}`);
    }
    
    // Update recording state
    state.update(s => ({ ...s, isRecording }));
    
    // --- Recording Start Sequence ---
    if (isRecording && !wasRecording) {
      debugLog("🎙️ Recording started - applying wobble effect first");
      
      // 1. Apply wobble effect immediately (set flags, start timer to clear)
      applyWobbleEffectFlags();
      
      // 2. Schedule setting the RECORDING state on the *next animation frame*
      // This ensures the wobble transform renders before recording animations start.
      // Clear any pending frame request first
      if (currentState.stateTimeouts.rafRecordingStart) {
        cancelAnimationFrame(currentState.stateTimeouts.rafRecordingStart);
      }
      const rafId = requestAnimationFrame(() => {
        // Check if we are still intending to record (user might have stopped quickly)
        if (get(state).isRecording) {
           debugLog("Next frame: Transitioning state to RECORDING");
           setAnimationState(ANIMATION_STATES.RECORDING);
        } else {
           debugLog("Recording stopped before next frame state transition could occur.");
        }
        // Clear the stored RAF ID after execution
        state.update(s => ({
          ...s,
          stateTimeouts: { ...s.stateTimeouts, rafRecordingStart: null }
        }));
      });

      // Store RAF ID for potential cleanup if user stops recording quickly
      state.update(s => ({
        ...s,
        stateTimeouts: { ...s.stateTimeouts, rafRecordingStart: rafId }
      }));

    } 
    // --- Recording Stop Sequence ---
    else if (!isRecording && wasRecording) {
      debugLog("🛑 Recording stopped - applying wobble effect");

      // Clear any pending next-frame start transition
      if (currentState.stateTimeouts.rafRecordingStart) {
        cancelAnimationFrame(currentState.stateTimeouts.rafRecordingStart);
        state.update(s => ({
          ...s,
          stateTimeouts: { ...s.stateTimeouts, rafRecordingStart: null }
        }));
      }
      
      // 1. Transition directly to appropriate end state
      const endState = currentState.isProcessing ? ANIMATION_STATES.THINKING : ANIMATION_STATES.IDLE;
      setAnimationState(endState);
      
      // 2. Apply wobble effect (set flags, start timer to clear)
      applyWobbleEffectFlags();
    }
  }

  /**
   * Set the processing state
   * @param {boolean} isProcessing - Whether processing is active
   */
  function setProcessing(isProcessing) {
    state.update(s => ({ ...s, isProcessing }));
    
    // Auto-transition to thinking state if true
    if (isProcessing) {
      setAnimationState(ANIMATION_STATES.THINKING);
    } else if (get(state).current === ANIMATION_STATES.THINKING) {
      // If we were thinking, go back to idle unless recording
      const currentState = get(state);
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
    state.update(s => ({
      ...s,
      eyePosition: { x, y }
    }));
  }

  /**
   * Set the eye closed state
   * @param {boolean} closed - Whether eyes are closed
   */
  function setEyesClosed(closed) {
    state.update(s => ({ ...s, eyesClosed: closed }));
  }

  /**
   * Apply wobble effect flags and schedule cleanup
   * @param {string|null} direction - Optional direction override
   */
  function applyWobbleEffectFlags(direction = null) {
    const currentState = get(state);
    
    // Clear any existing wobble timeout
    if (currentState.wobbleTimeoutId) {
      clearTimeout(currentState.wobbleTimeoutId);
    }

    // Determine direction
    const wobbleDir = direction || (Math.random() < 0.5 ? CSS_CLASSES.WOBBLE_LEFT : CSS_CLASSES.WOBBLE_RIGHT);
    
    // Set wobble flags
    state.update(s => ({
      ...s,
      isWobbling: true,
      wobbleDirection: wobbleDir,
      wobbleTimeoutId: null // Clear previous timeout ID before setting new one
    }));
    debugLog(`Applied wobble effect: direction=${wobbleDir}`);

    // Schedule cleanup to remove wobble flags
    const timeoutId = setTimeout(() => {
      state.update(s => {
        // Only clear if this timeout is the current one
        if (s.wobbleTimeoutId === timeoutId) {
          debugLog(`Clearing wobble effect: direction=${s.wobbleDirection}`);
          return {
            ...s,
            isWobbling: false,
            wobbleDirection: null,
            wobbleTimeoutId: null
          };
        }
        return s; // Return unchanged state if timeout ID doesn't match
      });
    }, WOBBLE_CONFIG.DURATION + 25); // Use new duration + smaller buffer

    // Store the new timeout ID
    state.update(s => ({ ...s, wobbleTimeoutId: timeoutId }));
  }
  
  /**
   * Set the wobble direction (now primarily used by external triggers)
   * @param {string} direction - Wobble direction CSS class
   */
  function setWobbleDirection(direction) {
    // Get current state to check if this is a redundant update
    const currentState = get(state);
    
    // Skip if current direction already matches target direction to prevent cycles
    if (currentState.wobbleDirection === direction) {
      if (currentState.debug) {
        console.log(`Skipping redundant wobble direction update: already ${direction}`);
      }
      return;
    }
    
    // If setting a direction, assume we want to start the wobble effect
    applyWobbleEffectFlags(direction);
  }

  /**
   * Mark first visit animation as complete
   */
  function completeFirstVisit() {
    if (browser) {
      document.body.setAttribute('data-ghost-animated', 'true');
      state.update(s => ({ ...s, isFirstVisit: false }));
    }
  }

  /**
   * Reset the state store
   */
  function reset() {
    state.update(s => {
      // Clean up all timeouts
      Object.values(s.stateTimeouts).forEach(timeout => {
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
        isWobbling: false, // Reset wobble state
        wobbleDirection: null,
        wobbleTimeoutId: null,
        isSpecialAnimationActive: false,
        debug: s.debug,
        isFirstVisit: false, // Assume reset happens after first visit
        stateTimeouts: {}
      };
    });
  }

  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Whether debug is enabled
   */
  function setDebug(enabled) {
    state.update(s => ({ ...s, debug: enabled }));
  }

  // Derived store for component props
  const props = derived(state, $state => ({
    animationState: $state.current,
    isRecording: $state.isRecording,
    isProcessing: $state.isProcessing
  }));

  // Combined store with public API
  const ghostStateStore = {
    subscribe: state.subscribe,
    props: props,
    setAnimationState,
    setRecording,
    setProcessing,
    setEyePosition,
    setEyesClosed,
    // Simplified setWobbling - primarily for external triggers now
    setWobbling: (isWobbling, direction = null) => {
      if (isWobbling) {
        applyWobbleEffectFlags(direction);
      } else {
        // Clear wobble effect immediately if requested
        const currentState = get(state);
        if (currentState.wobbleTimeoutId) {
          clearTimeout(currentState.wobbleTimeoutId);
        }
        state.update(s => ({
          ...s,
          isWobbling: false,
          wobbleDirection: null,
          wobbleTimeoutId: null
        }));
        debugLog("Cleared wobble effect manually");
      }
    },
    // setWobbleDirection now calls applyWobbleEffectFlags
    setWobbleDirection, 
    setSpecialAnimation: (isActive) => {
      state.update(s => ({ ...s, isSpecialAnimationActive: isActive }));
    },
    setDebug,
    completeFirstVisit,
    reset
  };

  return ghostStateStore;
}

// Create singleton instance
export const ghostStateStore = createGhostStateStore();

// Convenience exports
export const currentState = derived(ghostStateStore, $state => $state.current);
export const previousState = derived(ghostStateStore, $state => $state.previous);
export const isRecording = derived(ghostStateStore, $state => $state.isRecording);
export const isProcessing = derived(ghostStateStore, $state => $state.isProcessing);
export const eyePosition = derived(ghostStateStore, $state => $state.eyePosition);
export const eyesClosed = derived(ghostStateStore, $state => $state.eyesClosed);
export const isEyeTrackingEnabled = derived(ghostStateStore, $state => $state.isEyeTrackingEnabled);
export const isFirstVisit = derived(ghostStateStore, $state => $state.isFirstVisit);
export const ghostProps = ghostStateStore.props;

// Default export for convenience
export default ghostStateStore;
