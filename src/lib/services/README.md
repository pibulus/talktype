# TalkType Service Layer

This directory holds the runtime service layer. For the full system map, see [../../../docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md).

## Main Services

- `audio/audioService.js`: microphone permission, `MediaRecorder`, audio chunks, waveform data, iOS warm stream, cleanup.
- `audio/recordingControlsService.js`: start/stop orchestration, time limits, Deepgram finalization, batch fallback, analytics, UI messages.
- `transcription/transcriptionService.js`: transcript progress state, retry of saved recordings, copy/share helpers.
- `transcription/simpleHybridService.js`: chooses Offline Whisper or cloud batch transcription.
- `transcription/offlineModelController.js`: controls when the offline Whisper model preloads and unloads.
- `pwa/pwaService.js`: install prompt state, installed detection, transcription count.
- `first-visit/firstVisitService.js`: intro modal gating.
- `modals/modalService.js`: dialog lifecycle helpers.
- `infrastructure/stores.js`: shared audio, recording, transcription, UI, and preference stores.

## External Transcription Boundaries

- Live Deepgram state is in `src/lib/stores/transcriptionStore.js`.
- Batch Deepgram server calls are in `src/lib/server/deepgramService.js`.
- Gemini server calls are in `src/lib/server/geminiService.js`.
- API routes live under `src/routes/api/`.

## Current Flow

```text
RecordingControls.svelte
  -> RecordingControlsService
    -> AudioService
    -> transcriptionStore when Live Mode is active
    -> TranscriptionService when batch/offline transcription is needed
      -> simpleHybridService
        -> Whisper locally when Offline Mode is on
        -> /api/transcribe when Offline Mode is off
```

## Notes

- `eventBus` still exists for compatibility and infrastructure, but the current app relies mostly on Svelte stores and direct service calls.
- `initializeServices()` is idempotent and restores pending recording drafts once per browser session.
- Offline Mode overrides Live Mode.
- Service tests should focus on state transitions, async races, and cleanup behavior rather than component rendering.
