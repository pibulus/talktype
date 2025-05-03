import { 
  enhancedAnimationStore,
  isRecording,
  isProcessing,
  animationState,
  eyesState,
  bodyState,
  themeState,
  debugMode
} from './enhancedAnimationStore';

// Re-export previous store for backwards compatibility
import { ghostAnimationStore as legacyStore } from './ghostAnimationStore';

// Export enhanced animation system
export {
  enhancedAnimationStore as ghostAnimationStore,
  isRecording as isGhostRecording,
  isProcessing as isGhostProcessing,
  animationState as ghostAnimationState,
  eyesState,
  bodyState,
  themeState,
  debugMode
};

// Export for backward compatibility
export { legacyStore as __legacyAnimationStore };