# TalkType Project Notes

This file is the short technical orientation for agents working in this repo. The canonical system map is [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Product Intent

TalkType is a focused voice-to-text utility with a playful ghost UI. It should feel immediate, friendly, and low-friction:

- Tap the ghost or recording button.
- Speak.
- See live text when Live Mode is on.
- Get a clean transcript after stop.
- Copy, save, or export when supporter features are available.

Do not turn this into a complex dashboard. The interface should keep transcription as the first-screen job.

## Current Transcription Model

The old Web Speech -> tiny -> target progressive architecture is no longer the current implementation.

The active model is:

1. **Live Mode default**: Deepgram realtime WebSocket via `src/lib/stores/transcriptionStore.js`.
2. **Batch cloud fallback**: Deepgram Nova-3 via `src/routes/api/transcribe/+server.js` and `src/lib/server/deepgramService.js`.
3. **Styled/custom path**: Gemini via `src/lib/server/geminiService.js`.
4. **Offline Mode**: local Whisper via `src/lib/services/transcription/whisper/whisperService.js`.

Offline Mode overrides Live Mode. If both values are found in legacy storage, startup repairs the conflict in `src/lib/index.js`.

## Key Entry Points

- `src/routes/+page.svelte`: app route entry, renders `MainContainer`.
- `src/lib/components/page/MainContainer.svelte`: top-level UI orchestration, PWA auto-start, dialogs, ghost events.
- `src/lib/components/audio/AudioToText.svelte`: audio/transcript feature shell.
- `src/lib/components/audio/RecordingControls.svelte`: button/timer/visual feedback wrapper.
- `src/lib/services/audio/audioService.js`: microphone, `MediaRecorder`, waveform, iOS warm-stream handling.
- `src/lib/services/audio/recordingControlsService.js`: start/stop orchestration and transcript handoff.
- `src/lib/services/transcription/simpleHybridService.js`: decides Offline Whisper vs cloud batch.
- `src/lib/stores/transcriptionStore.js`: Deepgram live socket and streaming transcript state.

## Build And Checks

```bash
npm run dev
npm test -- --run
npm run lint
npm run build
```

Known build warning: the offline Whisper/ONNX runtime chunk is large. It is expected right now.

## Design Constraints

- Keep controls touch-friendly and mobile-first.
- Keep the ghost personality visible and responsive.
- Avoid exposing transcription complexity in the main UI.
- Settings/options should describe user outcomes, not implementation internals.
- Live transcript display must remain readable while recording and editable only when not recording/transcribing.

## Documentation Rules

- Update [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) when transcription, recording, or PWA flows change.
- Update [docs/NEXT.md](docs/NEXT.md) when release status or next moves change.
- Move historical session notes to `docs/archive/`.
- Move future feature investigations to `docs/research/`.
