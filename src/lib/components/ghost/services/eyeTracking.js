// Eye tracking service for ghost component
import { browser } from '$app/environment';

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
    eyesClosed: false,
    tracked: null,
    eyesElement: null,
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
   * @param {HTMLElement} ghostElement - SVG ghost element
   * @param {HTMLElement} eyesElement - Eyes element to animate
   */
  function initialize(ghostElement, eyesElement) {
    log(`Initializing eye tracking: ghost=${!!ghostElement}, eyes=${!!eyesElement}, browser=${!!browser}, enabled=${config.enabled}`);
    
    if (!browser || !ghostElement || !eyesElement || !config.enabled) {
      if (!browser) log('Browser environment not available');
      if (!ghostElement) log('Ghost element is missing');
      if (!eyesElement) log('Eyes element is missing');
      if (!config.enabled) log('Eye tracking is disabled');
      return;
    }
    
    // Store reference to elements
    state.tracked = ghostElement;
    state.eyesElement = eyesElement;
    
    log('Elements stored, starting tracking');
    
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
      if (state.eyesClosed || !state.tracked || !state.eyesElement) {
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
      const normalizedX = Math.max(-1, Math.min(1, distanceX / maxDistanceX));
      const normalizedY = Math.max(-1, Math.min(1, distanceY / maxDistanceY));
      
      // Apply smoothing for more natural movement
      state.eyePositionX = state.eyePositionX + (normalizedX - state.eyePositionX) * config.eyeSensitivity;
      state.eyePositionY = state.eyePositionY + (normalizedY - state.eyePositionY) * config.eyeSensitivity;
      
      // Apply transformation to eyes
      updateEyePosition();
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
    state.eyesElement = null;
  }

  /**
   * Update eye state for blinking
   * @param {boolean} closed - Whether eyes are closed
   */
  function setEyesClosed(closed) {
    log(`Setting eyes closed: ${closed}`);
    state.eyesClosed = closed;
    updateEyePosition();
  }

  /**
   * Update eye position based on current state
   */
  function updateEyePosition() {
    if (!state.eyesElement) {
      log('Cannot update eye position: eyes element is missing');
      return;
    }
    
    if (state.eyesClosed) {
      // Apply closed eyes transform
      state.eyesElement.style.transform = 'scaleY(0.05)';
      log('Eyes closed: applied scaleY(0.05)');
    } else {
      // Apply position transform
      const xMovement = state.eyePositionX * config.maxXMovement;
      const yMovement = state.eyePositionY * config.maxYMovement;
      state.eyesElement.style.transform = `translate(${xMovement}px, ${yMovement}px)`;
      
      if (config.debug && Math.random() < 0.01) { // Log only occasionally to prevent spamming
        log(`Eyes position: translate(${xMovement.toFixed(2)}px, ${yMovement.toFixed(2)}px)`);
      }
    }
  }

  /**
   * Reset eye position to center
   */
  function resetPosition() {
    log('Resetting eye position to center');
    state.eyePositionX = 0;
    state.eyePositionY = 0;
    updateEyePosition();
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