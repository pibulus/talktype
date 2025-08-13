# TalkType Development History & Reference

_Generated from git history analysis - Key insights and architectural decisions_

## Core Architecture & System Design

### Application Structure

- **Framework**: SvelteKit with Svelte 5.0
- **Styling**: Tailwind CSS with DaisyUI components
- **Build**: Vite with Vercel adapter
- **Port Configuration**: Server runs on port 50001 for consistency

### Key Services Architecture

```
/src/lib/services/
├── audio/                 # Audio recording and processing
├── transcription/         # AI transcription services (Gemini API)
├── ghost/                 # Ghost animation state management
├── theme/                 # Theme switching and persistence
├── pwa/                   # PWA installation and management
├── infrastructure/        # Event bus, haptics, storage utilities
└── modals/               # Modal state management
```

## Ghost Component System (Core Feature)

### Architecture Principles

- **Unified SVG approach**: Single SVG file with layered elements
- **Hybrid state management**: Global themes (stores) + local animation states
- **Direct element targeting**: Animations target SVG elements via ID selectors
- **Performance optimization**: Hardware acceleration with `will-change`

### Key Implementation Details

- **Ghost Themes**: `mint`, `bubblegum`, `rainbow`, `peach` with gradient backgrounds
- **Animation States**: `IDLE`, `RECORDING`, `PROCESSING`, `ASLEEP`, `WAKE_UP`
- **Eye Tracking**: Mouse tracking with sensitivity controls and smooth transitions
- **Blink System**: Double blinks, drowsy states, wake-up sequences

### Critical Guidelines

- Apply animations directly to SVG elements via ID (`#ghost-shape`)
- Never animate container groups (`.ghost-bg`, `.ghost-layer`)
- Force browser reflow between animations: `void element.offsetWidth`
- Clear timeouts properly to prevent animation conflicts

## Audio & Transcription System

### Audio Configuration

- **Recording Length**: 60 seconds maximum (increased from shorter limits)
- **Full Audio Capture**: Entire audio is captured for transcription (not chunked)
- **Service Integration**: Uses Gemini AI API for transcription
- **Event-Driven**: `transcriptionCompletedEvent` for improved handling

### Key Improvements Made

- Fixed copy-to-clipboard functionality with proper event coordination
- Implemented audio length constants for consistency
- Added permission error handling and visual feedback
- Optimized audio visualizer performance

## Performance Optimizations

### Component Optimizations

- **AnimatedTitle.svelte**: Staggered text animations with hardware acceleration
- **AudioVisualizer.svelte**: Reduced resource intensity, better theme animations
- **AppSuffix.svelte**: Optimized `.app` suffix positioning and responsiveness
- **Ghost Components**: Reduced glow intensity, optimized CSS selectors

### Animation Performance

- Use `will-change` and `backface-visibility: hidden` for smooth animations
- Cubic bezier timing: `cubic-bezier(0.19, 1, 0.22, 1)` for natural feel
- Staggered delays: 50-100ms per letter for text animations
- Hardware acceleration for all transform-based animations

## UI/UX Design Patterns

### Text Animation System

```css
.stagger-letter {
	opacity: 0;
	transform: translateY(15px);
	animation: staggerFadeIn 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards;
	will-change: transform, opacity;
}
```

### Layout Principles

- **Responsive Design**: Mobile-first with progressive enhancement
- **Visual Hierarchy**: Proper spacing ratios and typography scales
- **Theme Integration**: All components respond to theme changes in real-time
- **Accessibility**: Focus rings, keyboard navigation, proper ARIA labels

## Configuration & Dependencies

### Key Dependencies

- **AI Services**: `@google/generative-ai` for transcription
- **Animations**: `canvas-confetti` for celebration effects
- **Development**: Sharp for image processing, ESLint + Prettier for code quality

### Build Configuration

- **Vite Config**: Custom server port 50001
- **PWA Support**: Service worker, manifest, and app icons
- **Lighthouse**: Performance monitoring with LHCI

## Modal System

### Implementation Pattern

- **Consistent Architecture**: `ModalCloseButton` component for unified UX
- **Event Coordination**: Proper timing with Ghost loading states
- **Theme Integration**: All modals inherit current theme styling
- **Accessibility**: ESC key support, focus management

### Modal Types

- **IntroModal**: First visit welcome with Ghost integration
- **SettingsModal**: Theme selection and transcription preferences
- **AboutModal**: App information and credits
- **ExtensionModal**: Chrome extension promotion

## Theme System

### Theme Implementation

- **Storage**: localStorage with `StorageUtils` service
- **Real-time Updates**: All components react to theme changes instantly
- **Gradient Integration**: Dynamic SVG gradients per theme
- **Confetti Colors**: Theme-specific celebration colors

### Available Themes

1. **Mint**: Green gradient with clean aesthetics
2. **Bubblegum**: Pink gradient with playful feel
3. **Rainbow**: Multi-color gradient with vibrant energy
4. **Peach**: Orange gradient with warm tones

## PWA Features

### Installation & Behavior

- **Install Prompts**: Smart detection of installation eligibility
- **Offline Support**: Basic offline page with app branding
- **App Icons**: Multiple sizes with theme-specific variations
- **Splash Screens**: Custom loading screens per platform

## Critical Bug Fixes & Solutions

### Ghost Animation Issues

- **Fixed**: Ghost icons disappearing in modals - replaced PNGs with SVG components
- **Fixed**: Animation conflicts - proper timeout clearing and state management
- **Fixed**: Eye tracking glitches - improved sensitivity and boundary checking

### Layout & Spacing

- **Fixed**: Overscroll bounce on iOS - proper CSS containment
- **Fixed**: Text alignment in transcript box - left alignment with optimal line length
- **Fixed**: Vertical spacing inconsistencies - systematic margin/padding audit

### Performance Issues

- **Fixed**: Memory leaks in resize handlers - proper cleanup
- **Fixed**: Excessive re-renders - idiomatic Svelte reactivity patterns
- **Fixed**: Heavy animation load - hardware acceleration and optimized selectors

## Development Patterns

### Code Organization

- **Component Structure**: Organized by functionality, not file type
- **Service Layer**: Clear separation of concerns with event-driven architecture
- **Utilities**: Shared utilities in `/lib/services/infrastructure/`
- **Documentation**: Comprehensive README files for complex components

### Best Practices Established

- **Svelte Reactivity**: Use reactive declarations and statements properly
- **CSS Architecture**: Scoped styles with global design tokens
- **Event Handling**: Centralized event bus for cross-component communication
- **Error Boundaries**: Graceful degradation and user-friendly error states

## Future Architecture Considerations

### Scalability Notes

- Ghost component system is extensible for new themes and animations
- Audio system can support additional transcription providers
- Modal system supports easy addition of new modal types
- Theme system can accommodate unlimited theme variations

### Performance Monitoring

- Lighthouse CI integrated for performance regression detection
- Animation performance can be monitored via browser dev tools
- Bundle size monitoring recommended for dependency additions

---

_This reference document preserves key architectural decisions, performance optimizations, and bug fixes from the development history. Use this to maintain consistency and avoid re-implementing solved problems._
