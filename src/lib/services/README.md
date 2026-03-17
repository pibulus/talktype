# TalkType Services

The service layer handles all business logic, state management, and external API interactions. Components consume services via Svelte stores and direct method calls.

## Directory Map

```
services/
  index.js                  # Barrel exports + initializeServices()
  modalService.js           # Modal open/close with scroll-lock
  geminiService.js          # Client-side Gemini API wrapper
  promptManager.js          # Active prompt style selection
  promptTemplates.js        # Prompt templates per transcription style
  apiSession.js             # API session token management
  analytics.js              # Privacy-first analytics events
  authModalService.js       # Auth modal trigger service

  audio/
    audioService.js          # MediaRecorder lifecycle, mic access, iOS handling
    audioStates.js           # Audio state machine constants (IDLE, RECORDING, etc.)
    recordingControlsService.js  # Orchestrates record/stop/transcribe flow
    recordingRecoveryStore.js    # IndexedDB draft storage for crash recovery

  transcription/
    transcriptionService.js  # Clipboard, text processing, copy/share
    simpleHybridService.js   # Hybrid engine: Gemini API online + Whisper offline
    deviceCapabilities.js    # RAM/GPU detection for model selection
    whisper/
      whisperService.js      # ONNX Whisper model loading & transcription
      modelRegistry.js       # Model configs (tiny/small/medium/large)
      audioConverter.js      # Audio format conversion for Whisper
    vad/
      sileroVAD.js           # Voice Activity Detection (Silero model)

  infrastructure/
    stores.js                # Central Svelte stores (audio, recording, transcription, UI)
    eventBus.js              # Pub/sub for decoupled service communication
    hapticService.js         # Mobile vibration feedback
    storageUtils.js          # localStorage get/set with type coercion
    animationState.js        # App visibility tracking for animation pause/resume

  premium/
    premiumService.js        # Premium unlock state (one-time $9 purchase)

  pwa/
    pwaService.js            # PWA install prompt timing & state

  storage/
    transcriptStorage.js     # IndexedDB transcript history (premium feature)

  first-visit/
    firstVisitService.js     # First-visit intro modal trigger

  effects/
    confettiService.js       # Celebration confetti on premium unlock
```

## Architecture

### Data Flow

```
User clicks Record
  -> RecordingControlsService.startRecording()
    -> AudioService.startRecording() (MediaRecorder)
    -> Stores update (isRecording = true)

User clicks Stop
  -> RecordingControlsService.stopRecording()
    -> AudioService.stopRecording() -> audioBlob
    -> SimpleHybridService.transcribe(audioBlob)
      -> Online? Gemini API
      -> Offline/Privacy? Whisper (local ONNX model)
    -> Stores update (transcriptionText = result)
```

### Key Patterns

- **Stores as state**: All UI-facing state lives in `infrastructure/stores.js` as Svelte writable/derived stores
- **Services as singletons**: Each service exports a singleton instance (e.g., `export const audioService = new AudioService()`)
- **Progressive loading**: Whisper models load in background (tiny -> target), never blocking the UI
- **Hybrid transcription**: Online-first (Gemini API) with automatic offline fallback (Whisper)
- **Privacy mode**: When enabled, skips Gemini entirely and uses only local Whisper models
