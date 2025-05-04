/**
 * Ghost Animation Stores
 * 
 * Central export point for all ghost animation stores
 */

// Re-export all stores and derived values
export {
  ghostStateStore,
  currentState,
  previousState,
  isRecording,
  isProcessing,
  eyePosition,
  eyesClosed,
  isEyeTrackingEnabled,
  isFirstVisit,
  ghostProps
} from './ghostStateStore.js';

// Re-export theme store
export {
  theme,
  cssVariables,
  setTheme,
  getThemeColor,
  themeColors
} from '../themeStore.js';