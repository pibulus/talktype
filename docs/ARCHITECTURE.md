# TalkType Architecture

This is the current technical map for TalkType. If the recording, transcription, PWA, or mode-selection behavior changes, update this file first.

## One-Screen Flow

```text
src/routes/+page.svelte
  -> MainContainer
    -> GhostContainer
    -> ContentContainer
      -> AudioToText
        -> RecordingControls
        -> TranscriptDisplay
```

The user-facing flow is:

1. User taps the ghost/button or auto-start requests recording.
2. `RecordingControlsService.startRecording()` clears stale transcript state and asks `AudioService` to start the microphone.
3. `AudioService` requests mic permission, creates a `MediaRecorder`, starts waveform monitoring, and optionally connects Deepgram live streaming.
4. While recording, chunks are stored for batch fallback and sent to Deepgram if Live Mode is active.
5. On stop, `RecordingControlsService.stopRecording()` decides whether to use finalized live text or transcribe the saved audio blob.
6. `TranscriptionService` writes transcript state, clears recovery drafts, and copies successful output.

## Transcription Modes

Mode resolution lives in `src/lib/services/transcription/mode.js`.

| User setting                    | Effective behavior                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Live Mode on, Offline Mode off  | Deepgram live streaming while recording. Standard fallback batch remains available after stop.          |
| Offline Mode on                 | Local Whisper only. Offline Mode disables Live Mode behavior.                                           |
| Live Mode off, Offline Mode off | Cloud batch transcription after stop. Standard style uses Deepgram; alternate/custom styles use Gemini. |

Live Mode defaults to `true` in `src/lib/index.js`. Offline Mode defaults to `false`.

## Live Deepgram Path

Relevant files:

- `src/lib/stores/transcriptionStore.js`
- `src/routes/api/deepgram/token/+server.js`
- `src/lib/services/audio/audioService.js`
- `src/lib/services/audio/recordingControlsService.js`

Flow:

1. Client asks `/api/deepgram/token` for a short-lived Deepgram token.
2. Server uses `DEEPGRAM_API_KEY` to mint the token.
3. Client opens `wss://api.deepgram.com/v1/listen` with model `nova-3`, interim results, smart formatting, endpointing, utterance end, and VAD events.
4. `AudioService` sends `MediaRecorder` chunks every 250ms.
5. `transcriptionStore` keeps final transcript and interim text separate.
6. `AudioToText` renders live text through `TranscriptDisplay`.
7. On stop, `transcriptionStore.finish()` asks Deepgram to finalize. If the result is complete final text, batch transcription is skipped.
8. If the user switched away from Live Mode while recording, the stale live socket is disconnected without waiting for the finalization grace period.

## Batch Cloud Path

Relevant files:

- `src/lib/services/transcription/transcriptionService.js`
- `src/lib/services/transcription/simpleHybridService.js`
- `src/routes/api/transcribe/+server.js`
- `src/lib/server/deepgramService.js`
- `src/lib/server/geminiService.js`

Flow:

1. `TranscriptionService.transcribeAudio()` starts progress UI and delegates to `simpleHybridService`.
2. If Offline Mode is off, `simpleHybridService` posts the recorded blob to `/api/transcribe`.
3. `/api/transcribe` applies auth/rate limiting through `guardRequest()`, validates upload size, and routes by prompt style.
4. `standard` uses Deepgram Nova-3 batch transcription.
5. Alternate and custom prompt styles use Gemini.
6. Gemini uploads are deleted in `finally` after transcription.

## Offline Whisper Path

Relevant files:

- `src/lib/services/transcription/offlineModelController.js`
- `src/lib/services/transcription/simpleHybridService.js`
- `src/lib/services/transcription/whisper/whisperService.js`
- `src/lib/services/transcription/whisper/modelRegistry.js`
- `src/lib/services/transcription/whisper/audioConverter.js`

Flow:

1. Offline Mode enables model loading after first interaction or after the configured delay.
2. `offlineModelController` owns preload/release timing around the Offline Mode store.
3. `simpleHybridService.startBackgroundLoad()` loads Whisper once and unloads if Offline Mode was turned off before the load completed.
4. `simpleHybridService.releaseOfflineModel()` waits for pending loads and re-checks Offline Mode before unloading, so fast off/on toggles do not drop a model the user just asked to keep.
5. `whisperService` loads `@xenova/transformers`, configures WASM, disables WebGPU, requests persistent storage, warms the model, and transcribes converted audio.

Current default model is `tiny` unless `userPreferences.whisperModel` is set.

## Audio Lifecycle

Relevant files:

- `src/lib/services/audio/audioService.js`
- `src/lib/services/audio/audioStates.js`
- `src/lib/services/audio/permissionErrors.js`
- `src/lib/services/audio/recordingRecoveryStore.js`

Important behaviors:

- Permission errors are normalized across browser `DOMException` names/messages.
- `AudioService.stopRecording()` is idempotent while a stop is already in flight.
- Draft recordings are persisted before transcription so failed transcription can be retried.
- iOS installed PWA mode can keep the microphone stream warm briefly after stop to reduce repeated permission/stream churn.
- Cleanup closes Deepgram, cancels waveform animation, stops recorder/streams, and closes the audio context.

## PWA And Auto-Start

Relevant files:

- `src/lib/components/page/MainContainer.svelte`
- `src/lib/services/pwa/pwaService.js`
- `static/manifest.json`
- `src/service-worker.js`

Auto-start is requested from:

- `talktype_auto_record` local storage preference.
- PWA shortcut launches with `?action=record`.

`MainContainer` waits for child component refs and verifies the recording store after start. If the UI tree is not ready yet, it retries rather than assuming success.

## State Ownership

- `src/lib/services/infrastructure/stores.js`: audio, recording, transcription, UI, and supporter preference stores.
- `src/lib/index.js`: local-storage-backed user settings such as theme, auto-record, prompt style, Live Mode, and Offline Mode.
- `src/lib/stores/transcriptionStore.js`: live Deepgram socket state.
- `whisperStatus`: public status for local Whisper loading/loaded state.

## Current Risk Areas

- Real-device iOS installed PWA microphone behavior still needs physical-device smoke testing.
- The offline Whisper/ONNX path creates a large production chunk.
- Payment automation is not wired; supporter code issuing is manual.
- Netlify config exists, but the active adapter is currently `@sveltejs/adapter-node`.
