# TalkType Visual Style Guide

## Purpose

This is a practical style note, not a design-token source of truth. Use the existing Tailwind classes, theme helpers, and component patterns before inventing new visual language.

TalkType should feel focused, warm, and lightly playful. The app is a voice-to-text utility first: the recording flow must stay obvious, the transcript must stay readable, and the ghost personality should support the work rather than crowd it.

## Color Palette

### Primary Colors

Our color palette is carefully curated to create a warm, inviting atmosphere that feels both modern and approachable:

- **Background/Canvas**: Soft Cream `#FEFAF4` to `#FCF5EA` (radial gradient)
- **Element Backgrounds**: Eggshell White `#FFFDF7` with semi-transparency
- **Text**: Dark Gray `#1A1A1A` (titles), Slate Gray `#374151` (body)
- **Primary Accents**: warm amber, peach, pink, and rose accents depending on context
- **Supporter/Passport Accents**: pastel card colors, QRBuddy stamps, and pink supporter surfaces

### Accent Colors & Gradients

Our accent colors provide visual interest and highlight interactive elements:

- **Ghost Icon Gradient**: Pink `#FF9CEE` to Purple `#9C71F9` (diagonal)
- **Visualizer Bars**: Pink `#FF7EB3` to Purple `#7B68EE` (vertical)
- **Toast Notifications**: Pink `#FFF8FA` to Lavender `#FAF5FF` (horizontal)
- **Shadows & Glows**: Pink `rgba(249, 168, 212, 0.3)` with varying opacity

### Color Application Rules

- Prefer cream-tinted whites and softened dark text for surfaces and copy.
- Black is fine where it is part of the ghost SVG outline/eyes or needed for reliable contrast.
- Apply subtle gradients for visual depth and warmth
- Use transparency to create layered, airy interfaces
- Maintain sufficient contrast for accessibility (AA rating minimum)
- Shadows should be soft, colored, and thoughtfully applied
- Avoid turning the app into a one-hue pink/cream wash; use contrast and hierarchy when a workflow needs clarity.

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

- **Primary Action (Recording)**: large, obvious, touch-friendly, with visual feedback during recording
- **Supporter/Passport Actions**: warm pink/rose actions with clear disabled/loading states
- **Secondary Actions**: lighter background, lower visual weight, still at least 44px tall
- **Hover States**: Scale transform (105%), color brightening, subtle shadow increase
- **Focus States**: Visible outline ring in amber for keyboard navigation
- **Active/Pressed**: Scale reduction (95%), darker color, inner shadow
- **Transitions**: use short `transition-* duration-150` style movement for interactive state changes

### Progress Indicators

- Smooth gradient from amber to rose
- Animated pulse glow effect during activity
- Completion indicated by brief pulse animation
- Height adjusted for touch targets on mobile

### Cards & Containers

- Use rounded corners consistently with the surrounding component family.
- Subtle border in pink/purple tones
- White background with slight transparency
- Soft shadows with colored glow
- Special effects (speech bubble point) for transcript container
- Avoid wrapping cards inside more cards. Use cards for repeated items, modals, history entries, and framed tools.

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

- **Passport Reveal**: Supporter unlock/card moments can use slightly more ceremony than normal UI.
- **Ghost Expressions**: Blinking, thinking, and reactive animations
- **Progress Glow**: Pulsing effect during processing

## Layout & Structure

- Centered, stacked layout for primary content
- Maximum width constraints for readability and focus
- Responsive padding and margin that adapts to screen size
- Layered elements for depth and focus
- Fixed positioning for persistent elements (toasts, footer)
- Careful spacing to prevent layout shifts during state changes
- Keep transcription as the first-screen job. Do not turn the app into a dashboard.

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
- "Copied to clipboard" (confirmation without fuss)
- "Passport imported on this device." (plain outcome)
- "Getting your notes needs one more try." (calm failure state)

---

This style guide should stay short and directional. If it starts describing implementation details, move those details to `docs/ARCHITECTURE.md`, `docs/ghost-icon-reference.md`, or the component itself.
