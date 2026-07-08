# FABLE-HANDOFF — remaining work, written to be executed

Audience: a coding model (or future session) picking up after the
`fable-audit-2026-07-05` branch, plus Pablo for the human-only items.
Context: `docs/FABLE-AUDIT.md` has the full audit history. Everything on the
branch is committed, lint/tests/build green (186 tests).

Ground rules for the executor:

- Work on a branch off `fable-audit-2026-07-05` (or off main after Pablo merges).
- After EVERY task: `npm run lint && npm test -- --run && npm run build` must be green.
- Never deploy, never push to a remote, never touch `~/.config/fleet` or systemd.
- Verification commands assume dev server: `npm run dev` (port 5173).

---

## TASK 1 — Offline Whisper on bleeding-edge Chromium — ✅ DONE 2026-07-09

Resolved via option 2 (option 1 is a dead end: 4.2.0 IS the latest transformers
and pins the same 1.26.0-dev ort). Tiny now sources
`onnx-community/whisper-tiny.en` with dtype `q4` (~96MB). Empirical results:
q8 from onnx-community hits the SAME "Missing required scale" error — the old
DequantizeLinear q8 layout is the problem regardless of repo; q4 (MatMulNBits
native) loads and transcribes perfectly on the bleeding-edge build. Both e2e
gates GREEN, cached reload verified. Bonus fixes from the same session:
`probeWebGPU` now rejects software adapters (SwiftShader reports
isFallbackAdapter — headless Chromium ~143 exposes one, loads distil-small at
slower-than-realtime speed), whisperService probes before ANY webgpu load so
even manual 'small' selection falls back to tiny, startup warms the model from
cache when Offline Mode is already on (never downloads), controller fires
ready/failed toasts, and stale Xenova cache bytes get purged once.

### Original task (for history)

### Status quo (verified 2026-07-06, don't re-derive)

- Offline Mode WORKS end-to-end on current-release browsers. Verified live:
  model download with honest progress → WebGPU failure → clean fallback to
  tiny+WASM → load success. The self-hosted `/onnx/*` files serve, the
  `configureTransformersEnv` wasmPaths apply, CSP now allows the loader's
  `blob:` import (fixed in commit `d30d3df`).
- On NEWEST Chromium (playwright 1.60 bundled build ≈ Chrome ~143),
  session creation fails on the quantized tiny model:
  `Can't create a session. ERROR_CODE: 1 ... TransposeDQWeightsForMatMulNBits
Missing required scale: model.decoder.embed_tokens.weight_merged_0_scale`.
  This reproduces with BOTH the asyncify and jspi WASM variants, with JSPI
  hidden (`delete WebAssembly.Suspending`), and with CSP fixed — it is the
  bundled onnxruntime-web `1.26.0-dev.20260416` build rejecting the old
  Xenova q8 quantization layout, not a loading problem. Do NOT retry those
  dead ends; they are exhausted.

### Repro (exact)

```bash
npm run dev &
PW_PATH=$(npm root -g)/playwright/index.mjs node tests/e2e/offline-whisper.mjs
# currently: ❌ 'Missing required scale ... DequantizeLinear' on chromium-1228
```

### Fix options, in preference order

1. **Upgrade `@huggingface/transformers`** to the latest 4.x (check what inner
   `onnxruntime-web` it pins — you want a STABLE ort, not a `-dev` build).
   Then `npm run sync:onnx` (re-copies the matching WASM files into
   `static/onnx/` — this MUST be rerun with any transformers/ort bump), and
   check whether `configureTransformersEnv`'s hardcoded
   `ort-wasm-simd-threaded.asyncify.*` filenames still match what the new ort
   requests (watch the network tab / probe script below).
2. If the upgrade is disruptive: **switch the tiny model source** in
   `src/lib/services/transcription/whisper/modelRegistry.js` from
   `Xenova/whisper-tiny.en` (2023 q8 quantization) to
   `onnx-community/whisper-tiny.en` with an explicit modern dtype (`q4` or
   `fp32`), matching how `distil-small` is already sourced from
   onnx-community. The distil-small files did NOT hit the session error.

### Acceptance

- `node tests/e2e/offline-whisper.mjs` GREEN with global playwright (the
  bleeding-edge build) — this is the gate that catches it.
- `node tests/e2e/webgpu-fallback.mjs` GREEN too (note: this script may have
  the same dead `localStorage.setItem('userPreferences', ...)` seam that
  offline-whisper.mjs had — the app has no such key; the real seam is
  `talktype_webgpu_disabled` via `page.addInitScript`. Check and fix it the
  same way, see commit `d30d3df`).
- Cached-model reload still works (second run of the gate is much faster).
- A network probe script exists from the diagnosis if needed — pattern: log
  `page.on('request')` for `/onnx|ort-|blob:/` and call
  `globalThis.__ttWhisper.service.preloadModel()` (dev-only seam).

---

> **STATUS 2026-07-09: Tasks 2–5 all DONE** (commits `13ce9be`…`59bb0e8`).
> Task 2: "Sounds & Vibration" toggle in Settings, wired at the service layer
> via `talktype_sound_enabled`. Task 3: dead-mic nudge in AudioVisualizer
> (real frames only, once per silent stretch). Task 4: all four cleanups
> (formData 400, `estimateDurationSecondsFromBlob`, isRecording delegate,
> isFirstVisit unexport). Task 5: webgpu-fallback gate GREEN (no dead seam —
> it drives the real store import); it also gained `TT_HEADED=1` for real-GPU
> runs, which verified distil-small q4 on Metal (desktop download 665→251MB;
> the old "200MB" label was wrong, fp32 was really ~665MB).
> Remaining manual acceptance: record with the OS-level mic muted → one toast
> after ~8s; toggle sounds off → silent clicks, survives reload.
> Only the PABLO-ONLY section below is still open.

## TASK 2 — Sound/haptic mute toggle (Settings)

There is NO user preference gating sounds/haptics today —
`soundService.setEnabled()` and `hapticService.setEnabled()` exist but are
never called from app code. UI clicks always beep.

- Add a persisted preference (localStorage key `talktype_sound_enabled`,
  default `'true'`) following the existing pattern in `src/lib/index.js`
  (see `autoRecord` / `liveMode` — `createLocalStorageStore`).
- Wire it: on startup and on change, call `soundService.setEnabled(v)`
  (`src/lib/services/infrastructure/soundService.js`) and
  `hapticService.setEnabled(v)` (`hapticService.js` — check the exact
  setter names before calling).
- Add a toggle in `src/lib/components/Settings.svelte` near the vibe/theme
  section — copy the visual pattern of an existing toggle there. Label it by
  outcome ("Sounds & vibration"), not implementation.
- Acceptance: toggle off → theme/style clicks are silent, record start/stop
  makes no sound and no vibration; survives reload; tests/lint/build green.

## TASK 3 — "Can't hear you?" nudge (dead-mic detection)

The visualizer now shows honest low bars when the mic hears silence, but
nothing TELLS the user. In `src/lib/components/audio/AudioVisualizer.svelte`
the animation callback already computes the real level each processed frame:

- Track consecutive processed frames where `dataArray` is a real array AND
  computed level < 2 while recording. After ~8 seconds (≈160 processed
  frames at the current cadence), fire ONE toast per recording session:
  `window.dispatchEvent(new CustomEvent('talktype:toast', { detail: { type:
'info', message: "Can't hear you — check your mic?" } }))`.
- Reset the counter (and the once-flag) when level rises or recording ends.
- Do NOT fire when `dataArray === null` (analyser blind ≠ mic silent).
- Acceptance: manual — record with mic muted at OS level → toast once after
  ~8s; normal speech → never fires. Lint/tests/build green.

## TASK 4 — small cleanups (batch in one commit)

1. `src/routes/api/transcribe/+server.js`: wrap the `formData()` parse so a
   malformed multipart body returns a 400 with a friendly message instead of
   falling through to the generic 500 (mirror the JSON-parse 400 pattern in
   `src/routes/api/validate-code/+server.js`).
2. Duration heuristic `audioBlob.size / 2000` appears in
   `recordingControlsService.js` (~line 182) and twice in `audioService.js`
   (~lines 538, 694). Extract `estimateDurationSecondsFromBlob(blob)` into
   `src/lib/services/audio/` and use it in all three places. Pure refactor —
   no behavior change.
3. `src/lib/services/audio/audioService.js` `isRecording()` reimplements
   `audioStates.js`'s `stateManager.isRecording()` — delegate instead.
4. `src/lib/services/first-visit/firstVisitService.js` exports an
   `isFirstVisit` store nothing imports (the ghost's `isFirstVisit` is an
   unrelated local). Safe to unexport (keep internal usage), or leave with a
   comment — verify with a grep before touching.

## TASK 5 — run the second e2e gate

`tests/e2e/webgpu-fallback.mjs` was not run during the audit. Run it
(same `PW_PATH` invocation), fix the dead-seam issue if present (Task 1
acceptance describes it), and record the result. If it exposes new fallback
bugs, the fallback logic lives in `whisperService._loadModel`'s catch block.

---

## PABLO-ONLY (no model can do these)

1. **`SUPPORTER_LICENSE_SECRET`** — set an explicit value in
   `/etc/talktype.env` via the fleet flow (edit `~/.config/fleet/keys.env`
   `TALKTYPE_EXTRA_ENV`, then `keys-sync talktype` → `key-doctor`). Today the
   supporter-token signing falls back to `API_COOKIE_SECRET`/`API_AUTH_TOKEN`,
   collapsing two trust domains onto one secret.
2. **Real-device installed-PWA pass** (iPhone + Android): mic permission
   deny/allow/retry, repeated recordings, Live Mode, interruption (incoming
   call), backgrounding mid-recording, and — new this audit — confirm the
   waveform tracks your real voice on iOS and drops when muted.
3. **Square sandbox checkout end-to-end** in a real browser: card → webhook →
   success page → Passport unlock, same-tab. The endpoints are hardened; only
   a live run proves the config.
4. **Passport/Pi mirror smoke**: checkout → card QR → `/passport` import on a
   second device → notes check-in → audio restore.
5. **Merge decision**: `fable-audit-2026-07-05` has 15 commits, all local.
   Review, merge to main, deploy via the normal `deploy:pi` flow. Post-deploy,
   verify `https://talktype.app/onnx/ort-wasm-simd-threaded.asyncify.wasm`
   returns 200 (known deploy gotcha), and that Offline Mode downloads on the
   live site.

## Verification quick-reference

```bash
npm run lint && npm test -- --run && npm run build          # must all pass
npm run dev                                                  # port 5173
PW_PATH=$(npm root -g)/playwright/index.mjs node tests/e2e/offline-whisper.mjs
PW_PATH=$(npm root -g)/playwright/index.mjs node tests/e2e/webgpu-fallback.mjs
```
