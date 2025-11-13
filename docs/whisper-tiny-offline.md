# Whisper Tiny Offline Snapshot

## Trigger Path
- Privacy Mode toggle (`localStorage[STORAGE_KEYS.PRIVACY_MODE] === 'true'`) forces the hybrid service into offline mode.
- `simpleHybridService.startBackgroundLoad()` preloads Whisper when privacy mode is true and the device is detected as desktop.
- Once `whisperStatus.isLoaded` flips true, every call flows through `whisperService.transcribeAudio()`.

## Model Selection + Runtime
- Default `userPreferences.whisperModel` is `tiny`; `modelRegistry` maps it to `Xenova/whisper-tiny.en` (117 MB English-only INT8 build) and sets it as the always-on fallback.
- `whisperService.preloadModel()` pins `env.useIndexedDB`/`env.useBrowserCache` so the tiny ONNX stays in persistent storage.
- Device detection uses `checkWebGPUSupport()` to pick WebGPU (preferred) or WASM backends; dtype is fp32/q4 on GPU and q8 on WASM.
- Transcription options clamp generation to greedy (beam_size 1, temperature 0) and skip timestamps/language detection for English tiny.

## Known Instability
- Current repro: first two recordings succeed, third returns `{ text: '' }` even though audio validation/metrics look healthy (5.44s, 0.7 peak, 0.044 avg).
- Logs show WebGPU execution, clean tensor stats, but empty decoder output without thrown errors, suggesting cached decoder state or ONNX session reuse issues after multiple runs.
- Hard refresh + cache clear (IndexedDB) temporarily restores behavior—points toward stale session buffers rather than audio conversion.

_Recorded Oct 2025 to give the next LLM context on how Whisper Tiny is wired into privacy mode and why we're debugging blank outputs._
