# Glossary - TalkType

## Components (Svelte)
- `MainContainer` - Top-level container with recording state (lib/components/page/MainContainer.svelte)
- `GhostContainer` - Ghost character with personality (lib/components/page/GhostContainer.svelte)
- `ContentContainer` - Main content wrapper (lib/components/page/ContentContainer.svelte)
- `AnimatedTitle` - Staggered text animation title (lib/components/page/AnimatedTitle.svelte)
- `FooterComponent` - App footer (lib/components/page/FooterComponent.svelte)
- `PageLayout` - Base page layout (lib/components/layout/PageLayout.svelte)
- `IntroModal` - First-visit intro modal (lib/components/modals/IntroModal.svelte)
- `ThemeSelector` - Ghost theme picker (lib/components/settings/ThemeSelector.svelte)
- `TranscriptionModeSelector` - Mode selection (instant/progressive) (lib/components/settings/TranscriptionModeSelector.svelte)
- `TranscriptionStyleSelector` - Style selection (lib/components/settings/TranscriptionStyleSelector.svelte)
- `CustomPromptInput` - Custom transcription prompts (lib/components/settings/CustomPromptInput.svelte)
- `ModelStorageInspector` - View cached models (lib/components/settings/ModelStorageInspector.svelte)
- `KeyboardShortcuts` - Keyboard shortcuts panel (lib/components/settings/KeyboardShortcuts.svelte)
- `KeyboardShortcutsInfo` - Shortcuts info display (lib/components/settings/KeyboardShortcutsInfo.svelte)
- `PwaSettings` - PWA config (lib/components/settings/PwaSettings.svelte)
- `QuickFeatures` - Quick feature toggles (lib/components/settings/QuickFeatures.svelte)
- `SupportSection` - Support/help section (lib/components/settings/SupportSection.svelte)
- `Confetti` - Celebration confetti effect (lib/components/ui/effects/Confetti.svelte)
- `AppBadge` - App branding badge (lib/components/ui/AppBadge.svelte)
- `AppSuffix` - App suffix branding (lib/components/ui/AppSuffix.svelte)

## Services
- Progressive transcription with Distil-Whisper models (lib/services/)
- Web Speech API for instant start (lib/services/)
- PWA install prompt logic (lib/services/)
- Ghost theme management (lib/services/)

## Core Concepts
- **Progressive Transcription** - Three layers: Web Speech (instant) → distil-tiny (20MB) → distil-small/medium (auto-selected by RAM)
- **Distil-Whisper** - 6x faster, 50% smaller than regular Whisper
- **Pro Mode** - distil-large-v3 (750MB, 9+ languages)
- **WebGPU Ready** - 10-100x speed boost when available
- **Ghost Personality** - 4 themes (peach/mint/bubblegum/rainbow), reactive animations
- **Offline-First** - All models run locally after download
- **PWA** - Install prompt after 5 transcriptions, full offline support
- **Mobile Optimized** - iOS safe areas, 44px touch targets, viewport locking
