import Ghost from './Ghost.svelte';
import { createEyeTracking } from './eyeTracking';
import { AnimationDebugger } from './debug';
import { 
  ghostAnimationStore, 
  isGhostRecording, 
  isGhostProcessing, 
  ghostAnimationState,
  eyesState,
  bodyState,
  themeState
} from './stores';

// Export the main component and services
export { 
  Ghost,
  createEyeTracking,
  AnimationDebugger
};

// Export the animation system
export const GhostAnimations = {
  // Core store
  store: ghostAnimationStore,
  
  // Derived stores
  isRecording: isGhostRecording,
  isProcessing: isGhostProcessing,
  animationState: ghostAnimationState,
  eyesState,
  bodyState,
  themeState,
  
  // Debug component
  Debugger: AnimationDebugger
};

// Default export remains the Ghost component
export default Ghost;