# Ghost Icon Reference Document

This document provides a comprehensive reference for implementing, animating, and interacting with the TalkType ghost icon. It covers SVG structure, layering, animations, interaction states, and best practices.

## Table of Contents

1. [SVG Structure](#svg-structure)
2. [Layering System](#layering-system)
3. [Animation System](#animation-system)
4. [Recording State & Interactions](#recording-state--interactions)
5. [DOM Element Structure](#dom-element-structure)
6. [Animation Parameters](#animation-parameters)
7. [Implementation Guidelines](#implementation-guidelines)
8. [Troubleshooting](#troubleshooting)

## SVG Structure

The ghost icon consists of multiple SVG components that are layered together to create the complete icon:

### Core SVG Components

- **Base Outline** (`talktype-icon-base.svg`): The ghost body outline without eyes
- **Eyes Only** (`talktype-icon-eyes.svg`): Just the eyes, separated for animation
- **Gradient Background** (`talktype-icon-bg-gradient.svg`): Pink/purple gradient behind the ghost
- **Complete Icon** (`talktype-icon.svg`): Combined outline and eyes (used only as fallback)

### SVG Paths Structure

1. **Ghost Body**: A complex path defining the classic ghost shape with a wavy bottom
2. **Left Eye**: Oval path with specific positioning for animation
3. **Right Eye**: Matching oval path, positioned for symmetrical blinking

### SVG Markup Example (Eyes Component)

```xml
<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Only the eyes from the ghost icon -->
  <path fill="#000000" opacity="1.000000" stroke="none"
    d="M580.705505,471.768982..."/>

  <path fill="#000000" opacity="1.000000" stroke="none"
    d="M445.338440,471.851562..."/>
</svg>
```

### Gradient Background

The background uses a linear gradient from light pink (`#ffb6c1`) to light purple (`#dda0dd`), creating a subtle glow effect behind the ghost.

## Layering System

The icon uses a layered approach for maximum animation flexibility:

```html
<div class="icon-layers">
	<!-- Gradient background (bottom layer) -->
	<img src="/talktype-icon-bg-gradient.svg" alt="" class="icon-bg" aria-hidden="true" />
	<!-- Outline without eyes (middle layer) -->
	<img src="/assets/talktype-icon-base.svg" alt="" class="icon-base" aria-hidden="true" />
	<!-- Just the eyes (top layer - for blinking) -->
	<img src="/assets/talktype-icon-eyes.svg" alt="TalkType Ghost Icon" class="icon-eyes" />
</div>
```

### Layer CSS Positioning

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
	z-index: 1;
} /* Bottom layer */
.icon-base {
	z-index: 2;
} /* Middle layer */
.icon-eyes {
	z-index: 3;
} /* Top layer */
```

## Animation System

The ghost uses a Brian Eno-inspired generative/ambient animation system with multiple blinking types and patterns.

### Blinking Types

1. **Single Blink**: Simple quick close/open of eyes
2. **Double Blink**: Two consecutive blinks with slight pause between
3. **Triple Blink**: Three consecutive blinks with pauses

### Animation States

1. **Ambient Blinking**: Random blinks during idle state
2. **Recording Blinking**: Different pattern during audio recording
3. **Thinking Blinking**: "Concentrating" pattern during transcription
4. **Interactive Blinking**: Responses to user actions (hover, click)

### Core Animation Implementation

#### CSS Fallback Animation

Basic CSS animation provides a fallback blinking pattern:

```css
.icon-eyes {
	animation: blink 6s infinite; /* Ambient blinking baseline */
	transform-origin: center center;
}

@keyframes blink {
	0%,
	96.5%,
	100% {
		transform: scaleY(1);
	}
	97.5% {
		transform: scaleY(0);
	}
	98.5% {
		transform: scaleY(1);
	}
}
```

#### JS-Enhanced Animation

JavaScript enhances the baseline with generative patterns:

```javascript
// Parameters for generative system
const minGap = 4000; // Minimum time between blinks (4s)
const maxGap = 9000; // Maximum time between blinks (9s)

// Blink type probabilities
const blinkTypes = [
	{ type: 'single', probability: 0.6 }, // 60%
	{ type: 'double', probability: 0.3 }, // 30%
	{ type: 'triple', probability: 0.1 } // 10%
];

// Schedule the next blink recursively with randomized timing
function scheduleNextBlink() {
	const nextInterval = Math.floor(minGap + Math.random() * (maxGap - minGap));
	// ...implementation details...
}
```

## Recording State & Interactions

The ghost icon serves as the primary recording toggle and status indicator.

### Recording Toggle Implementation

```javascript
function startRecordingFromGhost(event) {
	// Stop event propagation
	event.stopPropagation();
	event.preventDefault();

	// Get DOM elements with error checking
	const iconContainer = event.currentTarget;

	// Use DOM class as source of truth
	const hasRecordingClass = iconContainer.classList.contains('recording');

	if (hasRecordingClass) {
		// STOPPING RECORDING
		isRecording = false;

		// Reset all animation state
		eyes.style.animation = 'none';

		// Remove the recording class
		iconContainer.classList.remove('recording');

		// Blink once to acknowledge stop, then resume ambient blinking
		// ...implementation details...

		// Stop the recording
		audioToTextComponent.stopRecording();
	} else {
		// STARTING RECORDING
		isRecording = true;
		clearAllBlinkTimeouts();

		// Reset any existing animations
		eyes.style.animation = 'none';

		// Random chance for different start behaviors (70/20/10 split)
		// ...implementation details...

		// Add recording class after the blink animation completes
		iconContainer.classList.add('recording');

		// Start recording
		audioToTextComponent.startRecording();
	}
}
```

### Recording State CSS

```css
.icon-container.recording {
	animation: recording-glow 1.5s infinite;
	transform: scale(1.05);
}

@keyframes recording-glow {
	0% {
		filter: drop-shadow(0 0 15px rgba(255, 100, 243, 0.5))
			drop-shadow(0 0 25px rgba(249, 168, 212, 0.4));
	}
	50% {
		filter: drop-shadow(0 0 25px rgba(255, 100, 243, 0.8))
			drop-shadow(0 0 35px rgba(255, 120, 170, 0.5)) drop-shadow(0 0 40px rgba(249, 168, 212, 0.4));
	}
	100% {
		filter: drop-shadow(0 0 15px rgba(255, 100, 243, 0.5))
			drop-shadow(0 0 25px rgba(249, 168, 212, 0.4));
	}
}
```

### Recording Animation States

During recording, the icon eyes use a special animation pattern:

```css
.icon-container.recording .icon-eyes {
	animation: blink-thinking 4s infinite;
	transform-origin: center center;
}

@keyframes blink-thinking {
	/* First quick blink */
	0%,
	23%,
	100% {
		transform: scaleY(1);
	}
	3% {
		transform: scaleY(0);
	}
	4% {
		transform: scaleY(1);
	}

	/* Second blink - thinking pattern */
	40% {
		transform: scaleY(1);
	}
	42% {
		transform: scaleY(0);
	}
	43% {
		transform: scaleY(0.2);
	} /* Short peek */
	46% {
		transform: scaleY(0);
	}
	48% {
		transform: scaleY(1);
	}

	/* Third quick blink */
	80% {
		transform: scaleY(1);
	}
	82% {
		transform: scaleY(0);
	}
	83% {
		transform: scaleY(1);
	}
}
```

### Hover Effects

```css
.icon-container:hover,
.icon-container:active {
	filter: drop-shadow(0 0 18px rgba(249, 168, 212, 0.45))
		drop-shadow(0 0 30px rgba(255, 156, 243, 0.3));
	transform: scale(1.03);
	animation: gentle-pulse 3s infinite;
}

@keyframes gentle-pulse {
	0% {
		filter: drop-shadow(0 0 15px rgba(249, 168, 212, 0.4))
			drop-shadow(0 0 20px rgba(255, 156, 243, 0.25));
	}
	50% {
		filter: drop-shadow(0 0 25px rgba(249, 168, 212, 0.55))
			drop-shadow(0 0 30px rgba(255, 156, 243, 0.35));
	}
	100% {
		filter: drop-shadow(0 0 15px rgba(249, 168, 212, 0.4))
			drop-shadow(0 0 20px rgba(255, 156, 243, 0.25));
	}
}
```

## DOM Element Structure

The complete DOM structure for the ghost icon:

```html
<!-- Ghost Icon Container -->
<div
	class="icon-container mb-0 h-32 w-32 cursor-pointer sm:h-40 sm:w-40 md:mb-0 md:h-56 md:w-56 lg:h-64 lg:w-64"
	on:click|preventDefault|stopPropagation="{startRecordingFromGhost}"
	role="button"
	tabindex="0"
	aria-label="Toggle Recording"
>
	<!-- Layered approach with gradient background and blinking eyes -->
	<div class="icon-layers">
		<!-- Gradient background (bottom layer) -->
		<img src="/talktype-icon-bg-gradient.svg" alt="" class="icon-bg" aria-hidden="true" />
		<!-- Outline without eyes (middle layer) -->
		<img src="/assets/talktype-icon-base.svg" alt="" class="icon-base" aria-hidden="true" />
		<!-- Just the eyes (top layer - for blinking) -->
		<img src="/assets/talktype-icon-eyes.svg" alt="TalkType Ghost Icon" class="icon-eyes" />
	</div>
</div>
```

## Animation Parameters

Detailed parameters for all ghost icon animations:

### Blinking Animation Parameters

- **Ambient Timing**: 4-9 seconds between blinks (minGap = 4000ms, maxGap = 9000ms)
- **Blink Types**: Single (60%), Double (30%), Triple (10%) with weighted probability
- **Animation Durations**:
  - Single blink: 300ms
  - Double blink: 300ms per blink, 200ms gap (800ms total)
  - Triple blink: 300ms per blink, 200ms gaps (1100ms total)
- **CSS Fallback**: `.icon-eyes` has `animation: blink 6s infinite` as baseline

### Wobble Animations

- **Hover Wobble**: Gentle rotation (±1.5°) with drop-shadow when hovering
- **Recording Glow**: Pulsing red shadow effect during recording state
- **Directional Wobbles**: Applied when recording finishes based on response direction
  - Left wobble: `-3.5deg` rotation with left drop-shadow
  - Right wobble: `3.5deg` rotation with right drop-shadow
  - Up wobble: Scale up to 110% with upward drop-shadow
  - Down wobble: Scale down to 90% with downward drop-shadow

### Animation Transition Timing

- **Animation Transitions**: 0.3s ease
- **Hover Transitions**: 0.3s ease-in-out
- **Recording State Transitions**: 0.15s ease-in-out
- **Blinking Speed**: Fast (150-250ms) for natural eye movement

## Implementation Guidelines

### Core Best Practices

1. **Layered SVG Approach**: Always use the layered approach with separate SVGs for body and eyes
2. **DOM Class as Source of Truth**: Use `.recording` class to track state, not JS variables
3. **Force Browser Reflow**: Use `void element.offsetWidth` between animation changes
4. **Clear Timeouts on State Changes**: Prevent animation conflicts

### Implementation Steps

1. **Create SVG Components**:
   - Separate the ghost body and eyes into different SVG files
   - Create a gradient background SVG
2. **Set Up DOM Structure**:

   - Use the layered div structure with absolute positioning
   - Set proper z-index values

3. **Implement CSS Animations**:

   - Add baseline CSS animations
   - Define keyframes for different states

4. **Add JavaScript Enhancement**:

   - Implement the Brian Eno-inspired ambient system
   - Add event handlers for recording toggle

5. **Handle State Changes**:
   - Track recording state with DOM classes
   - Implement proper animation transitions

### Key JavaScript Functions to Implement

1. `setupDomObserver()`: Reliably detect when elements are available
2. `startAmbientBlinking()`: Begin the generative blinking system
3. `performSingleBlink()`, `performDoubleBlink()`, `performTripleBlink()`: Different blink patterns
4. `startRecordingFromGhost()`: Handle recording toggle with proper state management

## Troubleshooting

### Common Issues and Solutions

#### Animation Not Applying

**Problem**: Animations sometimes don't apply or get stuck
**Solution**:

- Force browser reflow with `void element.offsetWidth`
- Clear existing animations with `element.style.animation = 'none'`
- Give a small delay (50ms) before applying new animations

#### Inconsistent Blinking

**Problem**: Ambient blinking stops working randomly
**Solution**:

- Check if the ambient system is being disabled by other states
- Ensure `isRecording` state properly tracks recording state
- Verify that timeouts are being cleared properly

#### Ghost Not Responding to Click

**Problem**: Ghost icon click doesn't toggle recording properly
**Solution**:

- Verify DOM class state matches component state
- Use `event.stopPropagation()` and `event.preventDefault()`
- Check that event handlers are properly attached

#### Animation Conflicts

**Problem**: Multiple animations trying to run simultaneously
**Solution**:

- Use the `!important` flag for programmatic animations
- Clear all existing animations before applying new ones
- Implement proper state tracking and cleanup

#### SVG Loading Issues

**Problem**: SVG elements not found by JavaScript
**Solution**:

- Use MutationObserver to reliably detect when SVGs are loaded
- Implement retry mechanisms for element selection
- Add fallback timeout for browsers without MutationObserver support

---

By following this reference document, you can implement the TalkType ghost icon with its full suite of animations and interactions across different web applications while avoiding common pitfalls.
