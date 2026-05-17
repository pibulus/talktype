# Whisper Offline Snapshot

This is the current local transcription path. The broader flow is documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## Trigger Path

- Offline Mode is stored as `talktype_privacy_mode`.
- When Offline Mode is `true`, `resolveTranscriptionMode()` disables Live Mode behavior.
- `offlineModelController.start()` watches Offline Mode and starts model loading after first interaction or the configured delay.
- Turning Offline Mode off calls `simpleHybridService.releaseOfflineModel()`.

## Runtime

- Implementation: `src/lib/services/transcription/whisper/whisperService.js`.
- Library: `@xenova/transformers`.
- Current default model: `tiny`, resolving to `Xenova/whisper-tiny.en`.
- Runtime backend: WASM only.
- Browser caching: transformers.js browser cache and IndexedDB are enabled.
- WebGPU is explicitly disabled in current code.
- Persistent storage is requested with `navigator.storage.persist()` when available.
- A short silent warm-up inference runs after model load.

## Toggle Safety

The model load/release path is intentionally conservative:

- Repeated load calls share `whisperLoadPromise`.
- If Offline Mode is turned off before a load resolves, the model unloads after load completes.
- If Offline Mode is turned off and then back on before release completes, release re-checks the current mode and keeps the model loaded.

## Transcription Path

1. `TranscriptionService.transcribeAudio()` delegates to `simpleHybridService`.
2. If Offline Mode is enabled and Whisper is ready, the blob goes to `whisperService.transcribeAudio()`.
3. If Whisper is still loading, transcription waits for the pending load.
4. The blob is converted to raw audio with `audioConverter.js`.
5. Whisper runs greedy transcription with no timestamps.
6. Empty or invalid audio returns a user-facing error rather than falling back to cloud.

## Known Tradeoffs

- The ONNX/WASM path contributes a large production chunk.
- Real mobile performance varies by device memory and browser.
- Offline Mode is privacy-first, not fastest-path-first.
