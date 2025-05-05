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
    
    // Transition directly to IDLE state
    ghostStateStore.setAnimationState(ANIMATION_STATES.IDLE);
    
    // Apply wobble effect flags directly after a small delay
    setTimeout(() => {
      // Check if still IDLE before applying wobble (might have changed state)
      if (get(ghostStateStore).current === ANIMATION_STATES.IDLE) {
        // Use the store's internal method to apply wobble flags
        ghostStateStore.setWobbling(true); // This now calls applyWobbleEffectFlags internally
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
 * @param {string} options.direction - Force wobble direction ('left' or 'right')
 * @param {number} options.seed - Random seed for wobble direction
 * @param {boolean} options.force - Force reapplying even if already wobbling
 */
export function applyWobbleEffect(ghostSvg, options = {}) {
  if (!ghostSvg) return;
  
  // Allow reapplying wobble if we have a new direction or force flag
  if (animations.isWobbling && !options.direction && !options.force) {
    return;
  }
  
  const { direction, seed = 0 } = options; // Removed updateStore
  
  // Determine direction
  const wobbleDir = direction || (seedRandom(seed, 0, 0, 1) < WOBBLE_CONFIG.LEFT_CHANCE ? 
                                  CSS_CLASSES.WOBBLE_LEFT : 
                                  CSS_CLASSES.WOBBLE_RIGHT);

  // Always use the store's method to handle flags and timeouts
  ghostStateStore.setWobbling(true, wobbleDir); 

  // Apply animation class directly to the SVG element for immediate visual feedback
  // Note: This might be redundant if reactivity is fast enough, but ensures visual feedback
  // (Store reactivity will also handle this, but direct application ensures it happens)
  const svgElement = ghostSvg.querySelector('svg');
  if (svgElement) {
    // Force reflow and apply wobble class
    forceReflow(svgElement);
    
    // Remove existing wobble classes first
    svgElement.classList.remove(CSS_CLASSES.WOBBLE_LEFT);
    svgElement.classList.remove(CSS_CLASSES.WOBBLE_RIGHT);
    
    // Force reflow again to ensure animation restarts
    forceReflow(svgElement);
    
    // Log for debugging
    // Note: Class application is now handled reactively in Ghost.svelte
    if (get(ghostStateStore).debug) {
      console.log(`Applied wobble class: ${wobbleDir} to SVG element`);
    }
  }
  
  // Removed timeout logic here - now handled by the store or local timer if updateStore=false
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
