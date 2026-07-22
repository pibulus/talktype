# TalkType Service Layer

This directory holds the runtime service layer. For the full system map, see [../../../docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md).

## Main Services

- `audio/audioService.js`: microphone permission, `MediaRecorder`, audio chunks, waveform data, iOS warm stream, cleanup.
- `audio/recordingRecoveryStore.js`: IndexedDB recovery drafts and append-only active recording journal chunks.
- `audio/recordingControlsService.js`: start/stop orchestration, time limits, Deepgram finalization, batch fallback, UI messages.
- `transcription/transcriptionService.js`: transcript progress state, retry of saved recordings, copy/share helpers.
- `transcription/simpleHybridService.js`: chooses Offline Whisper or cloud batch transcription.
- `transcription/offlineModelController.js`: controls when the offline Whisper model loads and unloads.
- `storage/transcriptStorage.js`: supporter transcript history, tags, and audio references in IndexedDB.
- `storage/vaultAutoBackup.js`: best-effort current-history mirror after supporter history changes when Vault is configured.
- `storage/vaultTranscriptBackup.js`: encrypted Vault mirror/restore orchestration for history, audio, and stale media cleanup.
- `vaultHashStorage.js`: trusted-device Passport code storage and legacy key cleanup.
- `syncService.js`: app-name-based encrypted Vault JSON/audio transport helpers.
- `encryptionService.js`: AES-GCM/PBKDF2 encryption helpers for JSON and Blob payloads.
- `qrHandshakeService.js`: Passport import URL and QRBuddy render URL helpers.
- `pwa/pwaService.js`: install prompt state, installed detection, transcription count.
- `first-visit/firstVisitService.js`: intro modal gating.
- `modals/modalService.js`: dialog lifecycle helpers.
- `infrastructure/soundService.js`: tiny portable WebAudio cue engine; use `createSoundService()` and `play('select')`/`play('copy')` in future apps, with TalkType-specific adapters kept as convenience methods.
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

- `initializeServices()` is idempotent and restores pending recording drafts once per browser session.
- Offline Mode overrides Live Mode.
- The supporter code is the Passport key on trusted devices; vault hashes are derived on demand rather than cached.
- Vault helpers accept an `appName`, but the current Passport route and card UI are TalkType-specific.
- Service tests should focus on state transitions, async races, and cleanup behavior rather than component rendering.
