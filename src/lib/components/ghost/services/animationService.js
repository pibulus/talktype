/**
 * Ghost Animation Service
 * 
 * Handles imperative animations for the Ghost component.
 * This service bridges the reactive state and imperative DOM manipulation
 * for performance-critical animations.
 */

import { get } from 'svelte/store';
import { browser } from '$app/environment';
import { 
  forceReflow, 
  toggleClasses, 
  seedRandom,
  isBrowser,
  cleanupTimers
} from '../utils/animationUtils.js';
import { ANIMATION_STATES, CSS_CLASSES, SPECIAL_CONFIG, WOBBLE_CONFIG, ANIMATION_TIMING } from '../animationConfig.js';
import { ghostStateStore } from '../stores/ghostStateStore.js';
import { initGradientAnimation, cleanupAnimation } from '../gradientAnimator.js';

// Animation timers
const timers = {
  specialAnimationTimeoutId: null,
  wobbleTimeoutId: null
};

// Running animations tracking
let animations = {
  doingSpecialAnimation: false,
  isWobbling: false
};

/**
 * Initialize all animation systems
 * 
 * @param {Object} elements - DOM elements references
 * @param {Object} config - Animation configuration
 * @returns {Function} Cleanup function
 */
export function initAnimations(elements, config = {}) {
  if (!elements || !isBrowser()) return () => {};
  
  const { svgElement, seed = 0 } = config;
  
  // Initialize ghost shape gradient animation
  if (elements.ghostSvg && elements.ghostSvg.querySelector('svg')) {
    const svgElement = elements.ghostSvg.querySelector('svg');
    initThemeAnimation(svgElement, config.theme);
  }

  // Start watching for special animations (easter eggs)
  startSpecialAnimationWatch(elements.ghostSvg, seed);
  
  // Return cleanup function
  return () => {
    stopSpecialAnimationWatch();
    cleanupTimers(timers);
    animations = {
      doingSpecialAnimation: false,
      isWobbling: false 
    };
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
  const shapeElem = svgElement.querySelector('#ghost-shape');
  if (shapeElem) {
    forceReflow(shapeElem);
  }
  
  // Initialize gradient animations
  initGradientAnimation(theme, svgElement);
}

/**
 * Apply the initial loading animation
 * 
 * @param {HTMLElement} ghostSvg - Ghost SVG container element
 */
export function applyInitialLoadEffect(ghostSvg) {
  if (!isBrowser()) return;
  
  const state = get(ghostStateStore);
  
  // Skip if not first visit
  if (!state.isFirstVisit) return;
  
  // Apply initial load animation
  document.body.classList.add(CSS_CLASSES.INITIAL_LOAD);
  
  // Set up to remove class after animation completes
  setTimeout(() => {
    document.body.classList.remove(CSS_CLASSES.INITIAL_LOAD);
    ghostStateStore.completeFirstVisit();
    
    // Transition to wobbling state after initial animation
    ghostStateStore.setAnimationState(ANIMATION_STATES.WOBBLING);
    
    // Force a wobble with random direction after a small delay
    setTimeout(() => {
      const direction = Math.random() < 0.5 ? CSS_CLASSES.WOBBLE_LEFT : CSS_CLASSES.WOBBLE_RIGHT;
      // Apply wobble effect if the ghost is still in WOBBLING state
      if (get(ghostStateStore).current === ANIMATION_STATES.WOBBLING) {
        // Pass the direction to wobble in
        ghostStateStore.setWobbleDirection(direction);
      }
    }, 50); // Small delay to ensure state is ready
  }, ANIMATION_TIMING.INITIAL_LOAD_DURATION);
}

/**
 * Apply wobble animation to the ghost
 * 
 * @param {HTMLElement} ghostSvg - Ghost SVG container element
 * @param {Object} options - Wobble options
 * @param {string} options.direction - Force wobble direction ('left' or 'right')
 * @param {number} options.seed - Random seed for wobble direction
 * @param {boolean} options.force - Force reapplying even if already wobbling
 * @param {boolean} options.updateStore - Whether to update the store (default: true)
 */
export function applyWobbleEffect(ghostSvg, options = {}) {
  if (!ghostSvg) return;
  
  // Allow reapplying wobble if we have a new direction or force flag
  if (animations.isWobbling && !options.direction && !options.force) {
    return;
  }
  
  const { direction, seed = 0, updateStore = true } = options;
  
  // Get current state to check if we should be wobbling
  const state = get(ghostStateStore);
  
  // Force wobble state if not already in it and updateStore is enabled
  if (updateStore && state.current !== ANIMATION_STATES.WOBBLING) {
    ghostStateStore.setAnimationState(ANIMATION_STATES.WOBBLING);
  }
  
  // Clean up any existing wobble timeout
  if (timers.wobbleTimeoutId) {
    clearTimeout(timers.wobbleTimeoutId);
    timers.wobbleTimeoutId = null;
  }
  
  // Set wobbling flag - locally and in store if updateStore is enabled
  animations.isWobbling = true;
  if (updateStore) {
    ghostStateStore.setWobbling(true);
  }
  
  // Choose direction using seeded random if not provided
  let wobbleDir = direction;
  if (!wobbleDir) {
    const random = seedRandom(seed, 0, 0, 1);
    wobbleDir = random < WOBBLE_CONFIG.LEFT_CHANCE ? 
      CSS_CLASSES.WOBBLE_LEFT : 
      CSS_CLASSES.WOBBLE_RIGHT;
  }
  
  // Set the wobble direction in the store if updateStore is enabled
  if (updateStore) {
    ghostStateStore.setWobbleDirection(wobbleDir);
  }
  
  // Apply animation to the SVG element
  const svgElement = ghostSvg.querySelector('svg');
  if (svgElement) {
    // Force reflow and apply wobble class
    forceReflow(svgElement);
    
    // Remove existing wobble classes first
    svgElement.classList.remove(CSS_CLASSES.WOBBLE_LEFT);
    svgElement.classList.remove(CSS_CLASSES.WOBBLE_RIGHT);
    
    // Force reflow again to ensure animation restarts
    forceReflow(svgElement);
    
    // Add the new wobble class
    svgElement.classList.add(wobbleDir);
    
    // Log for debugging
    if (get(ghostStateStore).debug) {
      console.log(`Applied wobble class: ${wobbleDir} to SVG element`);
    }
  }
  
  // Schedule cleanup
  timers.wobbleTimeoutId = setTimeout(() => {
    animations.isWobbling = false;
    
    // Only update the store if updateStore is enabled
    if (updateStore) {
      ghostStateStore.setWobbling(false);
      ghostStateStore.setWobbleDirection(null);
      
      // Transition to idle state
      ghostStateStore.setAnimationState(ANIMATION_STATES.IDLE);
    }
    
    // Clean up classes
    if (svgElement) {
      // Remove wobble classes
      svgElement.classList.remove(CSS_CLASSES.WOBBLE_LEFT);
      svgElement.classList.remove(CSS_CLASSES.WOBBLE_RIGHT);
    }
  }, WOBBLE_CONFIG.DURATION);
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
    if (state.isRecording || 
        state.isProcessing ||
        animations.doingSpecialAnimation ||
        state.eyesClosed) {
      scheduleNextCheck();
      return;
    }
    
    // Random chance for special animation
    const random = seedRandom(seed, Date.now(), 0, 1);
    if (random < SPECIAL_CONFIG.CHANCE) {
      performSpecialAnimation(ghostSvg);
    }
    
    scheduleNextCheck();
  }
  
  function scheduleNextCheck() {
    // Schedule next check with slight variation
    const checkInterval = SPECIAL_CONFIG.CHECK_INTERVAL + 
      seedRandom(seed, Date.now(), -5000, 5000);
      
    timers.specialAnimationTimeoutId = setTimeout(
      checkForSpecialAnimation,
      checkInterval
    );
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
 * Perform a special animation (like spinning - easter egg)
 * 
 * @param {HTMLElement} ghostSvg - Ghost SVG container
 */
export function performSpecialAnimation(ghostSvg) {
  if (!ghostSvg || animations.doingSpecialAnimation) return;
  
  animations.doingSpecialAnimation = true;
  ghostStateStore.setSpecialAnimation(true);
  
  // Apply spin class
  ghostSvg.classList.add(CSS_CLASSES.SPIN);
  
  // Clean up after animation
  setTimeout(() => {
    ghostSvg.classList.remove(CSS_CLASSES.SPIN);
    animations.doingSpecialAnimation = false;
    ghostStateStore.setSpecialAnimation(false);
  }, SPECIAL_CONFIG.DURATION);
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
  applyInitialLoadEffect,
  applyWobbleEffect,
  applyPulseEffect,
  performSpecialAnimation,
  startSpecialAnimationWatch,
  stopSpecialAnimationWatch
};