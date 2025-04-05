# TalkType Ghost Icon System Reference

This document provides comprehensive information about the ghost icon system used in TalkType, including its layered SVG approach, animation system, and theme management. It details implementation details, technical specifications, and common pitfalls to avoid when working with the ghost icon.

## Overview

The TalkType ghost icon is central to the app's identity and user experience. It uses a layered SVG approach with three separate components that combine to create a visually appealing, animated character that responds to user interaction and changes with theme selection.

## SVG Layer Structure

The ghost icon consists of three separate SVG files stacked in the following order (bottom to top):

1. **Background Gradient** (`/talktype-icon-bg-gradient.svg`)
   - The bottom layer containing the theme's gradient fill
   - Changes based on selected theme/vibe
   - Multiple variants exist for different themes

2. **Outline** (`/talktype-icon.svg`)
   - The middle layer with the ghost's outline/shape
   - Remains consistent across themes
   - Black outline with transparent interior to show gradient background

3. **Eyes** (`/assets/talktype-icon-eyes.svg`)
   - The top layer containing only the eyes
   - Isolated from the outline to enable independent blinking animation
   - Black fill with specific shape to match outline

## Implementation Example

The ghost icon is implemented as three stacked `<img>` elements within a container:

```html
<div class="icon-layers">
  <!-- Gradient background (bottom layer) -->
  <img src="/talktype-icon-bg-gradient.svg" alt="" class="icon-bg" aria-hidden="true" />
  <!-- Outline without eyes (middle layer) -->
  <img src="/talktype-icon.svg" alt="" class="icon-base" aria-hidden="true" />
  <!-- Just the eyes (top layer - for blinking) -->
  <img src="/assets/talktype-icon-eyes.svg" alt="TalkType Ghost Icon" class="icon-eyes" />
</div>
```

## CSS Setup

The icon layers rely on proper CSS to ensure stacking and animations work correctly:

```css
.icon-layers {
  position: relative;
  width: 100%;
  height: 100%;
}

.icon-bg,
.icon-base,
.icon-eyes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: all 0.3s ease;
}

/* Stack the layers correctly */
.icon-bg {
  z-index: 1; /* Bottom layer */
}

.icon-base {
  z-index: 2; /* Middle layer */
}

.icon-eyes {
  z-index: 3; /* Top layer */
  animation: blink 6s infinite; /* Default ambient blinking */
  transform-origin: center center; /* Ensure eyes blink from center */
}
```

## Theme/Vibe System

### Available Themes

The ghost icon supports multiple themes through different gradient SVG files:

1. **Peach** (Default)
   - Gradient SVG: `/talktype-icon-bg-gradient.svg`
   - Colors: Pink/Purple (#ff9a84, #ff7eb3)

2. **Mint**
   - Gradient SVG: `/talktype-icon-bg-gradient-mint.svg`
   - Colors: Blue/Green (#60a5fa, #34d399)

3. **Bubblegum**
   - Gradient SVG: `/talktype-icon-bg-gradient-bubblegum.svg`
   - Colors: Pink/Purple (#f472b6, #a78bfa)

4. **Rainbow** (Animated)
   - Gradient SVG: `/talktype-icon-bg-gradient-rainbow.svg`
   - Colors: Multi-colored with animation

### Theme Application

Theme switching is implemented by changing the `src` attribute of the background gradient image and applying appropriate classes:

```javascript
function applyTheme(vibeId) {
  // Find the theme configuration
  const vibe = vibeOptions.find(v => v.id === vibeId);
  if (!vibe) return;
  
  // Get the ghost background image element
  const ghostBg = document.querySelector('.icon-bg');
  
  if (ghostBg) {
    if (vibe.animated && vibe.id === 'rainbow') {
      // For rainbow theme, apply animation class
      ghostBg.classList.add('rainbow-animated');
      ghostBg.src = '/talktype-icon-bg-gradient-rainbow.svg';
    } else {
      // Remove animation class for static themes
      ghostBg.classList.remove('rainbow-animated');
      
      // Set the appropriate gradient SVG based on theme
      switch(vibe.id) {
        case 'mint':
          ghostBg.src = '/talktype-icon-bg-gradient-mint.svg';
          break;
        case 'bubblegum':
          ghostBg.src = '/talktype-icon-bg-gradient-bubblegum.svg';
          break;
        default: // Default to peach
          ghostBg.src = '/talktype-icon-bg-gradient.svg';
          break;
      }
    }
    
    // Force a reflow to ensure the gradient is visible
    void ghostBg.offsetWidth;
  }
}
```

## Animation System

### Blinking Animation

The eyes use a combination of CSS and JavaScript to implement a Brian Eno-inspired generative blinking system with weighted probabilities:

#### CSS Animation Baseline

```css
.icon-eyes {
  animation: blink 6s infinite; /* Fallback ambient blinking */
}

@keyframes blink {
  0%, 96.5%, 100% {
    transform: scaleY(1);
  }
  97.5% {
    transform: scaleY(0); /* Closed eyes */
  }
  98.5% {
    transform: scaleY(1); /* Open eyes */
  }
}
```

#### JavaScript Ambient Blinking (Weighted Random)

```javascript
// Blink type probabilities
const blinkTypes = [
  { type: 'single', probability: 0.6 }, // 60%
  { type: 'double', probability: 0.3 }, // 30%
  { type: 'triple', probability: 0.1 }  // 10%
];

// Parameters for generative system
const minGap = 4000; // Minimum time between blinks (4s)
const maxGap = 9000; // Maximum time between blinks (9s)

// Schedule the next blink recursively
function scheduleNextBlink() {
  // Random time interval with Brian Eno-like indeterminacy
  const nextInterval = Math.floor(minGap + Math.random() * (maxGap - minGap));
  
  setTimeout(() => {
    // Choose blink type based on probability distribution
    const rand = Math.random();
    let cumulativeProbability = 0;
    let selectedType = 'single'; // Default
    
    for (const blink of blinkTypes) {
      cumulativeProbability += blink.probability;
      if (rand <= cumulativeProbability) {
        selectedType = blink.type;
        break;
      }
    }
    
    // Execute the selected blink pattern
    if (selectedType === 'single') {
      performSingleBlink();
    } else if (selectedType === 'double') {
      performDoubleBlink();
    } else {
      performTripleBlink();
    }
    
    // Schedule the next blink
    scheduleNextBlink();
  }, nextInterval);
}
```

### Wobble Animations

The ghost icon has wobble animations for various states and interactions:

```css
@keyframes ghost-wobble-left {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  50% { transform: rotate(3deg); }
  75% { transform: rotate(-2deg); }
  100% { transform: rotate(0deg); }
}

@keyframes ghost-wobble-right {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(5deg); }
  50% { transform: rotate(-3deg); }
  75% { transform: rotate(2deg); }
  100% { transform: rotate(0deg); }
}

.ghost-wobble-left {
  animation: ghost-wobble-left 0.6s ease-in-out !important;
}

.ghost-wobble-right {
  animation: ghost-wobble-right 0.6s ease-in-out !important;
}
```

## Rainbow Animation

The rainbow theme uses a special animation to shift colors over time:

```css
.rainbow-animated {
  animation: hueShift 8s linear infinite;
}

@keyframes hueShift {
  0% {
    background-position: 0% 0%;
  }
  50% {
    background-position: 100% 100%;
  }
  100% {
    background-position: 0% 0%;
  }
}
```

## State Management

The ghost icon uses DOM classes and event listeners to manage its state:

- `.recording` class is applied during active recording
- Eye animation changes based on recording state
- Wobble animations are applied when state changes
- Timeouts are cleared between state changes to prevent animation conflicts

## Technical Details

### SVG Files Structure

Each SVG file in the ghost system has a specific structure:

1. **Background Gradient SVG**
   - Contains a path with the ghost shape
   - Uses gradient fills for coloring
   - May include animation features for rainbow theme

2. **Outline SVG**
   - Contains just the ghost outline path
   - Uses black fill with full opacity
   - Does not include the eyes

3. **Eyes SVG**
   - Contains only the eye paths
   - Uses black fill
   - Isolated to enable independent animation

### Path Management

Critical path information:

- **Web Paths**: Always use web paths (`/assets/...`) not file system paths (`/static/assets/...`)
- **File Locations**:
  - Theme gradients: Located at `/talktype-icon-bg-gradient*.svg` in the static root
  - Eyes SVG: Located at `/assets/talktype-icon-eyes.svg`
  - Outline SVG: Located at `/talktype-icon.svg` in the static root

**IMPORTANT**: The file system location (`/static/assets/...`) is different from the web path (`/assets/...`). Never use `/static/` in web paths as Svelte serves the `/static` directory at root.

## Common Pitfalls and Solutions

### 1. Broken Image Links

**Problem**: Ghost icon appears as broken image or "alt text" only.

**Causes**:
- Incorrect path referencing `/static/assets/...` instead of `/assets/...`
- Missing SVG files in the expected locations
- Case sensitivity issues in file paths

**Solution**:
- Always use web paths (`/assets/...`) not file system paths (`/static/assets/...`)
- Verify all SVG files exist in the correct locations
- Check case sensitivity in file paths

### 2. Blinking Issues

**Problem**: The entire ghost blinks instead of just the eyes.

**Causes**:
- Eyes not separated into a separate SVG file
- Animation applied to the wrong element
- Using full ghost SVG for all layers

**Solution**:
- Ensure eyes are in a separate SVG file
- Apply animation classes only to the eyes layer
- Use the three-layer approach with separate SVGs

### 3. Theme Switching Problems

**Problem**: Theme doesn't change or flickers between themes.

**Causes**:
- Multiple theme applications
- Incorrect theme file paths
- Missing force reflow

**Solution**:
- Apply theme only once during initialization
- Use correct file paths for theme SVGs
- Force reflow with `void element.offsetWidth` after changing `src`

### 4. Animation Conflicts

**Problem**: Animations behave erratically or stop working.

**Causes**:
- Multiple animation classes applied simultaneously
- Timeouts not cleared between state changes
- Missing force reflow between animation changes

**Solution**:
- Remove existing animation classes before adding new ones
- Clear timeouts when changing states
- Force reflow between animation changes with `void element.offsetWidth`

## Browser Compatibility

The ghost icon system has been tested and works well in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

For older browsers, consider adding fallbacks for:
- CSS animation support
- SVG support
- JavaScript animation frames

## Performance Considerations

- Use `will-change` property for hardware acceleration on animations
- Optimize SVG files to reduce file size
- Consider using SVG sprites for production to reduce HTTP requests
- Use `backface-visibility: hidden` to prevent rendering artifacts

## Initialization Flow

For proper ghost icon initialization:

1. Load HTML structure with all three layers
2. Apply default theme on page load
3. Read saved theme from localStorage if available
4. Start ambient blinking system after DOM is ready
5. Register event listeners for state changes

## Future Improvements

Potential enhancements to the ghost icon system:

- Convert to SVG sprites to reduce HTTP requests
- Add more theme options
- Expand animation variety for different app states
- Add subtle particle effects for special events
- Implement seasonal variants (halloween, winter, etc.)