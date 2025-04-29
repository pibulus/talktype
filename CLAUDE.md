# CLAUDE.md - Code Standards for TalkType

## Build & Development

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run preview` - Preview production build
- `npm run format` - Run Prettier formatter
- `npm run lint` - Check code formatting and run ESLint

## Code Style Guidelines

- **Framework**: Use idiomatic Svelte patterns; this is a SvelteKit project
- **JavaScript**: Standard JS (not TypeScript) with JSConfig for minimal type checking
- **Formatting**: Prettier with svelte and tailwind plugins
- **CSS**: Tailwind CSS with DaisyUI components
- **Naming**: Use descriptive camelCase for variables, PascalCase for components
- **Imports**: Use ES modules syntax, group imports by type
- **Error Handling**: Avoid window reference errors in SSR context
- **Component Structure**: Organize by functionality in lib/components
- **Services**: External API interactions belong in lib/services
- **Documentation**: Include JSDoc comments for functions
- **Reactivity**: Use Svelte's reactive declarations and statements properly

## Workflow - Use Taskmaster
Howto: src/docs/taskmaster-guide.md
When implementing a feature, use the following TaskMaster workflow:

parse-prd: Generate initial tasks from the feature spec
analyze-complexity: Identify complex tasks that need breakdown
expand: Break down complex tasks into smaller subtasks
next: Determine the next task to work on
set-status: Update task status as you progress
validate-dependencies: Ensure proper task dependencies before marking complete

## Text Animation System

The TalkType app uses subtle text animations for improved user experience:

### Staggered Text Animation

- **Implementation**: Split text into `<span>` elements, one per letter
- **Animation**: Each letter fades in and moves up with CSS transitions
- **Timing**: Letters have cascading delays (50-100ms apart)
- **Performance**: Use `will-change` and hardware acceleration for smoothness
- **CSS Properties**:

  ```css
  .stagger-letter {
  	display: inline-block;
  	opacity: 0;
  	transform: translateY(15px);
  	animation: staggerFadeIn 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards;
  	will-change: transform, opacity;
  }

  /* Incremental delays per letter */
  .stagger-letter:nth-child(1) {
  	animation-delay: 0.05s;
  }
  .stagger-letter:nth-child(2) {
  	animation-delay: 0.1s;
  }
  /* ... and so on */
  ```

### Slide-In Animation

- **Used For**: Subtitle text and other content blocks
- **Effect**: Text slides up and fades in simultaneously
- **Timing**: Typically starts after main title animation begins
- **CSS Properties**:
  ```css
  .slide-in-subtitle {
  	opacity: 0;
  	transform: translateY(10px);
  	animation: slideIn 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
  	animation-delay: 0.6s;
  	will-change: transform, opacity;
  	backface-visibility: hidden;
  }
  ```

### Animation Coordination

- **Sequence**: Main title → Subtitle → Interactive elements
- **Timing**: Total sequence completes in ~2-2.5 seconds
- **Session Management**: Optional storage-based tracking to show animations only on first visit

### Hover Effects

- **Title Hover**: Subtle pink text-shadow glow effect (15px radius with 0.6 opacity)
- **Subtitle Hover**: Color darkening with subtle pink text-shadow (8px radius with 0.3 opacity)
- **Timing**: All hover effects use smooth 0.3s ease transitions
- **Implementation**: Applied through dedicated CSS classes (.title-hover, .subtitle-hover)
- **Note**: Hover effects should be subtle and not interfere with entrance animations

## Ghost Icon System

The ghost icon uses a layered SVG approach with animation:

### SVG Layer Structure

- **Background Gradient** (`/assets/talktype-icon-bg-gradient.svg`): Bottom layer with theme colors
- **Outline** (`/assets/talktype-icon-outline.svg`): Middle layer with ghost outline
- **Eyes** (`/assets/talktype-icon-eyes.svg`): Top layer for isolated blinking animation

### Implementation Details

- **Layer Structure**: Three separate `<img>` elements stacked with absolute positioning
- **Path Structure**: Static assets must use web paths (`/assets/...` not `/static/assets/...`)
- **Theme Variants**: Each theme has a dedicated gradient background SVG:
  - Peach: `/assets/talktype-icon-bg-gradient.svg` (default)
  - Mint: `/assets/talktype-icon-bg-gradient-mint.svg`
  - Bubblegum: `/assets/talktype-icon-bg-gradient-bubblegum.svg`
  - Rainbow: `/assets/talktype-icon-bg-gradient-rainbow.svg` (with animation)
- **Favicon & PWA Icons**: Generated from the ghost SVG at various sizes
  - Standard favicon: `/favicon.png` (32x32)
  - Apple Touch Icon: `/apple-touch-icon.png` (180x180)
  - PWA Icons: `/icons/icon-*.png` (various sizes)
  - Special maskable icon: `/icons/icon-maskable-512x512.png` (for Android)

### Theme Switching

- **Theme Application**: Updates the `src` attribute of the gradient background image
- **Rainbow Animation**: Adds `rainbow-animated` class for hue-shift animation
- **Storage**: Theme preference saved in `localStorage` as `talktype-vibe`
- **Visualizer Colors**: Match the gradient theme in the audio visualizer bars

### Common Pitfalls

- **Incorrect Paths**: Must use web paths (`/assets/...`) not file system paths (`/static/assets/...`)
- **Blinking Issues**: Eyes must be in a separate SVG to animate independently
- **Multiple Theme Applications**: Ensure theme is only applied once during initialization
- **Force Reflow**: Use `void element.offsetWidth` after changing `src` to ensure update

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

### State Management

- **CRITICAL ANIMATION ARCHITECTURE**:
  - Page.svelte MUST be the ONLY source of truth for all ghost animation state
  - Ghost.svelte must NEVER have conditional classes that respond to props (prevents double animations)
  - Animation triggers ONLY happen via state variables - NEVER direct DOM manipulation
  - All timeouts must be properly cleared before setting new ones
  - Always use large delays (1-2s) between different animation transitions

- **State Transitions**:
  - Use state variables (eyesClosed, isWobbling, isRecording, isProcessing)
  - Force browser reflow between animation changes with `void element.offsetWidth`
  - Clear timeouts on state changes to prevent animation conflicts
  - Separated ambient system from state-based animations

### Troubleshooting

- **Animation Not Applying**: May need to force browser reflow
- **Inconsistent Blinking**: Check ambient system isn't being disabled by other states
- **Ghost Not Responding to Click**: Verify DOM class state matches component state

## Editor Configuration

- Default branch: master
- Code width: 80 characters
- Tab size: 2 spaces
