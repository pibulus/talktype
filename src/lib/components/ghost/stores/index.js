/**
 * Ghost Animation Stores
 * 
 * Central export point for all ghost animation stores
 */

// Export the main state store instance (which now includes derived stores)
export { ghostStateStore } from './ghostStateStore.js';

// Export the main theme store instance and related functions/values
export {
  theme,
  cssVariables,
  setTheme,
  getThemeColor,
  themeColors
} from '../themeStore.js';

// Consumers can access derived stores via ghostStateStore.currentState, ghostStateStore.isRecording etc.
// or use $ghostStateStore.current, $ghostStateStore.isRecording etc.
