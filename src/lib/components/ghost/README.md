# Ghost Component Documentation

## Overview

The Ghost component is an animated SVG character that serves as the central UI element in the TalkType application. It provides visual feedback for audio recording and processing states through various animations and theme transitions. The component combines CSS animations with JavaScript-driven dynamic effects to create a responsive, visually appealing interface element.

## Component Architecture

The Ghost component system consists of several interconnected files:

```
/src/lib/components/ghost/
├── Ghost.svelte           # Main component implementation
├── ghost-animations.css   # Animation keyframes and behaviors
├── ghost-themes.css       # Color definitions and theme variables
├── ghost-paths.svg        # SVG path definitions for the ghost shape
├── gradientAnimator.js    # JS animation logic for gradients
├── gradientConfig.js      # Animation behavior configuration
├── ghostStore.js          # State management (if applicable)
└── services/
    └── eyeTracking.js     # Eye movement and tracking service
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
  </g>
</svg>
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

### Color Definitions

All theme colors are defined in `ghost-themes.css` as CSS variables:

```css
/* Peach theme colors */
--ghost-peach-start: #ff60e0;
--ghost-peach-start-bright: #ff4aed;
--ghost-peach-mid1: #ff82ca;
/* ...and so on for each theme */
```

These variables are then referenced in animations and gradients to maintain a single source of truth for all colors.

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

Animation behaviors are configured in `gradientConfig.js`, which serves as a centralized configuration system:

```javascript
// Animation timing parameters
export const animationTiming = {
  shimmer: {
    duration: 5,              // Animation cycle in seconds
    ease: 'ease-in-out',      // Easing function
    opacityRange: [0.88, 1.0] // Min/max opacity values
  },
  // ...more timing configurations
};

// Theme-specific animation behaviors
export const shapeAnimations = {
  peach: {
    flowDuration: 9,
    flowEase: 'cubic-bezier(0.4, 0, 0.6, 1)',
    scale: { min: 1.0, mid: 1.012, steps: 1.005 },
    // ...other animation parameters
  },
  // ...other themes
};
```

These configurations control animation timing, easing, scaling, and other behaviors separately from the actual color definitions.

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

The Ghost component manages several states:

- `isRecording`: When audio is being recorded
- `isProcessing`: When audio is being processed
- `animationState`: Current animation state (idle, wobble-start, wobble-stop)
- `currentTheme`: Active theme identifier
- `eyesClosed`: Eye state for blinking animations
- `isWobbling`: Whether wobble animation is active

State transitions trigger appropriate animations:

```javascript
// Watch for animation state changes
$: {
  if (animationState === 'wobble-start') {
    forceWobble('wobble-left', true);
  } else if (animationState === 'wobble-stop') {
    forceWobble('wobble-right');
  }
}
```

## Eye Tracking System

The Ghost features an eye tracking system that follows cursor movement, implemented as a service in `services/eyeTracking.js`:

### Eye Tracking Service

The service provides a factory function `createEyeTracking()` that returns an eye tracking instance with the following features:

```javascript
// Create a customized eye tracking instance
const eyeTracking = createEyeTracking({
  eyeSensitivity: 0.2,  // Smoothing factor (0-1)
  maxDistanceX: 3,      // Maximum X distance divisor (screen width / this value)
  maxDistanceY: 3,      // Maximum Y distance divisor (screen height / this value)
  maxXMovement: 20,     // Maximum X movement in pixels
  maxYMovement: 10,     // Maximum Y movement in pixels
  enabled: true,        // Enable eye tracking by default
  debug: false          // Debug mode
});

// Initialize with ghost element and eyes element
eyeTracking.initialize(ghostElement, eyesElement);

// Control eye state for blinking
eyeTracking.setEyesClosed(true);  // Close eyes
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
4. Use CSS variables for all color values
5. Clear timeouts properly to avoid animation conflicts
6. Force browser reflow when needed to ensure clean animation transitions
7. Use transform-origin consistently across related animations

## Troubleshooting

Common issues and their solutions:

1. **Ghost shape leaking outside outline**: Ensure animations apply to both shape and outline, or apply scale transforms to a parent element containing both.

2. **Animation conflicts**: Check for overlapping animations targeting the same properties. Use `void element.offsetWidth` to force reflow between animation changes.

3. **Theme colors not updating**: Verify CSS variables are properly defined in ghost-themes.css and being correctly referenced in both CSS and JavaScript animations.

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