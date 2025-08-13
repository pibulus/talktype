# TalkType Visual Style Guide

## Visual Identity & Design Philosophy

TalkType is part of the Soft Stack family—a suite of emotionally intelligent, tactile, minimalist tools that blend functionality with a touch of personality. Our design approach combines clean, minimalist interfaces with subtle animations and interactions that create a sense of presence and delight.

We embrace a "soft modern brutalism" aesthetic with gentle whimsy, creating experiences that are both visually pleasing and intuitively functional. Our design language prioritizes clarity and responsiveness while introducing thoughtful micro-interactions that surprise and delight.

## Color Palette

### Primary Colors

Our color palette is carefully curated to create a warm, inviting atmosphere that feels both modern and approachable:

- **Background/Canvas**: Soft Cream `#FEFAF4` to `#FCF5EA` (radial gradient)
- **Element Backgrounds**: Eggshell White `#FFFDF7` with semi-transparency
- **Text**: Dark Gray `#1A1A1A` (titles), Slate Gray `#374151` (body)
- **CTAs/Buttons**: Amber `#F59E0B` to `#FBBF24` (gradient)
- **Progress Indication**: Amber `#FBBF24` to Rose `#FDA4AF` (gradient)

### Accent Colors & Gradients

Our accent colors provide visual interest and highlight interactive elements:

- **Ghost Icon Gradient**: Pink `#FF9CEE` to Purple `#9C71F9` (diagonal)
- **Visualizer Bars**: Pink `#FF7EB3` to Purple `#7B68EE` (vertical)
- **Toast Notifications**: Pink `#FFF8FA` to Lavender `#FAF5FF` (horizontal)
- **Shadows & Glows**: Pink `rgba(249, 168, 212, 0.3)` with varying opacity

### Color Application Rules

- Never use pure white or black; always opt for softer tones
- Apply subtle gradients for visual depth and warmth
- Use transparency to create layered, airy interfaces
- Maintain sufficient contrast for accessibility (AA rating minimum)
- Shadows should be soft, colored, and thoughtfully applied

## Typography

Our typography is clean, readable, and friendly:

- **Headings**: Sans-serif, font-weight 900 (black), tracking tight
- **Body Text**: Sans-serif, font-weight 400-500, leading-relaxed
- **UI Elements**: Sans-serif, font-weight 600-700, size appropriate to importance
- **Transcript Text**: Monospace, for clear distinction and readability

Typography should be responsive, with text sizes scaling appropriately across device sizes:

- Mobile: Compact but readable (text-base to text-xl for primary content)
- Desktop: More generous spacing and sizing (text-lg to text-3xl)

## Component Design

### Buttons

- **Primary Action (Recording)**: Rounded-full, amber gradient, with subtle shadow
- **Secondary Actions**: Rounded-full, lighter background, minimal styling
- **Hover States**: Scale transform (105%), color brightening, subtle shadow increase
- **Focus States**: Visible outline ring in amber for keyboard navigation
- **Active/Pressed**: Scale reduction (95%), darker color, inner shadow

### Progress Indicators

- Smooth gradient from amber to rose
- Animated pulse glow effect during activity
- Completion indicated by brief pulse animation
- Height adjusted for touch targets on mobile

### Cards & Containers

- Rounded corners (rounded-2xl minimum)
- Subtle border in pink/purple tones
- White background with slight transparency
- Soft shadows with colored glow
- Special effects (speech bubble point) for transcript container

### Toasts & Notifications

- Fixed positioning for consistency
- Rounded-full for softness
- Gradient background with backdrop blur
- Animated entrance and exit
- Ghost icon reinforces brand identity

## Animation & Micro-interactions

Our animations are intentional, smooth, and enhancing rather than distracting:

### Timing & Easing

- **Fast Actions**: 150-300ms, cubic-bezier(0.25, 0.1, 0.25, 1)
- **UI Transitions**: 300-500ms, cubic-bezier(0.19, 1, 0.22, 1)
- **Entrance Animations**: 600-800ms, with staggered timing for elements
- **Ambient Animations**: Subtle, slow (2.5s+), ease-in-out for floating effects

### Animation Types

- **Transforms**: Scale, translate, and rotate for most UI movements
- **Opacity**: For fade effects and emphasis
- **Color Shifts**: Subtle changes in gradient or hue for state changes
- **Staggered Animations**: For text and sequential elements
- **Organic Movement**: Ghost icon "blinks" and wobbles with randomized timing

### Special Effects

- **Confetti Celebration**: On successful transcription completion
- **Ghost Expressions**: Blinking, thinking, and reactive animations
- **Progress Glow**: Pulsing effect during processing

## Layout & Structure

- Centered, stacked layout for primary content
- Maximum width constraints for readability and focus
- Responsive padding and margin that adapts to screen size
- Layered elements for depth and focus
- Fixed positioning for persistent elements (toasts, footer)
- Careful spacing to prevent layout shifts during state changes

## Accessibility Considerations

- Sufficient color contrast for all text (4.5:1 minimum)
- Keyboard navigation with visible focus states
- Screen reader announcements for state changes
- Appropriate ARIA attributes on interactive elements
- Touch targets sized appropriately for mobile (min 44px)
- Alternative text for visual elements
- Semantic HTML structure

## Voice & Tone

Our interface copy matches our visual style:

- Warm, friendly, and human
- Concise and clear
- Emotionally intelligent with a touch of whimsy
- Action-oriented for buttons and interactive elements
- Celebratory for success states

Examples:

- "Start Recording" (clear action)
- "Transcript copied to clipboard! ✨" (confirmation with personality)
- "Made with ❤️ by Dennis & Pablo" (personal touch)

---

This style guide captures the essence of TalkType's current implementation while providing a framework for consistent future development. The design combines functionality with personality, creating an experience that is both efficient and delightful.
