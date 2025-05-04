/**
 * Eye Blinking Service
 * 
 * Handles eye blinking animations for the Ghost component.
 * Uses imperative DOM manipulation for performant animations
 * while coordinating with the reactive state system.
 */

import { get } from 'svelte/store';
import { 
  BLINK_CONFIG, 
  ANIMATION_STATES, 
  EYE_CONFIG,
  ANIMATION_BEHAVIORS
} from '../animationConfig.js';
import { 
  seedRandom, 
  cleanupTimers, 
  isBrowser 
} from '../utils/animationUtils.js';
import { ghostStateStore } from '../stores/ghostStateStore.js';

// Animation timers
const timers = {
  blinkTimeoutId: null,
  thinkingIntervalId: null
};

// Blinking state
let blinkCounter = 0;

/**
 * Apply eye transforms based on eye position and closed state
 * 
 * @param {SVGElement} leftEye - Left eye SVG element
 * @param {SVGElement} rightEye - Right eye SVG element
 */
export function applyEyeTransforms(leftEye, rightEye) {
  if (!leftEye || !rightEye) return;
  
  const state = get(ghostStateStore);
  
  if (state.eyesClosed) {
    // Apply closed eyes transform
    leftEye.style.transform = `scaleY(${EYE_CONFIG.CLOSED_SCALE})`;
    rightEye.style.transform = `scaleY(${EYE_CONFIG.CLOSED_SCALE})`;
  } else {
    // Apply position transforms
    const { x, y } = state.eyePosition;
    const xTransform = x * EYE_CONFIG.X_MULTIPLIER;
    const yTransform = y * EYE_CONFIG.Y_MULTIPLIER;
    
    leftEye.style.transform = `translate(${xTransform}px, ${yTransform}px)`;
    rightEye.style.transform = `translate(${xTransform}px, ${yTransform}px)`;
  }
}

/**
 * Initialize blinking animations based on current state
 * 
 * @param {Object} elements - DOM element references
 * @param {Object} config - Blink configuration
 * @returns {Function} Cleanup function
 */
export function initBlinking(elements, config = {}) {
  if (!isBrowser()) return () => {};
  
  const { leftEye, rightEye } = elements;
  const { seed = 0 } = config;
  
  // Set initial counter
  blinkCounter = 0;
  
  // Initial application of eye transforms
  applyEyeTransforms(leftEye, rightEye);
  
  // Set up state listener for animation state changes
  const unsubscribe = ghostStateStore.subscribe(state => {
    // If eyes closed state changes, update eyes
    applyEyeTransforms(leftEye, rightEye);
    
    // Clean up any existing animations when state changes
    if (state.current !== state.previous) {
      // Always clean up thinking interval when leaving THINKING state
      if (state.previous === ANIMATION_STATES.THINKING && timers.thinkingIntervalId) {
        clearInterval(timers.thinkingIntervalId);
        timers.thinkingIntervalId = null;
        
        // Ensure eyes are open when leaving thinking state
        if (state.eyesClosed) {
          ghostStateStore.setEyesClosed(false);
          applyEyeTransforms(leftEye, rightEye);
        }
      }
    }
    
    // Apply animations for current state
    if (state.current === ANIMATION_STATES.IDLE) {
      applyRandomBlinkEffect(elements, { seed });
    } else if (state.current === ANIMATION_STATES.THINKING) {
      applyRhythmicBlinkEffect(elements);
    }
    
    // Handle transition from recording/thinking to idle
    if (state.current === ANIMATION_STATES.IDLE && 
        (state.previous === ANIMATION_STATES.RECORDING || 
         state.previous === ANIMATION_STATES.THINKING)) {
      applyQuickBlinkEffect(elements, state.previous);
    }
  });
  
  // Return cleanup function
  return () => {
    unsubscribe();
    cleanupTimers(timers);
  };
}

/**
 * Perform a single blink animation
 * 
 * @param {Object} elements - DOM element references
 * @param {Function} onComplete - Optional callback when blink completes
 */
export function performSingleBlink(elements, onComplete) {
  const { leftEye, rightEye } = elements;
  
  // Close eyes
  ghostStateStore.setEyesClosed(true);
  applyEyeTransforms(leftEye, rightEye);
  
  // Open eyes after duration
  setTimeout(() => {
    ghostStateStore.setEyesClosed(false);
    applyEyeTransforms(leftEye, rightEye);
    
    if (onComplete) {
      onComplete();
    }
  }, BLINK_CONFIG.SINGLE_DURATION);
}

/**
 * Perform a double blink animation
 * 
 * @param {Object} elements - DOM element references
 * @param {Function} onComplete - Optional callback when blink completes
 */
export function performDoubleBlink(elements, onComplete) {
  const { leftEye, rightEye } = elements;
  
  // First blink
  ghostStateStore.setEyesClosed(true);
  applyEyeTransforms(leftEye, rightEye);
  
  setTimeout(() => {
    // Open eyes briefly
    ghostStateStore.setEyesClosed(false);
    applyEyeTransforms(leftEye, rightEye);
    
    // Second blink
    setTimeout(() => {
      ghostStateStore.setEyesClosed(true);
      applyEyeTransforms(leftEye, rightEye);
      
      setTimeout(() => {
        ghostStateStore.setEyesClosed(false);
        applyEyeTransforms(leftEye, rightEye);
        
        if (onComplete) {
          onComplete();
        }
      }, BLINK_CONFIG.SINGLE_DURATION);
    }, BLINK_CONFIG.DOUBLE_PAUSE);
  }, BLINK_CONFIG.SINGLE_DURATION);
}

/**
 * Apply random ambient blinking in idle state
 * 
 * @param {Object} elements - DOM element references 
 * @param {Object} config - Blink configuration
 */
export function applyRandomBlinkEffect(elements, config = {}) {
  const state = get(ghostStateStore);
  
  // Only apply when in idle state
  if (state.current !== ANIMATION_STATES.IDLE) return;
  
  const { seed = 0 } = config;
  
  // Schedule next random blink
  const scheduleNextBlink = () => {
    // Clear any existing timeout
    if (timers.blinkTimeoutId) {
      clearTimeout(timers.blinkTimeoutId);
    }
    
    // Random delay between blinks
    const random = seedRandom(seed, blinkCounter++, 0, 1);
    const delay = BLINK_CONFIG.MIN_GAP + random * (BLINK_CONFIG.MAX_GAP - BLINK_CONFIG.MIN_GAP);
    
    timers.blinkTimeoutId = setTimeout(() => {
      // Check if still in idle state
      const currentState = get(ghostStateStore);
      if (currentState.current !== ANIMATION_STATES.IDLE) {
        return;
      }
      
      // Execute blink based on random chance
      const blinkTypeRandom = seedRandom(seed, blinkCounter++, 0, 1);
      
      if (blinkTypeRandom < BLINK_CONFIG.DOUBLE_CHANCE) {
        performDoubleBlink(elements, () => scheduleNextBlink());
      } else {
        performSingleBlink(elements, () => scheduleNextBlink());
      }
    }, delay);
  };
  
  // Start the blink cycle
  scheduleNextBlink();
}

/**
 * Apply rhythmic blinking for thinking state
 * 
 * @param {Object} elements - DOM element references
 */
export function applyRhythmicBlinkEffect(elements) {
  const state = get(ghostStateStore);
  
  // Only apply when in thinking state
  if (state.current !== ANIMATION_STATES.THINKING) return;
  
  const { leftEye, rightEye } = elements;
  const behavior = ANIMATION_BEHAVIORS[ANIMATION_STATES.THINKING];
  
  // Make sure any previous timers are cleared to avoid double blinking
  // Clear any blink timeout
  if (timers.blinkTimeoutId) {
    clearTimeout(timers.blinkTimeoutId);
    timers.blinkTimeoutId = null;
  }
  
  // Always clear previous thinking interval before creating a new one
  if (timers.thinkingIntervalId) {
    clearInterval(timers.thinkingIntervalId);
    timers.thinkingIntervalId = null;
  }
  
  // Set up rhythmic blinking pattern
  timers.thinkingIntervalId = setInterval(() => {
    // Close eyes
    ghostStateStore.setEyesClosed(true);
    applyEyeTransforms(leftEye, rightEye);
    
    // Open after duration
    setTimeout(() => {
      // Only open if still in thinking state
      const currentState = get(ghostStateStore);
      if (currentState.current === ANIMATION_STATES.THINKING) {
        ghostStateStore.setEyesClosed(false);
        applyEyeTransforms(leftEye, rightEye);
      }
    }, behavior.blinkDuration);
  }, behavior.blinkInterval);
}

/**
 * Apply a quick blink after recording/thinking states
 * 
 * @param {Object} elements - DOM element references
 * @param {string} previousState - Previous animation state
 */
export function applyQuickBlinkEffect(elements, previousState) {
  const state = get(ghostStateStore);
  
  // Only apply when transitioning to idle from recording or thinking
  if (state.current !== ANIMATION_STATES.IDLE) return;
  if (previousState !== ANIMATION_STATES.RECORDING && 
      previousState !== ANIMATION_STATES.THINKING) return;
  
  // Clear any existing timeouts
  if (timers.blinkTimeoutId) {
    clearTimeout(timers.blinkTimeoutId);
  }
  
  // Schedule a quick blink after state transition
  timers.blinkTimeoutId = setTimeout(() => {
    const currentState = get(ghostStateStore);
    if (currentState.current === ANIMATION_STATES.IDLE) {
      // Add slight randomness to first blink
      const initialDelay = 100 + Math.floor(Math.random() * 300);
      
      setTimeout(() => {
        const verifyState = get(ghostStateStore);
        if (verifyState.current === ANIMATION_STATES.IDLE) {
          performSingleBlink(elements, () => {
            applyRandomBlinkEffect(elements);
          });
        }
      }, initialDelay);
    }
  }, 300);
}

/**
 * React to transcript with appropriate eye animation
 * 
 * @param {Object} elements - DOM element references
 * @param {number} textLength - Length of transcript text
 */
export function reactToTranscript(elements, textLength = 0) {
  const { leftEye, rightEye } = elements;
  
  // Skip if no elements
  if (!leftEye || !rightEye) return;
  
  // Set state to reacting
  ghostStateStore.setAnimationState(ANIMATION_STATES.REACTING);
  
  // Handle empty transcripts
  if (textLength === 0) {
    // Use setTimeout to avoid potential recursion
    setTimeout(() => {
      ghostStateStore.setAnimationState(ANIMATION_STATES.IDLE);
    }, 0);
    return;
  }
  
  // Small delay before reacting
  setTimeout(() => {
    if (textLength > EYE_CONFIG.TEXT_THRESHOLD) {
      // For longer transcripts, do a "satisfied" double blink
      performDoubleBlink(elements, () => {
        // Use setTimeout to break the call stack
        setTimeout(() => {
          ghostStateStore.setAnimationState(ANIMATION_STATES.IDLE);
        }, 0);
      });
    } else {
      // For short transcripts, just do a single blink
      performSingleBlink(elements, () => {
        // Use setTimeout to break the call stack
        setTimeout(() => {
          ghostStateStore.setAnimationState(ANIMATION_STATES.IDLE);
        }, 0);
      });
    }
  }, EYE_CONFIG.REACT_DELAY);
}

/**
 * Clean up all blinking resources
 */
export function cleanupBlinking() {
  // Specifically clear thinking interval if it exists
  if (timers.thinkingIntervalId) {
    clearInterval(timers.thinkingIntervalId);
    timers.thinkingIntervalId = null;
  }
  
  // Clear all other timers
  cleanupTimers(timers);
}

// Export the blink service
export default {
  initBlinking,
  applyEyeTransforms,
  performSingleBlink,
  performDoubleBlink,
  applyRandomBlinkEffect,
  applyRhythmicBlinkEffect,
  applyQuickBlinkEffect,
  reactToTranscript,
  cleanupBlinking
};