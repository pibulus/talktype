/**
 * Ghost Animation Stores
 * 
 * Central export point for all ghost animation stores
 */

// Export the main state store instance
export { ghostStateStore } from './ghostStateStore.js';

// Export the main theme store instance and related functions/values
export {
  theme,
  cssVariables,
  setTheme,
  getThemeColor,
  themeColors
} from '../themeStore.js';

// Removed exports of individual derived stores (e.g., currentState, isRecording)
// Consumers should import ghostStateStore and derive if needed, or use $ghostStateStore.property syntax.
