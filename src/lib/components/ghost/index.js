import Ghost from './Ghost.svelte';
import { createEyeTracking } from './eyeTracking';
import { AnimationDebugger } from './debug';
import {
	ghostStateStore, // Use the main state store
	theme // Use the theme store directly
} from './stores'; // Adjusted import path if needed

// Export the main component and services
export { Ghost, createEyeTracking, AnimationDebugger };

// Export the animation system (using direct store access)
export const GhostSystem = {
	// Core stores
	stateStore: ghostStateStore,
	themeStore: theme, // Assuming theme is exported from stores/index.js

	// Debug component
	Debugger: AnimationDebugger
	// Consumers can derive specific states like isRecording: derived(ghostStateStore, $s => $s.isRecording)
};

// Default export remains the Ghost component
export default Ghost;
