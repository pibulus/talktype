import { writable, derived } from 'svelte/store';

/**
 * Ghost Animation Store
 * 
 * Centralizes all ghost animation state management to ensure consistent
 * animations and prevent conflicts between different components.
 */

// Base animation state store
const createAnimationStore = () => {
  // Core animation state
  const { subscribe, set, update } = writable({
    // Core animation states
    isRecording: false,
    isProcessing: false,
    animationState: 'idle',  // 'idle', 'wobble-start', 'wobble-stop'
    
    // Eye animation states
    eyes: {
      blinking: false,
      thinking: false,
      tracking: true,
      closed: false,
      position: { x: 0, y: 0 }
    },
    
    // Body animation states
    body: {
      wobbling: false,
      pulsing: false,
      spinning: false
    },
    
    // Current theme
    theme: {
      current: 'peach'
    },
    
    // Animation timeouts
    timeouts: {
      blink: null,
      wobble: null,
      special: null,
      animation: null
    }
  });

  // Store actions
  const actions = {
    // Core state setters
    setRecording: (isRecording) => update(state => ({ ...state, isRecording })),
    setProcessing: (isProcessing) => update(state => ({ ...state, isProcessing })),
    setAnimationState: (animationState) => update(state => ({ ...state, animationState })),
    
    // Eye animation actions
    setEyesClosed: (closed) => update(state => ({
      ...state,
      eyes: { ...state.eyes, closed }
    })),
    
    setEyePosition: (x, y) => update(state => ({
      ...state,
      eyes: { ...state.eyes, position: { x, y } }
    })),
    
    setBlinking: (blinking) => update(state => ({
      ...state,
      eyes: { ...state.eyes, blinking }
    })),
    
    setThinking: (thinking) => update(state => ({
      ...state,
      eyes: { ...state.eyes, thinking }
    })),
    
    setEyeTracking: (tracking) => update(state => ({
      ...state,
      eyes: { ...state.eyes, tracking }
    })),
    
    // Body animation actions
    setWobbling: (wobbling) => update(state => ({
      ...state,
      body: { ...state.body, wobbling }
    })),
    
    setPulsing: (pulsing) => update(state => ({
      ...state,
      body: { ...state.body, pulsing }
    })),
    
    setSpinning: (spinning) => update(state => ({
      ...state,
      body: { ...state.body, spinning }
    })),
    
    // Theme actions
    setTheme: (theme) => update(state => ({
      ...state,
      theme: { ...state.theme, current: theme }
    })),
    
    // Timeout management
    setTimeouts: (name, id) => update(state => {
      const timeouts = { ...state.timeouts };
      timeouts[name] = id;
      return { ...state, timeouts };
    }),
    
    clearTimeout: (name) => update(state => {
      const timeouts = { ...state.timeouts };
      if (timeouts[name]) {
        clearTimeout(timeouts[name]);
        timeouts[name] = null;
      }
      return { ...state, timeouts };
    }),
    
    clearAllTimeouts: () => update(state => {
      const timeouts = { ...state.timeouts };
      Object.keys(timeouts).forEach(key => {
        if (timeouts[key]) {
          clearTimeout(timeouts[key]);
          timeouts[key] = null;
        }
      });
      return { ...state, timeouts };
    }),
    
    // High-level animation actions
    startWobbleAnimation: () => update(state => {
      const newState = { ...state, animationState: 'wobble-start' };
      // Clear existing wobble timeout if any
      if (state.timeouts.wobble) {
        clearTimeout(state.timeouts.wobble);
      }
      // Set timeout to return to idle
      const wobbleTimeout = setTimeout(() => {
        actions.setAnimationState('idle');
      }, 700);
      // Update timeout in state
      newState.timeouts = { ...state.timeouts, wobble: wobbleTimeout };
      return newState;
    }),
    
    stopWobbleAnimation: () => update(state => {
      const newState = { ...state, animationState: 'wobble-stop' };
      // Clear existing wobble timeout if any
      if (state.timeouts.wobble) {
        clearTimeout(state.timeouts.wobble);
      }
      // Set timeout to return to idle
      const wobbleTimeout = setTimeout(() => {
        actions.setAnimationState('idle');
      }, 700);
      // Update timeout in state
      newState.timeouts = { ...state.timeouts, wobble: wobbleTimeout };
      return newState;
    }),
    
    startThinking: () => {
      actions.setThinking(true);
      actions.clearTimeout('blink');
    },
    
    stopThinking: () => {
      actions.setThinking(false);
      // Resume ambient blinking after a delay
      const blinkTimeout = setTimeout(() => {
        actions.scheduleBlink();
      }, 500);
      actions.setTimeouts('blink', blinkTimeout);
    },
    
    scheduleBlink: () => update(state => {
      // Don't schedule blinks during recording or processing
      if (state.isRecording || state.isProcessing) return state;
      
      // Clear any existing blink timeout
      if (state.timeouts.blink) {
        clearTimeout(state.timeouts.blink);
      }
      
      // Random delay between 4-8 seconds
      const delay = 4000 + Math.random() * 4000;
      
      // Schedule next blink
      const blinkTimeout = setTimeout(() => {
        const random = Math.random();
        
        if (random < 0.25) {
          // Double blink (25% chance)
          actions.performSequentialBlinks(2, 180);
        } else {
          // Single blink (75% chance)
          actions.performSequentialBlinks(1, 150);
        }
      }, delay);
      
      return {
        ...state,
        timeouts: { ...state.timeouts, blink: blinkTimeout }
      };
    }),
    
    performSequentialBlinks: (count, interval) => {
      let currentBlink = 0;
      
      function doBlink() {
        // Close eyes
        actions.setEyesClosed(true);
        
        setTimeout(() => {
          // Open eyes
          actions.setEyesClosed(false);
          
          currentBlink++;
          if (currentBlink < count) {
            setTimeout(doBlink, interval * 0.5);
          } else {
            // Schedule next ambient blink
            actions.scheduleBlink();
          }
        }, interval);
      }
      
      doBlink();
    },
    
    reactToTranscript: (textLength = 0) => {
      actions.clearTimeout('blink');
      
      if (textLength === 0) {
        actions.scheduleBlink();
        return;
      }
      
      const reactionDelay = 500;
      
      setTimeout(() => {
        if (textLength > 20) {
          // For longer transcripts, do a satisfied double blink
          actions.performSequentialBlinks(2, 200);
        } else {
          // For short transcripts, just a single blink
          actions.performSequentialBlinks(1, 300);
        }
      }, reactionDelay);
    },
    
    forceWobble: (options = {}) => update(state => {
      const opts = typeof options === 'string' ? { direction: options } : options;
      const { direction = '' } = opts;
      
      // Clear existing wobble timeout
      if (state.timeouts.wobble) {
        clearTimeout(state.timeouts.wobble);
      }
      
      // Set body wobbling state
      const newState = {
        ...state,
        body: { ...state.body, wobbling: true }
      };
      
      // Schedule end of wobble
      const wobbleTimeout = setTimeout(() => {
        actions.setWobbling(false);
      }, 600);
      
      newState.timeouts = {
        ...state.timeouts,
        wobble: wobbleTimeout
      };
      
      return newState;
    }),
    
    pulse: () => update(state => {
      // Set pulsing state
      const newState = {
        ...state,
        body: { ...state.body, pulsing: true }
      };
      
      // Schedule end of pulse
      const pulseTimeout = setTimeout(() => {
        actions.setPulsing(false);
      }, 600);
      
      newState.timeouts = {
        ...state.timeouts,
        animation: pulseTimeout
      };
      
      return newState;
    }),
    
    // Reset all animation states
    reset: () => {
      actions.clearAllTimeouts();
      set({
        isRecording: false,
        isProcessing: false,
        animationState: 'idle',
        eyes: {
          blinking: false,
          thinking: false,
          tracking: true,
          closed: false,
          position: { x: 0, y: 0 }
        },
        body: {
          wobbling: false,
          pulsing: false,
          spinning: false
        },
        theme: {
          current: 'peach'
        },
        timeouts: {
          blink: null,
          wobble: null,
          special: null,
          animation: null
        }
      });
    }
  };

  return {
    subscribe,
    set,
    update,
    ...actions
  };
};

// Create and export the store
export const ghostAnimationStore = createAnimationStore();

// Derived stores for easier component consumption
export const isGhostRecording = derived(
  ghostAnimationStore,
  $state => $state.isRecording
);

export const isGhostProcessing = derived(
  ghostAnimationStore,
  $state => $state.isProcessing
);

export const ghostAnimationState = derived(
  ghostAnimationStore,
  $state => $state.animationState
);

export const eyesState = derived(
  ghostAnimationStore,
  $state => $state.eyes
);

export const bodyState = derived(
  ghostAnimationStore,
  $state => $state.body
);

export const themeState = derived(
  ghostAnimationStore,
  $state => $state.theme
);