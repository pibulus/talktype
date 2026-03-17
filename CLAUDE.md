# CLAUDE.md - TalkType Technical Documentation

## What Is TalkType

A **progressive, offline-first voice-to-text PWA** built with SvelteKit. The ghost mascot makes it delightful.

- **Instant start**: Gemini API for online transcription, Whisper ONNX for offline
- **Progressive quality**: Invisible model upgrades from tiny -> optimal
- **Distil-Whisper models**: 6x faster, 50% smaller than regular Whisper
- **Multi-language Pro mode**: 9+ languages with one toggle
- **One-time $9 unlock**: No subscription — premium features are already shipped, payment flips a boolean

## Build & Development

```bash
npm run dev        # Dev server with Vite HMR
npm run build      # Production build (Netlify adapter)
npm run preview    # Preview production build
npm run format     # Prettier (svelte + tailwind plugins)
npm run lint       # ESLint + Prettier checks
```

## Project Structure

```
src/
  routes/              # SvelteKit pages + API endpoints
    +page.svelte       # Main app page
    api/
      transcribe/      # Gemini transcription endpoint
      purchase-premium/# Premium unlock endpoint
  lib/
    components/
      audio/           # RecordingControls, AudioVisualizer, TranscriptDisplay
      ghost/           # Ghost SVG character (themes, eye tracking, animations)
      page/            # MainContainer, GhostContainer, ContentContainer, Footer
      modals/          # AboutModal, ExtensionModal, IntroModal, AuthModal
      premium/         # PremiumUnlockModal
      history/         # TranscriptHistoryModal
      layout/          # PageLayout wrapper
      ui/              # AppSuffix, shared UI bits
      pwa/             # PwaInstallPrompt
    services/          # Business logic (see services/README.md)
    stores/            # Additional Svelte stores (pwa.js)
    utils/             # Logger, performance utils, scroll utils
    constants/         # App-wide constants (STORAGE_KEYS, ANIMATION, etc.)
    server/            # Server-only code (Gemini API, storage adapters)
```

## Code Style

- **Framework**: SvelteKit with Svelte 4 (reactive `$:` blocks, `createEventDispatcher`)
- **Language**: Standard JS (not TypeScript), JSConfig for minimal type checking
- **CSS**: Tailwind CSS + DaisyUI components
- **Naming**: camelCase variables, PascalCase components
- **Logging**: Use `createLogger(tag)` from `$lib/utils/logger` — silenced in production
- **Browser guards**: Use `browser` from `$app/environment` (not `typeof window`)
- **Error handling**: `console.error` for production errors; `log.log()` for dev-only info
- **Tab size**: 2 spaces, Prettier on save, 100 char max width

## Architecture Quick Reference

### Transcription Flow

```
Record button -> RecordingControlsService -> AudioService (MediaRecorder)
Stop button   -> AudioService.stop() -> audioBlob
              -> SimpleHybridService.transcribe(audioBlob)
                 -> Online: Gemini API (/api/transcribe endpoint)
                 -> Offline/Privacy: Whisper (local ONNX via @xenova/transformers)
              -> stores.transcriptionText updated -> TranscriptDisplay renders
```

### State Management

All UI state lives in `services/infrastructure/stores.js` as Svelte writable/derived stores:
- `isRecording`, `recordingDuration` — recording state
- `transcriptionText`, `transcriptionProgress` — transcription output
- `errorMessage`, `hasPermissionError` — error state
- `userPreferences` — theme, prompt style, privacy mode

### Whisper Model Tiers

| Tier | Model | Size | When |
|------|-------|------|------|
| Tiny | distil-tiny | 20MB | Loads invisibly in background |
| Small | distil-small | 83MB | <3GB device RAM |
| Medium | distil-medium | 166MB | >=3GB device RAM (default) |
| Large | distil-large-v3 | 750MB | Pro mode (9+ languages) |

### Ghost Component

SVG-based mascot with personality — see `components/ghost/README.md`:
- 4 themes: peach, mint, bubblegum, rainbow
- States: idle (breathing), recording (wobble), processing (pulse), wake-up (blink)
- Eye tracking follows cursor

## Key Patterns

- **Services as singletons**: `export const fooService = new FooService()`
- **Progressive loading**: Models download in background, never block UI
- **Hybrid transcription**: Online-first with automatic offline fallback
- **Privacy mode**: Skips Gemini entirely, Whisper-only
- **PWA install prompt**: Shows after 5 transcriptions
- **Premium "DLC on disc"**: All pro features ship to everyone, $9 unlocks them instantly

## Important Context

- **The Ghost Wobbles**: When recording — intentional and delightful
- **Progressive Enhancement**: Quality improves invisibly — never make users wait
- **Joy-First Design**: If it's not fun, we're doing it wrong
- **iOS quirks**: Safari needs special MediaRecorder/AudioContext handling (see audioService.js)
- **Deployment**: Netlify with `@sveltejs/adapter-netlify`
