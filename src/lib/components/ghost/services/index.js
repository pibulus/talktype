/**
 * Ghost Animation Services
 * 
 * Central export point for all ghost animation services
 */

// Re-export animation services
export { default as animationService } from './animationService.js';
export { default as blinkService } from './blinkService.js';

// Re-export individual functions for convenience
export {
  initAnimations,
  initThemeAnimation,
  applyInitialLoadEffect,
  applyWobbleEffect,
  applyPulseEffect,
  performSpecialAnimation
} from './animationService.js';

export {
  initBlinking,
  applyEyeTransforms,
  performSingleBlink,
  performDoubleBlink,
  reactToTranscript
} from './blinkService.js';