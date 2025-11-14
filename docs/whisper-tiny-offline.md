# Whisper Tiny Offline Snapshot

## Trigger Path

- Privacy Mode toggle (`localStorage[STORAGE_KEYS.PRIVACY_MODE] === 'true'`) forces the hybrid service into offline mode on desktop clients.
- `simpleHybridService.startBackgroundLoad()` kicks off the WASM preload and keeps `whisperLoadPromise` cleared once the attempt resolves so repeated toggles stay responsive.
- Once `whisperStatus.isLoaded` flips true, every recording sends audio into `whisperService.transcribeAudio()`.

## Model Selection + Runtime

- Default `userPreferences.whisperModel` is `tiny`; `modelRegistry` resolves it to `Xenova/whisper-tiny.en` (117 MB English-only INT8 build) and keeps it as the single offline choice.
- Transformers.js is configured for WASM only: `env.useIndexedDB` + `env.useBrowserCache` are always on, `env.backends.onnx.wasm.numThreads` is tuned to 4/thread cap, and the WebGPU path is explicitly disabled so the model never loads on that backend.
- After the pipeline loads we run a 0.25 s silent warm-up inference to prime the kernels (`WhisperService.#warmupTranscriber()`), which keeps the next real transcription fast.
- Persistent storage is requested via `navigator.storage.persist()` so the ONNX cache and saved recording drafts survive longer in browsers.
- Transcription options land on greedy decode (beam_size 1, temperature 0, no timestamps); every inference takes a Float32Array directly.

## Recovery Flow

- Every completed recording now stores its blob plus the converted Float32Array in `talktype-recordings.pending-recordings`. `TranscriptionService.restorePendingRecordingDraft()` runs when services initialize so the UI always knows if a draft exists.
- `RecordingStatus` surfaces a retry card with duration + “saved x ago” info whenever `transcriptionState.pendingRecording` is populated, letting users retry without re-pressing the record button.
- `TranscriptionService.retryPendingRecording()` prefers the cached Float32Array; if not available it falls back to reusing the blob, keeping retries instant and avoiding extra decoding work.
- Gemini API calls are serialized through `simpleHybridService.geminiQueue`, so clicks that happen in rapid succession wait their turn instead of flooding `/api/transcribe`.

_Recorded Oct 2025 to give the next LLM context on how Whisper Tiny is wired into privacy mode and why we're debugging blank outputs._
