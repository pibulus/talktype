# Whisper Offline Snapshot

This is the current local transcription path. The broader flow is documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## Trigger Path

- Offline Mode is stored as `talktype_privacy_mode`.
- When Offline Mode is `true`, `resolveTranscriptionMode()` disables Live Mode behavior.
- `offlineModelController.start()` watches Offline Mode and starts model loading after first interaction or the configured delay.
- Turning Offline Mode off calls `simpleHybridService.releaseOfflineModel()`.

## Runtime

- Implementation: `src/lib/services/transcription/whisper/whisperService.js`.
- Library: `@xenova/transformers` (`^2.17.2` in `package.json`).
- Current default model: `tiny`, resolving to `Xenova/whisper-tiny.en`.
- Runtime backend: WASM only, single-threaded, with the ONNX Runtime WASM binary self-hosted through Vite instead of the transformers.js CDN default.
- Browser caching: transformers.js browser Cache API storage is enabled. The service worker no longer writes a second copy of new Hugging Face model files; it only serves legacy `whisper-models-v1` hits so transformers.js can migrate them into `transformers-cache`.
- The current execution provider is WASM; WebGPU is not requested for Offline Mode.
- Persistent storage is requested with `navigator.storage.persist()` when available.
- A short silent warm-up inference runs after model load.

## User Feedback

- `whisperStatus` now separates downloaded cache state from loaded memory state:
  - `isCached`: the selected model has a large model file in `transformers-cache` or the legacy model cache.
  - `isLoaded`: the model is currently loaded into memory and warmed.
  - `isLoading`: the library/model is being checked, downloaded, prepared, or warmed.
- transformers.js `progress_callback` events are normalized across `initiate`, `download`, `progress`, `done`, and `ready`.
- Settings shows `Not downloaded`, `Downloaded`, `Ready`, percentage loading, or retry state.
- The main recording button receives the same progress/status text while Offline Mode is loading.
- Cache clearing deletes Cache API entries for `transformers-cache` and the legacy model cache, with an IndexedDB delete retained as a harmless compatibility cleanup.

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
- Offline Mode still needs microphone access. The model can be cached and ready locally, but recording audio remains controlled by browser/OS mic permission.
- Persistent storage lowers eviction risk but browsers can still clear data if the user removes site data, uses private browsing, or the browser denies persistence.
