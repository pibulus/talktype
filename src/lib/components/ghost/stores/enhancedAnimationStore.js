/**
 * Enhanced Ghost Animation Store
 * 
 * A centralized store for ghost animation state with integrated DOM effects
 * and animation coordination.
 */
import { derived, get } from 'svelte/store';
import { animationStateStore } from './storeInstances';
import { animationCoordinator } from './animationCoordinator';

/**
 * Create the enhanced animation store with tight DOM integration
 */
const createEnhancedAnimationStore = () => {
  // Use shared store instance to avoid circular dependencies
  const { subscribe, set, update } = animationStateStore;
  
  return {
    subscribe,
    set,
    update,
    
    // Initialize with DOM elements
    initialize(elements) {
      console.log('Initializing enhanced animation store with elements');
      animationCoordinator.initialize(elements);
      
      return this;
    },
    
    // Cleanup animations
    cleanup() {
      console.log('Cleaning up enhanced animation store');
      animationCoordinator.cleanup();
    },
    
    // Sync all states to DOM
    syncAllStates() {
      console.log('Syncing all animation states to DOM');
      animationCoordinator.syncAllStates();
    },
    
    // Handle mouse movement for eye tracking
    handleMouseMove(event) {
      animationCoordinator.handleMouseMove(event);
    },
    
    // Core state setters
    setRecording(isRecording) {
      update(state => {
        return { ...state, isRecording };
      });
      animationCoordinator.syncRecordingState(isRecording);
    },
    
    setProcessing(isProcessing) {
      update(state => {
        return { ...state, isProcessing };
      });
      
      if (isProcessing) {
        animationCoordinator.startThinking();
      } else {
        animationCoordinator.stopThinking();
      }
    },
    
    setAnimationState(animationState) {
      update(state => {
        return { ...state, animationState };
      });
      
      if (animationState === 'wobble-start') {
        animationCoordinator.forceWobble({ direction: 'wobble-left', isRecordingStart: true });
      } else if (animationState === 'wobble-stop') {
        animationCoordinator.forceWobble('wobble-right');
      }
    },
    
    // Eye animation actions
    setEyesClosed(closed) {
      update(state => {
        return {
          ...state,
          eyes: { ...state.eyes, closed }
        };
      });
    },
    
    setEyePosition(x, y) {
      update(state => {
        return {
          ...state,
          eyes: {
            ...state.eyes,
            position: { x, y }
          }
        };
      });
    },
    
    setBlinking(blinking) {
      update(state => {
        return {
          ...state,
          eyes: { ...state.eyes, blinking }
        };
      });
    },
    
    setThinking(thinking) {
      update(state => {
        return {
          ...state,
          eyes: { ...state.eyes, thinking }
        };
      });
    },
    
    setEyeTracking(tracking) {
      update(state => {
        return {
          ...state,
          eyes: { ...state.eyes, tracking }
        };
      });
    },
    
    // Body animation actions
    setWobbling(wobbling) {
      update(state => {
        return {
          ...state,
          body: { ...state.body, wobbling }
        };
      });
    },
    
    setPulsing(pulsing) {
      update(state => {
        return {
          ...state,
          body: { ...state.body, pulsing }
        };
      });
    },
    
    setSpinning(spinning) {
      update(state => {
        return {
          ...state,
          body: { ...state.body, spinning }
        };
      });
    },
    
    // Theme actions
    setTheme(theme) {
      update(state => {
        return {
          ...state,
          theme: { ...state.theme, current: theme }
        };
      });
      
      animationCoordinator.syncTheme(theme);
    },
    
    // Debug mode
    setDebugMode(enabled) {
      update(state => ({
        ...state,
        debug: enabled
      }));
    },
    
    // High-level animation actions
    startWobbleAnimation() {
      this.setAnimationState('wobble-start');
      
      // Schedule return to idle
      setTimeout(() => {
        this.setAnimationState('idle');
      }, 700);
    },
    
    stopWobbleAnimation() {
      this.setAnimationState('wobble-stop');
      
      // Schedule return to idle
      setTimeout(() => {
        this.setAnimationState('idle');
      }, 700);
    },
    
    // Forward actions to coordinator
    pulse() {
      animationCoordinator.pulse();
    },
    
    startThinking() {
      animationCoordinator.startThinking();
    },
    
    stopThinking() {
      animationCoordinator.stopThinking();
    },
    
    performSequentialBlinks(count, interval, onComplete) {
      animationCoordinator.performSequentialBlinks(count, interval, onComplete);
    },
    
    reactToTranscript(textLength) {
      animationCoordinator.reactToTranscript(textLength);
    },
    
    scheduleBlink() {
      animationCoordinator.scheduleNextAmbientBlink();
    },
    
    forceWobble(options) {
      animationCoordinator.forceWobble(options);
    }
  };
};

// Create and export the enhanced store
export const enhancedAnimationStore = createEnhancedAnimationStore();

// Derived stores for easier component consumption
export const isRecording = derived(
  enhancedAnimationStore,
  $state => $state.isRecording
);

export const isProcessing = derived(
  enhancedAnimationStore,
  $state => $state.isProcessing
);

export const animationState = derived(
  enhancedAnimationStore,
  $state => $state.animationState
);

export const eyesState = derived(
  enhancedAnimationStore,
  $state => $state.eyes
);

export const bodyState = derived(
  enhancedAnimationStore,
  $state => $state.body
);

export const themeState = derived(
  enhancedAnimationStore,
  $state => $state.theme
);

export const debugMode = derived(
  enhancedAnimationStore,
  $state => $state.debug
);