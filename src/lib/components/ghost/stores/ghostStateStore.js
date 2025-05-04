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
  CSS_CLASSES
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
    // Whether the ghost is wobbling
    isWobbling: false,
    // Wobble direction (CSS_CLASSES.WOBBLE_LEFT or CSS_CLASSES.WOBBLE_RIGHT)
    wobbleDirection: null,  
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
    
    // Special handling for wobbling state
    const isWobbling = newState === ANIMATION_STATES.WOBBLING;
    
    // Update state
    state.update(s => ({
      ...s,
      previous: s.current,
      current: newState,
      isEyeTrackingEnabled: behavior.eyeTracking,
      // Set isWobbling flag automatically when entering wobbling state
      isWobbling: isWobbling ? true : s.isWobbling
    }));
    
    // Set up cleanup timeout if needed
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
    
    // Handle recording start
    if (isRecording && !wasRecording) {
      console.log("🎙️ Recording started - transitioning to recording state");
      
      // Ensure we're in the correct state 
      // This is now handled by the Ghost.svelte component directly
      
      // Just make sure we transition to recording state after a short delay
      // The wobble will be initiated from the component
      setTimeout(() => {
        // Check that we're not being called redundantly
        const updatedState = get(state);
        if (updatedState.isRecording && updatedState.current !== ANIMATION_STATES.RECORDING) {
          setAnimationState(ANIMATION_STATES.RECORDING);
        }
      }, 800); // Allow enough time for wobble animation to complete
    } 
    // Handle recording stop
    else if (!isRecording && wasRecording) {
      console.log("🛑 Recording stopped - transitioning to wobble state");
      
      // Reset wobble state to ensure animation gets applied
      setWobbleDirection(null);
      
      // Reset wobbling state if it was already wobbling to force reapplying
      if (currentState.isWobbling) {
        state.update(s => ({ ...s, isWobbling: false }));
      }
      
      // Delay to ensure state updates have propagated
      setTimeout(() => {
        // Set animation and wobbling state
        setAnimationState(ANIMATION_STATES.WOBBLING);
        state.update(s => ({ ...s, isWobbling: true }));
        
        // Set a wobble direction immediately to trigger animation
        const wobbleDir = Math.random() < 0.5 ? CSS_CLASSES.WOBBLE_LEFT : CSS_CLASSES.WOBBLE_RIGHT;
        setWobbleDirection(wobbleDir);
        
        // Debug logging
        if (get(state).debug) {
          console.log(`Recording stop: Set wobble direction to ${wobbleDir}`);
        }
      }, 10);
      
      // After wobble, transition to appropriate state
      setTimeout(() => {
        const currentState = get(state);
        if (currentState.isProcessing) {
          setAnimationState(ANIMATION_STATES.THINKING);
        } else {
          setAnimationState(ANIMATION_STATES.IDLE);
        }
      }, 650); // Slightly longer than wobble duration
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
   * Set the wobble direction
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
    
    // Update wobble direction
    state.update(s => ({ ...s, wobbleDirection: direction }));
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
        isWobbling: false,
        wobbleDirection: null,
        isSpecialAnimationActive: false,
        debug: s.debug,
        isFirstVisit: false,
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
    setWobbling: (isWobbling) => {
      // Get current state before updating to check if this is a redundant update
      const currentState = get(state);
      
      // Special case for recording state transitions - always allow wobble animation updates
      const isHandlingRecordingTransition = 
        (currentState.isRecording && !currentState.wobbleDirection) ||
        (!currentState.isRecording && currentState.current === ANIMATION_STATES.RECORDING);
      
      // Skip redundant updates except for recording transitions
      if (currentState.isWobbling === isWobbling && !isHandlingRecordingTransition) {
        if (currentState.debug) {
          console.log(`Skipping redundant wobbling state update: already ${isWobbling}`);
        }
        return;
      }
      
      // Force reset the wobble direction when setting wobbling to true to ensure animation triggers
      if (isWobbling && currentState.isWobbling && !isHandlingRecordingTransition) {
        // Reset wobble direction first to allow re-triggering the animation
        setWobbleDirection(null);
      }
      
      // Update wobbling state
      state.update(s => ({ ...s, isWobbling }));
      
      if (isWobbling) {
        // Set animation state if not already in WOBBLING state
        if (currentState.current !== ANIMATION_STATES.WOBBLING) {
          setAnimationState(ANIMATION_STATES.WOBBLING);
        }
        
        // Always set a wobble direction with slight delay to ensure state is ready
        setTimeout(() => {
          const updatedState = get(state);
          if (updatedState.isWobbling) {
            // Force new direction even if one exists for recording transitions
            const wobbleDir = Math.random() < 0.5 ? CSS_CLASSES.WOBBLE_LEFT : CSS_CLASSES.WOBBLE_RIGHT;
            setWobbleDirection(wobbleDir);
            
            if (updatedState.debug) {
              console.log(`Set wobble direction to ${wobbleDir}`);
            }
          }
        }, 5);
      }
    },
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