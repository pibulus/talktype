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

## Ghost Icon Animation System

The ghost icon uses a Brian Eno-inspired generative/ambient animation system:

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
- **DOM Class Source of Truth**: Uses `.recording` class to track recording state
- **State Transitions**:
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
