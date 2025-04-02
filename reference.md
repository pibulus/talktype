# Reference Document for TalkType Project

## Build & Development Commands

- **Development Server**: `npm run dev`
- **Production Build**: `npm run build`
- **Preview Build**: `npm run preview`
- **Code Formatting**: `npm run format`
- **Linting**: `npm run lint`

## Code Style Guidelines

- **Framework**: SvelteKit with idiomatic Svelte patterns
- **JavaScript**: Standard JS with JSConfig for type checking
- **Formatting**: Prettier with svelte and tailwind plugins
- **CSS**: Tailwind CSS with DaisyUI components
- **Naming Conventions**: camelCase for variables, PascalCase for components
- **Imports**: ES modules syntax, grouped by type
- **Error Handling**: Avoid window reference errors in SSR
- **Component Structure**: Organized by functionality in `lib/components`
- **Services**: API interactions in `lib/services`
- **Documentation**: JSDoc comments for functions
- **Reactivity**: Use Svelte's reactive declarations and statements

## Ghost Icon Animation System

### Key Principles

- **Indeterminacy**: Blink timing varies (7-16 seconds)
- **Weighted Randomness**: Probability weights for blink patterns
- **Context Awareness**: Different behaviors for different states
- **Personality**: Randomized reactions for state transitions

### Implementation Pattern

1. CSS animation as fallback
2. JS-controlled ambient blinking
3. Separation of ambient and state-based animations
4. Manage `animation` styles vs. classlist-based animations

### Troubleshooting

- **Ambient Blinking Issues**: Ensure `startAmbientBlinking()` is called, check state alignment, verify animation styles
- **Recording Toggle Issues**: Use `.recording` class as source of truth, handle state sync issues, clear animation state

### CSS Details

- Use `transform: scaleY()` for blinking
- Set `transform-origin: center center`
- Clean up timeouts to avoid memory leaks
- Force reflows with `void element.offsetWidth`

## Editor Configuration

- **Default Branch**: master
- **Code Width**: 80 characters
- **Tab Size**: 2 spaces
