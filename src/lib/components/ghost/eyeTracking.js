// Eye tracking service for ghost component
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { ghostStateStore } from './stores/ghostStateStore.js'; // Path to the central store

// Default configuration
const defaultConfig = {
  eyeSensitivity: 0.2,  // Smoothing factor (0-1)
  maxDistanceX: 3,      // Maximum X distance divisor (screen width / this value)
  maxDistanceY: 3,      // Maximum Y distance divisor (screen height / this value)
  maxXMovement: 20,     // Maximum X movement in pixels
  maxYMovement: 10,     // Maximum Y movement in pixels
  enabled: true,        // Enable eye tracking by default
  debug: false          // Debug mode
};

/**
 * Create an eye tracking instance
 * @param {Object} customConfig - Optional configuration overrides
 * @returns {Object} Eye tracking service instance
 */
export function createEyeTracking(customConfig = {}) {
  // Merge default config with custom config
  const config = { ...defaultConfig, ...customConfig };
  
  // State
  let state = {
    isActive: false,
    eyePositionX: 0,
    eyePositionY: 0,
    eyesClosed: false, // This will now reflect the store's state for internal logic if needed
    tracked: null,
    // eyesElement: null, // No longer needed for direct DOM manipulation by this service
    cleanupHandler: null
  };

  /**
   * Debug logger
   * @param {string} message - Debug message
   */
  function log(message) {
    if (config.debug) {
      console.log(`[EyeTracking] ${message}`);
    }
  }

  /**
   * Initialize eye tracking for a ghost element
   * @param {HTMLElement} ghostElement - SVG ghost element (used for position reference)
   */
  function initialize(ghostElement) {
    log(`Initializing eye tracking: ghost=${!!ghostElement}, browser=${!!browser}, enabled=${config.enabled}`);
    
    if (!browser || !ghostElement || !config.enabled) {
      if (!browser) log('Browser environment not available');
      if (!ghostElement) log('Ghost element is missing');
      if (!config.enabled) log('Eye tracking is disabled');
      return;
    }
    
    // Store reference to tracked element
    state.tracked = ghostElement;
    // state.eyesElement = eyesElement; // Removed
    
    log('Tracked element stored, starting tracking');
    
    // Start tracking if not already active
    if (!state.isActive) {
      start();
    }
  }

  /**
   * Start eye tracking
   */
  function start() {
    if (!browser || state.isActive || !config.enabled) {
      log(`Cannot start eye tracking: browser=${!!browser}, active=${state.isActive}, enabled=${config.enabled}`);
      return;
    }
    
    log('Starting eye tracking');
    
    // Add event listener for mouse movement
    const handleMouseMove = event => {
      const storeState = get(ghostStateStore);
      // Check eyesClosed and isEyeTrackingEnabled from the central store
      if (storeState.eyesClosed || !state.tracked || !storeState.isEyeTrackingEnabled) {
        return;
      }
      
      // Calculate ghost position and size
      const ghostRect = state.tracked.getBoundingClientRect();
      const ghostCenterX = ghostRect.left + ghostRect.width / 2;
      const ghostCenterY = ghostRect.top + ghostRect.height / 2;
      
      // Calculate distance from mouse to ghost center
      const distanceX = event.clientX - ghostCenterX;
      const distanceY = event.clientY - ghostCenterY;
      
      // Calculate normalized position (-1 to 1)
      const maxDistanceX = window.innerWidth / config.maxDistanceX;
      const maxDistanceY = window.innerHeight / config.maxDistanceY;
      const targetNormalizedX = Math.max(-1, Math.min(1, distanceX / maxDistanceX));
      const targetNormalizedY = Math.max(-1, Math.min(1, distanceY / maxDistanceY));
      
      // Apply smoothing for more natural movement to internal state
      state.eyePositionX = state.eyePositionX + (targetNormalizedX - state.eyePositionX) * config.eyeSensitivity;
      state.eyePositionY = state.eyePositionY + (targetNormalizedY - state.eyePositionY) * config.eyeSensitivity;
      
      // Update the central store with the smoothed, normalized positions
      ghostStateStore.setEyePosition(state.eyePositionX, state.eyePositionY);

      if (config.debug && Math.random() < 0.01) { // Log only occasionally to prevent spamming
        log(`Store eyePosition updated: X=${state.eyePositionX.toFixed(2)}, Y=${state.eyePositionY.toFixed(2)}`);
      }
    };
    
    // Add event listener
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    log('Mouse move event listener added');
    
    // Store cleanup function
    state.cleanupHandler = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      log('Mouse move event listener removed');
    };
    
    state.isActive = true;
  }

  /**
   * Stop eye tracking
   */
  function stop() {
    if (!state.isActive) return;
    
    log('Stopping eye tracking');
    
    // Clean up event listener
    if (state.cleanupHandler) {
      state.cleanupHandler();
      state.cleanupHandler = null;
    }
    
    state.isActive = false;
  }

  /**
   * Clean up resources
   */
  function cleanup() {
    log('Cleaning up eye tracking');
    stop();
    state.tracked = null;
    // state.eyesElement = null; // Removed
  }

  /**
   * Update eye state for blinking by calling the store
   * @param {boolean} closed - Whether eyes are closed
   */
  function setEyesClosed(closed) {
    log(`Setting eyes closed via store: ${closed}`);
    // Update internal state for consistency if needed, but primary action is store update
    state.eyesClosed = closed; 
    ghostStateStore.setEyesClosed(closed);
    // updateEyePosition(); // Removed, blinkService handles DOM updates via store subscription
  }

  // updateEyePosition() function is removed as DOM manipulation is now handled by blinkService

  /**
   * Reset eye position to center by updating the store
   */
  function resetPosition() {
    log('Resetting eye position to center via store');
    state.eyePositionX = 0;
    state.eyePositionY = 0;
    ghostStateStore.setEyePosition(0, 0);
    // updateEyePosition(); // Removed
  }

  // Public API
  return {
    initialize,
    start,
    stop,
    cleanup,
    setEyesClosed,
    resetPosition,
    updateConfig: newConfig => {
      Object.assign(config, newConfig);
      log(`Config updated: ${JSON.stringify(config)}`);
    },
    getState: () => ({ ...state }),
    enableDebug: () => {
      config.debug = true;
      log('Debug mode enabled');
    }
  };
}

// Default export for convenience
export default createEyeTracking();
