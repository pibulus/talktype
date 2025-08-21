# CLAUDE.md - TalkType Technical Documentation

## 🚀 What Makes TalkType Special

TalkType isn't just another transcription app - it's a **progressive, offline-first voice-to-text PWA** with:

- **Instant start**: Web Speech API for 0ms latency
- **Progressive quality**: Invisible upgrades from tiny → optimal models
- **Distil-Whisper models**: 6x faster, 50% smaller than regular Whisper
- **Multi-language Pro mode**: 9+ languages with one toggle
- **Delightful ghost personality**: Not just a tool, but a companion
- **No subscription BS**: One-time $9 unlock vs competitors' $10+/month

## 📦 Progressive Transcription Architecture

### Three-Layer System

1. **Instant Layer**: Web Speech API (0ms start, online-only)
2. **Tiny Layer**: 20MB distil-tiny loads invisibly (2-3s)
3. **Target Layer**: Auto-selected based on device RAM:
   - <3GB RAM: distil-small (83MB)
   - ≥3GB RAM: distil-medium (166MB)
   - Pro mode: distil-large-v3 (750MB, 9+ languages)

### Key Features

- **WebGPU Ready**: 10-100x speed boost when available
- **Offline-first**: All models run locally after download
- **Smart caching**: Models persist across sessions
- **Progressive enhancement**: Quality improves invisibly

## Build & Development

- `npm run dev` - Start development server with Vite HMR
- `npm run build` - Production build with optimizations
- `npm run preview` - Preview production build locally
- `npm run format` - Run Prettier formatter
- `npm run lint` - ESLint + Prettier checks
- `npm run lighthouse` - Performance audit

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

## Ghost Component System

The Ghost component is the heart of TalkType's personality:

### Key Features

- **Reactive theming**: 4 themes (peach, mint, bubblegum, rainbow)
- **State animations**: Wobbles when recording, blinks periodically
- **SVG-based**: Scalable, performant, delightful
- **Eye tracking**: Follows cursor subtly

### Animation States

- **Idle**: Gentle breathing effect
- **Recording**: Wobble animation
- **Processing**: Pulse effect
- **Wake up**: Special blink sequence

For detailed implementation, see `/src/lib/components/ghost/README.md`

## PWA & Mobile Optimizations

### PWA Features

- **Install prompt**: Shows after 5 transcriptions
- **Offline support**: Full functionality with cached models
- **App icons**: Custom ghost icons for all platforms
- **Service worker**: Caches all assets and models

### Mobile Optimizations

- **iOS safe areas**: Handles notched devices
- **Touch targets**: 44px minimum (iOS HIG)
- **Scroll behavior**: Prevents rubber-banding
- **Viewport locking**: App-like experience
- **Font scaling**: Prevents zoom on input focus

## Current Feature Status

### ✅ Completed

- Progressive transcription with Distil-Whisper models
- PWA with offline support and install prompt
- Mobile optimizations (iOS safe areas, touch targets)
- Ghost personality with themes and animations
- Auto-record on startup option
- Clean architecture (removed 881 lines of dead code)
- Hyperspeed downloads with parallel chunks
- WebGPU detection and optimization ready

### 🎯 Ready to Ship ($9 Unlock)

- Save transcript history
- Export transcripts
- Custom filename builder
- Pro language mode (9+ languages)

## Performance Metrics

- **Initial Load**: <2s with tiny model
- **Transcription Start**: Instant (Web Speech) or 2-3s (Whisper)
- **Lighthouse Score**: 85+ target
- **Bundle Size**: Optimized with Vite
- **PWA Score**: Full compliance

## Important Project Context

- **Branch Strategy**: `main` for stable, `feat/hyperspeed-downloads` has latest transcription work
- **The Ghost Wobbles**: When recording - this is intentional and delightful
- **Progressive Enhancement**: Quality improves invisibly - never make users wait
- **Joy-First Design**: If it's not fun, we're doing it wrong
- **Business Model**: $9 one-time unlock > subscription vampire model
- **Competition**: We're not the most powerful, we're the most delightful

## Editor Configuration

- Default branch: main
- Code width: 80 characters preferred, 100 max
- Tab size: 2 spaces
- Format on save: Yes (Prettier)

## 💰 Payment Model & Marketing Philosophy

### "DLC Already on Disc" Approach

// The entire Pro feature set is already built and deployed to every user
// Payment ($9 one-time) simply flips a boolean to unlock features
// This approach provides several benefits:

- **Zero latency unlock**: Features activate instantly upon payment
- **Try before buy**: Users can experience the free tier fully
- **No server dependency**: Payment validation happens once, features work forever
- **Ethical pricing**: One-time $9 unlock vs competitors' $10+/month subscriptions

### Key Marketing Points

// These differentiators make TalkType compelling vs competition:

- **100% Private**: Everything stays on device, we never see or store transcripts
- **Zero setup**: Works instantly in browser, no API keys or accounts needed
- **Smart model selection**: Automatically picks optimal model for your device
- **Progressive quality**: Starts with instant Web Speech, invisibly upgrades to Whisper
- **Lifetime value**: $9 once, maintained forever with latest models
- **Multi-language Pro**: Unlock 99 languages with specialized models
- **Competitor comparison**: SuperWhisper charges $10/month for similar features

### Technical Advantages for Marketing

// These can be simplified for user-facing copy:

- **Distil-Whisper models**: 6x faster, 50% smaller than regular Whisper
- **WebGPU ready**: 10-100x speed improvements when browsers enable it
- **Progressive transcription**: Web Speech → Tiny → Optimal model pipeline
- **Device-aware**: Automatically adjusts to available memory/compute
- **PWA installable**: Works like native app on phones and desktops
