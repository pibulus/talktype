// Ghost Character Animation System
// Modular character system that can be adapted to different SVG shapes
// Core concept: Eyes + animations + behaviors = reusable character engine

import Ghost from './Ghost.svelte';
import DisplayGhost from './DisplayGhost.svelte';
import { ghostStateStore, theme, cssVariables } from './stores';
import { animationService, blinkService } from './services';
import { createEyeTracking } from './eyeTracking';

// Main exports for TalkType
export { Ghost, DisplayGhost };

// Character Animation Engine - For future apps
export const CharacterSystem = {
	// State management
	stateStore: ghostStateStore,
	themeStore: theme,
	cssVariables,

	// Animation services
	animationService,
	blinkService,

	// Eye tracking system
	createEyeTracking

	// How to use in other apps:
	// 1. Replace ghost-paths.svg with your shape (fruit, cloud, etc.)
	// 2. Keep eye positions in your SVG
	// 3. All animations/behaviors work with any shape
};

// Default export
export default Ghost;
