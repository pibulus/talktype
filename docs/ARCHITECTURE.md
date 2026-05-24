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
4. While recording, chunks are stored for batch fallback, periodically checkpointed into local recovery storage, and sent to Deepgram if Live Mode is active.
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
5. Alternate output style presets use Gemini.
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
- Active recordings keep an append-only local recovery journal in IndexedDB. `MediaRecorder` chunks are buffered into small journal blobs every few seconds, with immediate flushes on stop, visibility loss, cleanup, or recorder errors.
- Recovery journal metadata also stores the latest live Deepgram transcript snapshot when Live Mode is active, so a failed long note can retain both recoverable audio and the best partial text TalkType had seen.
- If `MediaRecorder` stops unexpectedly before the user presses stop, TalkType saves the available chunks as an interrupted recovery draft and surfaces the retry card.
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

The service worker precaches normal app/static assets, caches Whisper model downloads in `whisper-models-v1`, and keeps large ONNX runtime WASM files in `runtime-v1` so they are not part of install-time precache and can survive app cache version changes.

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
- `vault-server.js`

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
11. Supporter status unlocks local transcript history/export, output style presets, and the longer recording limit.
12. Completed transcripts are only saved to IndexedDB when `userPreferences.isSupporter` is true. Saved history entries get a few local smart tags for lightweight filtering; this does not call an external tagging API.
13. Batch `/api/transcribe` verifies the signed supporter token before enabling server-side style presets, Deepgram diarization, or Deepgram paragraph formatting.

Square is isolated to the payment provider layer. Feature gates consume supporter entitlement state and do not know which payment provider created it.

Checkout and license data use the server storage adapter. For `adapter-node`, prefer `TALKTYPE_STORAGE_ADAPTER=filesystem` with a durable `TALKTYPE_DATA_DIR`. Use `netlify-blobs` only when deploying on Netlify. `memory` is for local throwaway tests only.

Passport is the user-facing shape; Vault is the backstage encrypted transport. TalkType treats the Vault as a current-state mirror and handoff helper, not a live multi-device workspace or a separate permanent archive. Supporter transcripts trigger best-effort current-history mirroring when this device already has a Passport code and notes endpoint. On app open, history open, and `/passport` import, `checkPassportNotes()` quietly compares local and remote timestamps: remote newer pulls down as the current mirror, local newer pushes up. TalkType remembers the supporter code locally as the device's Passport key after checkout/redeem so this can run without repeated prompts, and derives the vault hash from that code only when needed. Passport/Vault localStorage keys follow the `pibulus:talktype:*` convention with migration from older `talktype_*` keys. The membership card asks QRBuddy to render a QR image whose payload points straight back to TalkType `/passport#code=...&vault=...`; QRBuddy/Pi are treated as trusted Pablo-owned infrastructure for this flow. The client helpers encrypt JSON payloads before upload, and audio history is encrypted/restored as separate media payloads under the `app-media` namespace with an encrypted `app-media-index` manifest. When local history no longer references an audio blob, the next mirror pass asks the Vault to delete that stale encrypted media. The standalone `vault-server.js` stores and deletes encrypted blobs by app name and vault hash.

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
- Netlify config exists, but the active adapter is currently `@sveltejs/adapter-node`.
