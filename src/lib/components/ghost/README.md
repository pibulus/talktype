# Character Animation System Documentation

## Overview

The Ghost component is actually a **modular character animation engine** that can work with any SVG shape. While it appears as a ghost in TalkType, the core system (eyes, animations, state management, behaviors) can be adapted to fruits, clouds, or any other shape for future apps.

> **Key Insight**: This is a reusable character framework, not just a ghost component!

## ✨ After Cleanup (Jan 2025)

**Removed:**

- `GhostSimple.svelte` (unused)
- `GhostSimplified.svelte` (unused)
- `unifiedGhostStore.js` (conflicting store)
- `ghostStore.js` (legacy store)
- `ghostService.js` (old service pattern)
- Duplicate static files

**Result**: 800+ lines of code removed, single source of truth established.

## 🏗 Current Architecture

## Component Architecture

The Ghost component system consists of several interconnected files:

```
/src/lib/components/ghost/
├── Ghost.svelte           # Main component implementation
├── ghost-animations-optimized.css   # Animation keyframes and behaviors
├── ghost-paths.svg        # SVG path definitions for the ghost shape
├── animationConfig.js     # Animation parameters and timing configuration
├── gradientAnimator.js    # JS animation logic for gradients
├── gradientConfig.js      # Gradient animation behavior configuration
├── stores/                # Svelte stores
│   ├── ghostStateStore.js # Core state machine logic
│   └── index.js           # Store exports
├── services/              # Business logic and effects
│   ├── animationService.js# Imperative animations
│   ├── blinkService.js    # Eye blinking logic
│   └── index.js           # Service exports
├── utils/                 # Shared helper functions
│   └── animationUtils.js
├── eyeTracking.js         # Eye movement and tracking service (Consider moving to services/)
└── themeStore.js          # Theme state management (Consider moving to stores/)
```

### SVG Structure

The Ghost SVG has a layered architecture:

```svelte
<svg class="ghost-svg theme-{currentTheme}">
	<defs>
		<!-- Gradient definitions -->
		<linearGradient id="peachGradient">...</linearGradient>
		<!-- Other theme gradients... -->
	</defs>

	<g class="ghost-layer ghost-bg">
		<!-- Background shape with gradient fill -->
		<use href="#ghost-background" class="ghost-shape" id="ghost-shape" />
	</g>

	<g class="ghost-layer ghost-outline">
		<!-- Black outline -->
		<use href="#ghost-body-path" class="ghost-outline-path" />
	</g>

	<g class="ghost-layer ghost-eyes">
		<!-- Eyes -->
		<use href="#ghost-eye-left-path" class="ghost-eye ghost-eye-left" />
		<use href="#ghost-eye-right-path" class="ghost-eye ghost-eye-right" />
		<g class="ghost-wobble-group">
			<!-- Inner group for wobble transform -->
			<g class="ghost-layer ghost-bg">
				<!-- Background shape with gradient fill -->
				<use href="#ghost-background" class="ghost-shape" id="ghost-shape" />
			</g>

			<g class="ghost-layer ghost-outline">
				<!-- Black outline -->
				<use href="#ghost-body-path" class="ghost-outline-path" />
			</g>

			<g class="ghost-layer ghost-eyes">
				<!-- Eyes -->
				<use href="#ghost-eye-left-path" class="ghost-eye ghost-eye-left" />
				<use href="#ghost-eye-right-path" class="ghost-eye ghost-eye-right" />
			</g>
		</g>
	</g></svg
>
```

## Animation System

The Ghost component has a sophisticated animation system with several categories of animations:

1. **Ambient animations**: Always-on subtle movements like floating and breathing
2. **State transition animations**: Triggered when changing between states (recording, processing)
3. **Theme animations**: Color and effect animations specific to each theme
4. **Interaction animations**: Responses to user interactions like hovering and clicking
5. **Gradient animations**: Dynamic color shifts within the gradient fills

### Animation Coordination

The animation system follows these principles:

- The Ghost.svelte component is the single source of truth for animation state
- Animations target SVG elements directly via ID selectors
- Timeouts are properly managed to prevent animation conflicts
- State transitions include forced browser reflow to ensure clean animation application

## Theme System

The component supports four themes, each with unique colors and animation behaviors:

1. **Peach**: Warm pink/orange gradient with subtle pulsing
2. **Mint**: Cool green/blue gradient with calm transitions
3. **Bubblegum**: Purple/pink gradient with energetic animations
4. **Rainbow**: Full-spectrum color cycling with enhanced effects

### Theme Store (Centralized State Management)

Themes are now managed using a centralized Svelte store in `themeStore.js`:

```javascript
// Main theme store and derived values
const theme = writable(getInitialTheme());
const cssVariables = derived(theme, ($theme) => {
	/* generates CSS vars */
});

// Helper functions
function setTheme(newTheme) {
	/* updates the theme */
}
function getThemeColor(themeName, position, bright = false) {
	/* gets specific colors */
}

export { theme, cssVariables, setTheme, getThemeColor, themeColors };
```

The theme store provides:

1. **Reactive theme state**: Components can subscribe to theme changes
2. **Automatic localStorage persistence**: Theme preferences are saved
3. **Derived CSS variables**: Auto-generated CSS variables based on the current theme
4. **Centralized color definitions**: Single source of truth for all theme colors
5. **Helper functions**: Utilities for theme manipulation

### Color Definitions

Theme colors are defined in the `themeStore.js` as structured JavaScript objects:

```javascript
const themeColors = {
	peach: {
		start: '#ff60e0',
		startBright: '#ff4aed',
		mid1: '#ff82ca'
		// ...more color definitions
	}
	// ...other themes
};
```

These variables are dynamically injected as CSS variables and referenced in animations and gradients, maintaining a reactive single source of truth for all colors.

## Gradient System

The ghost uses SVG linear gradients with animated color stops:

### Gradient Definition

```html
<linearGradient id="peachGradient" x1="0%" y1="0%" x2="100%" y2="100%">
	<stop offset="0%" stop-color="var(--ghost-peach-start)" />
	<stop offset="35%" stop-color="var(--ghost-peach-mid1)" />
	<stop offset="65%" stop-color="var(--ghost-peach-mid2)" />
	<stop offset="85%" stop-color="var(--ghost-peach-mid3)" />
	<stop offset="100%" stop-color="var(--ghost-peach-end)" />
</linearGradient>
```

### Gradient Animation

Gradients are animated through two mechanisms:

1. **CSS animations**: Control basic transitions and keyframes
2. **JavaScript animations**: Handle dynamic effects via `gradientAnimator.js`

The JavaScript-based animations provide enhanced control over gradient behaviors that CSS alone cannot handle.

## Configuration System

The ghost component uses a centralized configuration approach with two main configuration files:

### Animation Configuration

Animation behaviors are configured in `animationConfig.js`, which provides a centralized system for all animation parameters:

```javascript
// Ghost Animation Configuration
export const BLINK_CONFIG = {
	MIN_GAP: 4000, // Minimum time between ambient blinks (ms)
	MAX_GAP: 9000, // Maximum time between ambient blinks (ms)
	SINGLE_DURATION: 300, // Duration of a single blink (ms)
	DOUBLE_PAUSE: 200, // Pause between blinks in a double-blink (ms)
	TRIPLE_PAUSE: 150, // Pause between blinks in a triple-blink (ms)
	DOUBLE_CHANCE: 0.25, // Probability (0-1) of double blink vs single
	THINKING_RATE: 150, // Time between blinks in thinking state (ms)
	THINKING_INTERVAL: 1000, // Interval for thinking blink pattern (ms)
	RESUME_DELAY: 500 // Delay before resuming blinks after state change (ms)
};

export const EYE_CONFIG = {
	CLOSED_SCALE: 0.05, // Scale factor when eyes are closed
	X_MULTIPLIER: 4, // Horizontal movement multiplier for eyes
	Y_MULTIPLIER: 2, // Vertical movement multiplier for eyes
	X_DIVISOR: 3, // Divisor for max horizontal tracking distance
	Y_DIVISOR: 3, // Divisor for max vertical tracking distance
	DEAD_ZONE: 0.05, // Dead zone for eye movement (0-1)
	SMOOTHING: 0.2, // Smoothing factor for eye movement (0-1)
	REACT_DELAY: 500, // Delay before reacting to transcript (ms)
	TEXT_THRESHOLD: 20 // Threshold for "long" transcript reactions
};

// CSS class names for consistent reference
export const CSS_CLASSES = {
	WOBBLE_LEFT: 'wobble-left',
	WOBBLE_RIGHT: 'wobble-right',
	SPIN: 'spin',
	PULSE: 'ghost-pulse',
	INITIAL_LOAD: 'initial-load'
};
```

### Gradient Configuration

Gradient behaviors are configured in `gradientConfig.js`:

```javascript
// Animation timing parameters
export const animationTiming = {
	shimmer: {
		duration: 5, // Animation cycle in seconds
		ease: 'ease-in-out', // Easing function
		opacityRange: [0.88, 1.0] // Min/max opacity values
	}
	// ...more timing configurations
};

// Theme-specific animation behaviors
export const shapeAnimations = {
	peach: {
		flowDuration: 9,
		flowEase: 'cubic-bezier(0.4, 0, 0.6, 1)',
		scale: { min: 1.0, mid: 1.012, steps: 1.005 }
		// ...other animation parameters
	}
	// ...other themes
};
```

These configurations control all animation aspects:

- Timing parameters (durations, delays, intervals)
- Animation probabilities and thresholds
- Visual behavior values (scale factors, movement multipliers)
- CSS class names for consistent reference
- Gradient animation behaviors

This centralized approach makes it easy to tweak all ghost animations from one place without modifying component logic.

## Animation CSS Structure

The animation CSS is organized into sections:

1. **Base animations**: Core animations for the ghost SVG
2. **State animations**: Animations for different ghost states (recording, processing)
3. **Theme-specific animations**: Animations that vary by theme
4. **Keyframe definitions**: All animation keyframes organized by purpose
5. **Theme flow animations**: Complex animations for each theme variation

Example of theme-specific animation application:

```css
/* Shape element animations per theme */
.ghost-svg.theme-peach #ghost-shape {
	animation:
		shimmer 5s infinite ease-in-out,
		peachFlow 9s infinite cubic-bezier(0.4, 0, 0.6, 1);
	transform-origin: center;
	will-change: transform, opacity, filter;
}
```

## JavaScript Animation Logic

The `gradientAnimator.js` file provides dynamic animation capabilities:

```javascript
export function initGradientAnimation(themeId, svgElement) {
	// Find gradient element
	const gradientId = `${themeId}Gradient`;
	const gradient = svgElement.querySelector(`#${gradientId}`);

	// Initialize animations
	initGradientPositionAnimation(themeId, gradient);
	initStopColorAnimations(themeId, stops);
}
```

Key features include:

- Position animation for gradient points
- Color transitions for gradient stops
- Cleanup mechanisms for animation frames
- CSS variable integration for theme colors

## State Management

The Ghost component relies heavily on Svelte stores for managing its complex state and coordinating animations.

### Core State (`ghostStateStore.js`)

This store implements a state machine (`ANIMATION_STATES`) to manage the ghost's primary mode (e.g., `IDLE`, `RECORDING`, `THINKING`). It also tracks:

- `isRecording`: Boolean flag for audio recording.
- `isProcessing`: Boolean flag for audio processing.
- `isWobbling`, `wobbleDirection`: Flags for the transient wobble effect.
- `eyesClosed`, `eyePosition`: State related to eye animations.
- `isFirstVisit`: Flag for triggering the initial load animation.

Components interact with this store via exported functions like `setRecording`, `setProcessing`, `setAnimationState`, etc.

### Theme State (`themeStore.js`)

This store manages the current visual theme (`peach`, `mint`, etc.). Key features:

- Persists the selected theme to `localStorage`.
- Provides a derived store (`cssVariables`) containing all necessary CSS variables for the current theme's colors and animation parameters.
- Updates the `data-theme` attribute on the HTML root element.

### Component Interaction

The `Ghost.svelte` component primarily uses props (`isRecording`, `isProcessing`, `externalTheme`) to receive state from its parent. It then syncs these prop changes to the `ghostStateStore`.

Reactive statements (`$:`) in `Ghost.svelte` monitor the stores (`$ghostStateStore`, `$themeStore`, `$cssVariables`) and apply necessary updates, such as:

- Binding CSS classes based on state (e.g., `.recording`).
- Applying theme changes by re-initializing gradient animations.
- Injecting dynamic CSS variables into the document head.

```javascript
// Example: Syncing prop changes to the store
$: if (isRecording !== lastRecordingState) {
	lastRecordingState = isRecording;
	ghostStateStore.setRecording(isRecording); // Inform the store
}

// Example: Reacting to store changes for CSS classes
$: wobbleGroupClasses = `ghost-wobble-group ${
	$ghostStateStore.isWobbling ? $ghostStateStore.wobbleDirection : ''
}`.trim();
```

Global theme state is observed reactively:

```javascript
// Apply theme changes when theme store updates
$: if (currentTheme && ghostSvg) {
	// Reset animations with forced reflow
	// Update SVG elements with new theme
	// Clean up and initialize new gradient animation
}
```

This hybrid approach allows for:

- Component-specific state to remain encapsulated
- Shared state (themes) to be centrally managed and reactive
- Automatic synchronization between components

## Eye Tracking System

The Ghost features an eye tracking system that follows cursor movement, implemented as a service in `services/eyeTracking.js`:

### Eye Tracking Service

The service provides a factory function `createEyeTracking()` that returns an eye tracking instance with the following features:

```javascript
// Create a customized eye tracking instance
const eyeTracking = createEyeTracking({
	eyeSensitivity: 0.2, // Smoothing factor (0-1)
	maxDistanceX: 3, // Maximum X distance divisor (screen width / this value)
	maxDistanceY: 3, // Maximum Y distance divisor (screen height / this value)
	maxXMovement: 20, // Maximum X movement in pixels
	maxYMovement: 10, // Maximum Y movement in pixels
	enabled: true, // Enable eye tracking by default
	debug: false // Debug mode
});

// Initialize with ghost element and eyes element
eyeTracking.initialize(ghostElement, eyesElement);

// Control eye state for blinking
eyeTracking.setEyesClosed(true); // Close eyes
eyeTracking.setEyesClosed(false); // Open eyes

// Stop tracking when not needed
eyeTracking.stop();

// Clean up on component destroy
eyeTracking.cleanup();
```

### How Eye Tracking Works

The service tracks mouse movement and calculates eye positions based on:

1. Ghost element's position and dimensions
2. Mouse distance from the ghost's center
3. Normalized position values within configurable boundaries
4. Smoothed transitions for more natural movement
5. Special handling for blinking states

This creates a responsive, engaging interface where the ghost's eyes follow the user's cursor movements with natural-looking animations. The implementation includes:

- Configurable sensitivity and movement constraints
- Smooth transitions between positions
- Event cleanup and resource management
- Debug mode for development assistance
- Support for both normal tracking and blinking states

## Usage Example

To use the Ghost component in a Svelte application:

```svelte
<script>
	import Ghost from '$lib/components/ghost/Ghost.svelte';

	let recording = false;

	function handleToggleRecording() {
		recording = !recording;
	}
</script>

<div class="ghost-container">
	<Ghost
		isRecording={recording}
		animationState={recording ? 'wobble-start' : 'idle'}
		on:toggleRecording={handleToggleRecording}
	/>
</div>
```

## Public Methods

The Ghost component exports several methods for external control:

- `pulse()`: Adds a subtle pulse animation
- `forceWobble(direction)`: Triggers wobble animation in specified direction
- `startThinking()`: Starts thinking animation (for processing state)
- `stopThinking()`: Stops thinking animation
- `reactToTranscript(textLength)`: Shows reaction based on transcript length
- `updateGradientSettings(themeId, settings)`: Updates gradient animation settings

## Best Practices

When working with the Ghost component:

1. Always use ID selectors for direct element targeting
2. Ensure each animation has a clear purpose and doesn't conflict with others
3. Maintain separation between theme definitions and animation behaviors
4. Keep animation timing parameters in animationConfig.js for easy adjustment
5. Use CSS variables for all color values
6. Clear timeouts properly to avoid animation conflicts
7. Force browser reflow when needed to ensure clean animation transitions
8. Use transform-origin consistently across related animations
9. Use the CSS_CLASSES constants for consistent class name references
10. When adding new theme colors, add them to the `themeColors` object in `themeStore.js`
11. Subscribe to the theme store for any components that need to react to theme changes
12. Use the `cssVariables` derived store for dynamically generated CSS variables

## Troubleshooting

Common issues and their solutions:

1. **Ghost shape leaking outside outline**: Ensure animations apply to both shape and outline, or apply scale transforms to a parent element containing both.

2. **Animation conflicts**: Check for overlapping animations targeting the same properties. Use `void element.offsetWidth` to force reflow between animation changes.

3. **Theme colors not updating**: Ensure the global `<style id="ghost-theme-vars">` (rendered via `generateAllThemeCssVariables()` in `themeStore.js`) is present so the CSS variables exist before the ghost renders.

4. **Gradient flickering**: Simplify animations by either using CSS or JavaScript exclusively for color transitions, not both simultaneously.

5. **Performance issues**: Use `will-change` property judiciously and ensure animation frame cleanup in component lifecycle methods.

6. **Animations not applying correctly**: Ensure you're targeting SVG elements directly with ID selectors (e.g., `#ghost-shape`) rather than their container groups (e.g., `.ghost-bg`). SVG animations often need higher specificity and direct element targeting to work properly. For example:

   ```css
   /* Incorrect - targeting container group */
   .ghost-svg.theme-peach .ghost-bg {
   	animation: peachFlow 9s infinite cubic-bezier(0.4, 0, 0.6, 1);
   }

   /* Correct - targeting element directly by ID */
   .ghost-svg.theme-peach #ghost-shape {
   	animation: peachFlow 9s infinite cubic-bezier(0.4, 0, 0.6, 1);
   }
   ```

   This is especially important for complex animations involving transforms, which can behave unpredictably when applied to nested SVG group elements.
