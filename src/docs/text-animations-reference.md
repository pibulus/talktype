# Text Animation Reference Guide

This document provides a comprehensive guide to implementing text animations and effects in web applications, with specific examples and combinations for creating engaging user interfaces.

## Table of Contents

1. [Animation Types](#animation-types)
2. [Implementation Techniques](#implementation-techniques)
3. [Recommended Combinations](#recommended-combinations)
4. [Performance Considerations](#performance-considerations)
5. [Accessibility Concerns](#accessibility-concerns)
6. [Complete Examples](#complete-examples)

## Animation Types

### Entry Animations

| Animation             | Description                                     | Best For                     | Difficulty | Code Example                  |
| --------------------- | ----------------------------------------------- | ---------------------------- | ---------- | ----------------------------- |
| **Staggered Letters** | Letters appear sequentially with cascade effect | Brand names, main titles     | Medium     | [Example](#staggered-letters) |
| **Slide In**          | Content slides in from edge or off-screen       | Subtitles, paragraphs        | Easy       | [Example](#slide-in)          |
| **Fade + Scale**      | Content fades in while scaling up slightly      | Any text, cards, buttons     | Easy       | [Example](#fade-scale)        |
| **Typewriter**        | Text types out character by character           | Terminal UI, chat interfaces | Medium     | [Example](#typewriter)        |
| **Word by Word**      | Words appear sequentially                       | Sentences, paragraphs        | Easy       | [Example](#word-by-word)      |

### Interactive Animations

| Animation           | Description                                | Best For                      | Difficulty | Code Example                |
| ------------------- | ------------------------------------------ | ----------------------------- | ---------- | --------------------------- |
| **Hover Glow**      | Text glows on hover                        | Links, buttons                | Easy       | [Example](#hover-glow)      |
| **Wiggle/Jiggle**   | Text shakes slightly on hover or click     | Buttons, interactive elements | Easy       | [Example](#wiggle-jiggle)   |
| **Letter Scramble** | Letters scramble/unscramble on interaction | Creative UI, game elements    | Medium     | [Example](#letter-scramble) |
| **Tracking Expand** | Letter spacing increases on hover          | Navigation, important words   | Easy       | [Example](#tracking-expand) |
| **Magnetic Hover**  | Text or elements follow cursor slightly    | Navigation, cards             | Medium     | [Example](#magnetic-hover)  |

### Ambient Animations

| Animation              | Description                           | Best For                      | Difficulty | Code Example                   |
| ---------------------- | ------------------------------------- | ----------------------------- | ---------- | ------------------------------ |
| **Gradient Text Fill** | Animated color gradient across text   | Brand names, headings         | Medium     | [Example](#gradient-text-fill) |
| **Soft Pulse**         | Text subtly pulses in size or opacity | Status indicators, CTAs       | Easy       | [Example](#soft-pulse)         |
| **Shimmer**            | Light sweep across text               | Logos, titles, loading states | Medium     | [Example](#shimmer)            |
| **Floating**           | Gentle up/down floating motion        | Hero elements, isolated text  | Easy       | [Example](#floating)           |
| **Background Wave**    | Animated wave/curve behind text       | Section headers               | Medium     | [Example](#background-wave)    |

## Implementation Techniques

### Staggered Letters

Split text into individual letter spans with incremental animation delays:

```html
<h1 class="staggered-text">
	<span class="stagger-letter">H</span>
	<span class="stagger-letter">e</span>
	<span class="stagger-letter">l</span>
	<span class="stagger-letter">l</span>
	<span class="stagger-letter">o</span>
</h1>
```

```css
.stagger-letter {
	display: inline-block;
	opacity: 0;
	transform: translateY(20px);
	animation: staggerFadeIn 0.5s ease-out forwards;
	will-change: transform, opacity;
}

.stagger-letter:nth-child(1) {
	animation-delay: 0.1s;
}
.stagger-letter:nth-child(2) {
	animation-delay: 0.15s;
}
.stagger-letter:nth-child(3) {
	animation-delay: 0.2s;
}
.stagger-letter:nth-child(4) {
	animation-delay: 0.25s;
}
.stagger-letter:nth-child(5) {
	animation-delay: 0.3s;
}

@keyframes staggerFadeIn {
	0% {
		opacity: 0;
		transform: translateY(20px);
	}
	100% {
		opacity: 1;
		transform: translateY(0);
	}
}
```

### Slide In

Simple slide and fade for paragraphs or blocks of text:

```html
<p class="slide-in">This text will slide in from below.</p>
```

```css
.slide-in {
	opacity: 0;
	transform: translateY(15px);
	animation: slideIn 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
	will-change: transform, opacity;
}

@keyframes slideIn {
	0% {
		opacity: 0;
		transform: translateY(15px);
	}
	100% {
		opacity: 1;
		transform: translateY(0);
	}
}
```

### Fade Scale

Subtle fade in with slight scaling for a soft entry:

```html
<div class="fade-scale">Content that fades in with scale</div>
```

```css
.fade-scale {
	opacity: 0;
	transform: scale(0.95);
	animation: fadeScale 0.7s ease-out forwards;
	will-change: transform, opacity;
}

@keyframes fadeScale {
	0% {
		opacity: 0;
		transform: scale(0.95);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}
```

### Typewriter

Text that types out character by character:

```html
<p class="typewriter">This text will appear as if typed.</p>
```

```css
.typewriter {
	overflow: hidden;
	white-space: nowrap;
	border-right: 2px solid;
	width: 0;
	animation:
		typing 2s steps(30, end) forwards,
		cursor-blink 0.75s step-end infinite;
}

@keyframes typing {
	from {
		width: 0;
	}
	to {
		width: 100%;
	}
}

@keyframes cursor-blink {
	from,
	to {
		border-color: transparent;
	}
	50% {
		border-color: currentColor;
	}
}
```

### Hover Glow

Text that glows on hover:

```html
<a class="hover-glow">Hover me for glow effect</a>
```

```css
.hover-glow {
	transition: text-shadow 0.3s ease;
}

.hover-glow:hover {
	text-shadow:
		0 0 8px rgba(255, 255, 255, 0.8),
		0 0 12px rgba(70, 120, 255, 0.5);
}
```

### Gradient Text Fill

Animated gradient color across text:

```html
<h1 class="gradient-text">Gradient Text</h1>
```

```css
.gradient-text {
	background: linear-gradient(to right, #ff8a00, #e52e71, #ff8a00);
	background-size: 200% auto;
	color: transparent;
	-webkit-background-clip: text;
	background-clip: text;
	animation: gradient-shift 3s linear infinite;
}

@keyframes gradient-shift {
	to {
		background-position: 200% center;
	}
}
```

## Recommended Combinations

These combinations work well together to create cohesive animation sequences:

### Landing Page Hero

1. **Main Title**: Staggered letters animation with 0.5s delay after page load
2. **Subtitle**: Slide-in animation starting 0.7s after title animation begins
3. **CTA Button**: Fade-scale animation after subtitle, followed by soft pulse

```html
<div class="hero">
	<h1 class="staggered-text">
		<span class="stagger-letter">W</span>
		<span class="stagger-letter">e</span>
		<span class="stagger-letter">l</span>
		<span class="stagger-letter">c</span>
		<span class="stagger-letter">o</span>
		<span class="stagger-letter">m</span>
		<span class="stagger-letter">e</span>
	</h1>
	<p class="slide-in">Your amazing product tagline goes here</p>
	<button class="fade-scale pulse">Get Started</button>
</div>
```

### Form Elements

1. **Form Title**: Word-by-word animation
2. **Input Fields**: Sequential slide-in animations
3. **Submit Button**: Fade-in with wiggle animation on hover

### Content Sections

1. **Section Headers**: Slide-in with gradient text
2. **Paragraphs**: Fade-in with slight delay
3. **Images/Media**: Fade-scale with slightly longer delay

## Performance Considerations

To maintain 60fps animations, especially on mobile devices:

1. **Use `will-change`** for hardware acceleration on animated properties

   ```css
   .animated-element {
   	will-change: transform, opacity;
   }
   ```

2. **Avoid animating expensive properties**:

   - Good: `transform`, `opacity`
   - Avoid: `box-shadow`, `filter`, `width/height`

3. **Reduce browser reflows**:

   - Force reflow only when necessary with `void element.offsetWidth`
   - Group animation changes within requestAnimationFrame

4. **Add progressive enhancement**:
   ```css
   @media (prefers-reduced-motion: reduce) {
   	.animated-element {
   		animation: none !important;
   		transition: none !important;
   	}
   }
   ```

## Accessibility Concerns

1. **Add a skip option** for users who prefer no animations
2. **Respect `prefers-reduced-motion`** media query
3. **Avoid** animations that flash rapidly (can trigger photosensitive conditions)
4. **Ensure** content is accessible without animations
5. **Test** with screen readers to verify animations don't interfere

## Complete Examples

### Page Title Sequence

```svelte
<script>
	import { onMount } from 'svelte';

	let titleComplete = false;
	let subtitleComplete = false;

	onMount(() => {
		// Handle animation sequence completion
		setTimeout(() => (titleComplete = true), 1200);
		setTimeout(() => (subtitleComplete = true), 2000);
	});
</script>

<h1 class="staggered-text">
	<span class="stagger-letter">T</span>
	<span class="stagger-letter">a</span>
	<span class="stagger-letter">l</span>
	<span class="stagger-letter">k</span>
	<span class="stagger-letter">T</span>
	<span class="stagger-letter">y</span>
	<span class="stagger-letter">p</span>
	<span class="stagger-letter">e</span>
</h1>

<p class="slide-in-subtitle">Fast, accurate, and free voice-to-text transcription.</p>

<style>
	.staggered-text {
		margin-bottom: 0.25rem;
		text-align: center;
		font-weight: 900;
		font-size: 3rem;
	}

	.stagger-letter {
		display: inline-block;
		opacity: 0;
		transform: translateY(15px);
		animation: staggerFadeIn 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards;
		will-change: transform, opacity;
	}

	/* Apply different delays to each letter */
	.stagger-letter:nth-child(1) {
		animation-delay: 0.05s;
	}
	.stagger-letter:nth-child(2) {
		animation-delay: 0.1s;
	}
	.stagger-letter:nth-child(3) {
		animation-delay: 0.15s;
	}
	.stagger-letter:nth-child(4) {
		animation-delay: 0.2s;
	}
	.stagger-letter:nth-child(5) {
		animation-delay: 0.25s;
	}
	.stagger-letter:nth-child(6) {
		animation-delay: 0.3s;
	}
	.stagger-letter:nth-child(7) {
		animation-delay: 0.35s;
	}
	.stagger-letter:nth-child(8) {
		animation-delay: 0.4s;
	}

	@keyframes staggerFadeIn {
		0% {
			opacity: 0;
			transform: translateY(15px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.slide-in-subtitle {
		opacity: 0;
		transform: translateY(10px);
		animation: slideIn 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
		animation-delay: 0.6s;
		will-change: transform, opacity;
		backface-visibility: hidden;
		margin: 0 auto;
		text-align: center;
		font-size: 1.25rem;
		color: #4b5563;
	}

	@keyframes slideIn {
		0% {
			opacity: 0;
			transform: translateY(10px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.stagger-letter,
		.slide-in-subtitle {
			animation: none !important;
			opacity: 1;
			transform: none;
		}
	}
</style>
```

---

This reference document provides a foundation for implementing text animations that enhance user experience while maintaining performance and accessibility standards. Use these patterns as building blocks for your own creative text animations and effects.
