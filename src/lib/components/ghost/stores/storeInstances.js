/**
 * Store Instances - Centralized store creation to prevent circular dependencies
 */
import { writable } from 'svelte/store';

// Base animation state store - shared single instance
export const animationStateStore = writable({
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
    position: { x: 0, y: 0 },
    config: {
      sensitivity: 0.2,  // How quickly eyes move to new position
      maxXMovement: 20,  // Maximum X movement in pixels
      maxYMovement: 10   // Maximum Y movement in pixels
    }
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
  
  // Debug mode
  debug: false
});