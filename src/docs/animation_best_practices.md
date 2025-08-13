# Animation Best Practices for TalkType

This document outlines the best practices for ghost animations and rainbow gradients based on analysis of existing implementations.

## Ghost Blinking Animation

### Recommended Implementation

```javascript
// Single blink using CSS classes - simplified and faster
function blink() {
	const eyes = getEyesElement();
	if (!eyes) return;

	// Clear any existing animations first
	if (blinkTimeout) {
		clearTimeout(blinkTimeout);
	}

	// Apply blink animation
	eyes.classList.add('blink-once');

	// Remove class after animation completes (faster animation)
	blinkTimeout = setTimeout(() => {
		eyes.classList.remove('blink-once');
	}, 180);
}
```

### CSS Implementation

```css
/* Quick blink animation for programmatic use - faster */
.icon-eyes.blink-once {
	animation: blink-once 0.18s forwards !important;
	transform-origin: center center;
}

@keyframes blink-once {
	0%,
	20% {
		transform: scaleY(1);
	}
	50% {
		transform: scaleY(0.05);
	}
	80%,
	100% {
		transform: scaleY(1);
	}
}
```

### Best Practices

1. **Keep it Simple**: Use a single function for all blinking needs
2. **Fast Animation**: Keep the blink animation under 200ms for a snappy feel
3. **Clean Timeouts**: Always clear previous timeouts before starting new ones
4. **Single Responsibility**: Keep animation logic focused and minimal
5. **DOM Efficiency**: Minimize DOM manipulations by using CSS classes

### Creating Double Blinks

```javascript
// For a double blink, use sequential timeouts
function doubleClick() {
	blink();
	setTimeout(() => blink(), 200);
}
```

## Rainbow Gradient Animation

### Recommended Implementation

```css
/* Rainbow animation for ghost svg with sparkle effect */
.rainbow-animated {
	animation: rainbowFlow 7s linear infinite;
	filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.6));
}

/* Special rainbow sparkle effect when hovered */
.icon-container:hover .rainbow-animated {
	animation:
		rainbowFlow 4.5s linear infinite,
		sparkle 2s ease-in-out infinite;
	filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
}

@keyframes rainbowFlow {
	0% {
		filter: hue-rotate(0deg) saturate(1.4) brightness(1.15);
	}
	100% {
		filter: hue-rotate(360deg) saturate(1.5) brightness(1.2);
	}
}

@keyframes sparkle {
	0%,
	100% {
		filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))
			drop-shadow(0 0 8px rgba(255, 61, 127, 0.6));
	}
	25% {
		filter: drop-shadow(0 0 6px rgba(255, 141, 60, 0.8))
			drop-shadow(0 0 10px rgba(255, 249, 73, 0.7));
	}
	50% {
		filter: drop-shadow(0 0 6px rgba(77, 255, 96, 0.7)) drop-shadow(0 0 9px rgba(53, 222, 255, 0.7));
	}
	75% {
		filter: drop-shadow(0 0 7px rgba(159, 122, 255, 0.8))
			drop-shadow(0 0 9px rgba(255, 61, 127, 0.6));
	}
}
```

### Best Practices

1. **Filter-Based Animations**: Use `hue-rotate` for color cycling rather than background positions
2. **Linear Timing**: Use `linear` timing for smooth color transitions
3. **GPU Acceleration**: Leverage `filter` properties for GPU-accelerated animations
4. **Simplicity**: Use the minimum number of keyframes needed for the effect
5. **Enhanced Interactivity**: Add special effects like sparkle on hover for increased engagement

### Usage with Theme Switching

```javascript
// When applying the theme, toggle the animation class
function applyTheme(vibeId) {
	// Update ghost icon by swapping the SVG file
	if (iconBgElement) {
		// Set the appropriate gradient SVG based on theme
		switch (vibeId) {
			case 'rainbow':
				iconBgElement.src = '/talktype-icon-bg-gradient-rainbow.svg';
				iconBgElement.classList.add('rainbow-animated');
				break;
			default: // Default themes
				iconBgElement.src = '/talktype-icon-bg-gradient.svg'; // Or other theme SVG
				iconBgElement.classList.remove('rainbow-animated');
				break;
		}

		// Force a reflow to ensure the gradient is visible
		void iconBgElement.offsetWidth;
	}
}
```

## Animation Timing Guidelines

| Animation Type         | Recommended Duration | Notes                               |
| ---------------------- | -------------------- | ----------------------------------- |
| Single Blink           | 180ms                | Fast and snappy                     |
| Double Blink Pause     | 200ms                | Brief pause between blinks          |
| Ambient Blink Interval | 4000-9000ms          | Random interval for natural feel    |
| Rainbow Cycle          | 7000ms               | Full color cycle duration           |
| Rainbow Hover          | 4500ms               | Faster when hovered for more energy |
| Sparkle Effect         | 2000ms               | Medium pace for visual interest     |
| Ghost Wobble           | 600ms                | Quick but noticeable movement       |

## Performance Considerations

1. **Use CSS Classes**: Toggle classes instead of direct style manipulation
2. **Force Reflow**: Use `void element.offsetWidth` when necessary to ensure style changes apply
3. **Clear Timeouts**: Always clear timeouts before creating new ones
4. **Animation Priority**: Disable ambient animations during user interactions
5. **State Management**: Use a single source of truth for animation states

By following these guidelines, TalkType animations will be efficient, visually appealing, and easy to maintain.
