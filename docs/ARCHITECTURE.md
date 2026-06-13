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
2. `RecordingControlsService.startRecording()` clears stale transcript state, snapshots the effective transcription mode for this recording, and asks `AudioService` to start the microphone.
3. `AudioService` requests mic permission, creates a `MediaRecorder`, starts waveform monitoring, and optionally connects Deepgram live streaming from that start-time mode snapshot.
4. While recording, chunks are stored for batch fallback, periodically checkpointed into local recovery storage, and sent to Deepgram only if Live Mode was active when the recording started.
5. On stop, `RecordingControlsService.stopRecording()` decides whether to use finalized live text or transcribe the saved audio blob.
6. `TranscriptionService` writes transcript state, clears recovery drafts, and tries to copy successful output. If the browser blocks silent auto-copy, UI state marks the transcript copy button as needing a tap instead of showing an error.

## Transcription Modes

Mode resolution lives in `src/lib/services/transcription/mode.js`.

| User setting                    | Effective behavior                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Live Mode on, Offline Mode off  | Deepgram live streaming while recording. Standard fallback batch remains available after stop.          |
| Offline Mode on                 | Local Whisper only. Offline Mode disables Live Mode behavior.                                           |
| Live Mode off, Offline Mode off | Cloud batch transcription after stop. Standard style uses Deepgram; alternate/custom styles use Gemini. |

After Stop is the default text timing in `src/lib/index.js`: Live Mode and Offline Mode both default to `false`. Offline Mode still wins if a legacy storage conflict has both Offline and Live enabled.

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
7. On stop, `transcriptionStore.finish()` sends Deepgram `Finalize`, waits specifically for a `from_finalize` acknowledgement with a timeout fallback, then closes the stream.
8. Batch transcription is skipped only when the live result has acknowledged finalization, has final text, and has no trailing interim text.
9. The start-time recording mode is used through stop/transcription. If a recording began Offline, changing settings before stop cannot route that blob to cloud transcription.

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
3. `/api/transcribe` applies auth/rate limiting through `guardRequest()` plus a transcription-specific rate bucket, validates upload size/duration limits, and routes by prompt style.
4. `standard` uses Deepgram Nova-3 batch transcription.
5. Alternate output style presets use Gemini.
6. If Gemini is unavailable because of quota, billing, or key problems, `/api/transcribe` falls back to a standard Deepgram transcript and returns fallback metadata.
7. Gemini uploads are deleted in `finally` after transcription.

Limits and spend controls:

- Free recordings are capped in the UI at `ANIMATION.RECORDING.FREE_LIMIT` seconds and the client sends the completed duration to `/api/transcribe`.
- `/api/transcribe` rejects free batch uploads above `FREE_RECORDING_LIMIT_SECONDS` plus a short grace window, applies a smaller free upload cap, and fail-fast rejects clearly oversized `Content-Length` values before multipart parsing. Defaults: 5 minutes, 10 MB free uploads, 50 MB supporter/server max uploads.
- Endpoint defaults can be tuned with `FREE_RECORDING_LIMIT_SECONDS`, `FREE_MAX_UPLOAD_BYTES`, `MAX_UPLOAD_BYTES`, `TRANSCRIBE_RATE_LIMIT`, and `TRANSCRIBE_RATE_WINDOW_MS`.
- `/api/deepgram/token` is separately rate-limited with `DEEPGRAM_TOKEN_RATE_LIMIT` and `DEEPGRAM_TOKEN_RATE_WINDOW_MS` so Live Mode token minting cannot bypass the batch transcription bucket. Default: 12 token mints per 10 minutes per client.
- The generic API guard still uses `API_RATE_LIMIT` and `API_RATE_WINDOW_MS`; endpoint buckets are layered on top and keyed separately.

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
5. A recording that began in Offline Mode keeps that start-time mode through stop. If the user switches Offline Mode off while Whisper is still loading, the pending load is kept long enough to transcribe that recording locally, then released if Offline Mode is still off.
6. `whisperService` loads `@xenova/transformers`, points ONNX Runtime at the locally emitted WASM assets, forces single-threaded WASM, uses the WASM execution provider, requests persistent storage, checks Cache API model state, warms the model, and transcribes converted audio.
7. `whisperStatus` exposes separate downloaded/cache, loading, loaded, progress, storage persistence, and retry/error state for Settings and the main recording button.

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
- Active recordings keep an append-only local recovery journal in IndexedDB. `MediaRecorder` chunks are buffered into small journal blobs every few seconds, with immediate flushes on stop, visibility loss, cleanup, or recorder errors.
- Recovery journal metadata also stores the latest live Deepgram transcript snapshot when Live Mode is active, so a failed long note can retain both recoverable audio and the best partial text TalkType had seen.
- If `MediaRecorder` stops unexpectedly before the user presses stop, TalkType saves the available chunks as an interrupted recovery draft and surfaces the retry card.
- iOS installed PWA mode can keep the microphone stream warm briefly after stop to reduce repeated permission/stream churn.
- Active recordings request Screen Wake Lock when supported so the display is less likely to sleep mid-note. The lock is released on stop, cleanup, or browser release.
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

If a browser blocks or stalls the first automatic microphone start, `MainContainer` treats auto-start as armed rather than failed: it suppresses the first automatic-start warning, shows a touch-sized `tap to start` prompt, and retries on the next pointer gesture or Enter/Space activation. If that user-initiated retry still fails, the normal microphone permission messaging is allowed through.

Installed iOS PWAs use the same primary Start Recording flow for microphone permission as Safari. Offline Mode handles its own persistent-storage request and Whisper model cache preparation when that mode is enabled, with progress surfaced in Settings and on the recording button.

The service worker precaches normal app/static assets and keeps large ONNX runtime WASM files in `runtime-v1` so they are not part of install-time precache and can survive app cache version changes. Transformers.js owns the active Whisper model cache; the service worker only serves legacy model-cache hits once for migration. Runtime caching bypasses `/api/`, `/passport`, and sensitive query URLs so temporary Deepgram tokens, checkout claims, supporter tokens, and Passport links are not stored by the PWA cache.

## Supporter Mode

Relevant files:

- `src/lib/components/modals/SupporterModal.svelte`
- `src/routes/api/supporter/checkout/+server.js`
- `src/routes/api/supporter/checkout/[checkoutId]/+server.js`
- `src/routes/api/supporter/redeem/+server.js`
- `src/routes/api/square/webhook/+server.js`
- `src/routes/supporter/success/+page.svelte`
- `src/lib/server/payments/squareProvider.js`
- `src/lib/server/payments/paymentStore.js`
- `src/lib/server/supporter/licenseStore.js`
- `src/lib/server/supporter/licenseCrypto.js`
- `src/lib/server/storage/index.js`
- `src/routes/api/validate-code/+server.js`
- `src/lib/server/supporterCodes.js`
- `src/lib/services/infrastructure/stores.js`
- `src/lib/components/page/MainContainer.svelte`
- `src/lib/components/settings/TranscriptionStyleSelector.svelte`
- `src/lib/services/storage/transcriptStorage.js`
- `src/lib/services/syncService.js`
- `src/lib/services/encryptionService.js`

Flow:

1. Settings, History, or locked transcription styles can open `SupporterModal`.
2. The modal can start Square hosted checkout through `/api/supporter/checkout`.
3. The server creates a provider-neutral checkout record and asks Square `CreatePaymentLink` for a hosted checkout URL.
4. The browser stores a short-lived checkout claim token in `sessionStorage` and redirects to Square.
5. Square redirects back to `/supporter/success?checkout_id=...`.
6. The success page polls `/api/supporter/checkout/[checkoutId]` with the claim token.
7. Square independently calls `/api/square/webhook`; the server validates the raw-body HMAC signature before trusting it.
8. A completed Square payment marks the checkout paid and creates a supporter license.
9. The success page receives the supporter code plus a signed supporter token, calls `setSupporterStatus(true, token)`, and shows the code for other devices.
10. Existing manually issued codes still redeem through `/api/supporter/redeem` as a fallback.
11. Supporter status unlocks local transcript history/export, output style presets, and the longer recording limit. Local supporter state requires a signed supporter token unless `PUBLIC_FORCE_SUPPORTER_MODE=true`.
12. Completed transcripts are only saved to IndexedDB when `userPreferences.isSupporter` is true. If a free user unlocks while a completed transcript is still visible in the current page session, TalkType saves that one visible note into history after Passport check-in. It does not build a hidden pre-supporter backlog.
13. Batch `/api/transcribe` verifies the signed supporter token before enabling server-side style presets, Deepgram diarization, or Deepgram paragraph formatting.

Square is isolated to the payment provider layer. Feature gates consume supporter entitlement state and do not know which payment provider created it.

Checkout and license data use the server storage adapter. The active deployment uses `@sveltejs/adapter-node`; prefer `TALKTYPE_STORAGE_ADAPTER=filesystem` with a durable `TALKTYPE_DATA_DIR`. `netlify-blobs` remains available only as an explicit storage adapter option. `memory` is for local throwaway tests only.

Passport is the user-facing shape; Vault is the backstage encrypted transport. TalkType treats the Vault as a current-state mirror and handoff helper, not a live multi-device workspace or a separate permanent archive. Supporter transcripts trigger best-effort current-history mirroring when this device already has a Passport code and notes endpoint. On app open, history open, and `/passport` import, `checkPassportNotes()` quietly compares local and remote timestamps: remote newer pulls down as the current mirror, local newer pushes up. TalkType remembers the supporter code locally as the device's Passport key after checkout/redeem so this can run without repeated prompts, and derives the vault hash from that code only when needed. Passport/Vault localStorage keys follow the `pibulus:talktype:*` convention with migration from older `talktype_*` keys. The membership card asks QRBuddy to render a QR image whose payload points straight back to TalkType `/passport#code=...&vault=...`; QRBuddy/Pi are treated as trusted Pablo-owned infrastructure for this flow. The client helpers encrypt JSON payloads before upload, and audio history is encrypted/restored as separate media payloads under the `app-media` namespace with an encrypted `app-media-index` manifest. When local history no longer references an audio blob, the next mirror pass asks the Vault to delete that stale encrypted media.

## State Ownership

- `src/lib/services/infrastructure/stores.js`: audio, recording, transcription, UI, and supporter preference stores.
- `src/lib/index.js`: local-storage-backed user settings such as theme, auto-record, prompt style, Live Mode, and Offline Mode.
- `src/lib/stores/transcriptionStore.js`: live Deepgram socket state.
- `whisperStatus`: public status for local Whisper loading/loaded state.

## Current Risk Areas

- Real-device iOS installed PWA microphone behavior still needs physical-device smoke testing.
- Long-recording recovery needs stress testing on lower-end phones, especially backgrounding/interruption and journal reconstruction.
- The offline Whisper/ONNX path still depends on a large runtime WASM asset.
- Square checkout is wired, but sandbox/production payment configuration still needs an end-to-end launch smoke test.
- Passport check-in is intentionally simple timestamp-based mirroring, not conflict-heavy collaborative sync.
