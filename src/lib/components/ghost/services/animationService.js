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

// Flag to ensure initial load effect runs only once
let initialLoadEffectApplied = false;

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
  // --- Prevent multiple executions ---
  if (initialLoadEffectApplied || !isBrowser()) {
    if (initialLoadEffectApplied) console.log('[applyInitialLoadEffect] Skipping, already applied.');
    return; 
  }
  // --- Mark as applied ---
  initialLoadEffectApplied = true; 
  
  console.log('[applyInitialLoadEffect] Applying combined grow-and-wobble effect...');

  const state = get(ghostStateStore);
  
  // Skip if not first visit
  if (!state.isFirstVisit) {
    console.log('[applyInitialLoadEffect] Skipping, not first visit.');
    return;
  }
  
  // Find the wobble group element within the provided ghostSvg container
  const wobbleGroup = ghostSvg?.querySelector('.ghost-wobble-group');
  
  if (!wobbleGroup) {
    console.error('[applyInitialLoadEffect] Could not find .ghost-wobble-group element.');
    return;
  }

  // --- Delay adding the class until the next frame ---
  requestAnimationFrame(() => {
    // Double-check the element still exists in case of rapid unmount
    if (!document.body.contains(wobbleGroup)) {
      console.warn('[applyInitialLoadEffect] Wobble group removed before animation could start.');
      return;
    }
    
    // Apply the combined animation class directly to the wobble group
    wobbleGroup.classList.add('initial-load-effect');
    console.log('[applyInitialLoadEffect] Added .initial-load-effect class to wobble group (after RAF).');

    // Set a single timeout to clean up after the combined animation finishes
    const cleanupDelay = ANIMATION_TIMING.INITIAL_LOAD_DURATION; 
  console.log(`[applyInitialLoadEffect] Scheduling cleanup timeout for ${cleanupDelay}ms`);
  
  setTimeout(() => {
    console.log('[applyInitialLoadEffect] Cleanup timeout executed.');
    // Remove the animation class
    wobbleGroup.classList.remove('initial-load-effect');
    
    // Explicitly reset transform/opacity left by "forwards" fill mode
    wobbleGroup.style.transform = ''; 
    wobbleGroup.style.opacity = ''; 
    
    // Mark first visit as complete in the store
    ghostStateStore.completeFirstVisit();
    
    // Ensure final state is IDLE (unless something else changed it)
    if (get(ghostStateStore).current === ANIMATION_STATES.INITIAL || get(ghostStateStore).current === ANIMATION_STATES.IDLE) {
       ghostStateStore.setAnimationState(ANIMATION_STATES.IDLE);
       console.log('[applyInitialLoadEffect] Set final state to IDLE.');
    } else {
       console.log('[applyInitialLoadEffect] State changed during initial load, not setting to IDLE.');
    }
  }, cleanupDelay); 
  
  }); // End of requestAnimationFrame callback
}

// --- Removed applyWobbleEffect function ---

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
  // applyWobbleEffect, // Removed
  applyPulseEffect,
  performSpecialAnimation,
  startSpecialAnimationWatch,
  stopSpecialAnimationWatch
};
