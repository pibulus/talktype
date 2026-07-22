# TalkType Next

## Release Baseline

- Current release: `1.0.0` (2026-07-09) — the Fable audit branch (22 commits)
  is merged to `main`: offline tiny model moved to a modern export that
  survives new Chromium, software-GPU guard, distil-small download cut
  665MB→251MB, warm-start + toasts for the offline download, dead-mic nudge,
  sounds/vibration toggle, intro modal redesign, server sad-path hardening.
- `main` is the active release branch.
- After Stop is the default transcription setting.
- Offline Mode is explicit and overrides Live Mode.
- Supporter mode has Square hosted checkout, signed supporter tokens, manually issued code fallback, and Passport-backed notes handoff.

## Recent Stabilization

- Dependency/security cleanup committed.
- Deepgram live streaming repaired and kept available as the Live path.
- Settings now presents Vibe, Transcription Style, then When Text Appears, with After Stop first.
- Offline and live transcription modes separated.
- Recording/offline cleanup hardened.
- `RecordButtonWithTimer` state extracted and tested.
- PWA auto-start, permission messaging, stale Deepgram sockets, repeated stops, and Whisper unload races hardened.
- Supporter checkout, membership card, Passport QR/link import, automatic encrypted current-history/recording mirror, stale audio cleanup, and quiet notes check-in landed.
- Supporter unlock now saves the one visible completed note from that page session, without keeping a hidden free-user history backlog.
- Active recording recovery now keeps an append-only IndexedDB journal for long-note crash/interruption recovery.
- Documentation reorganized into current docs, research, and archive.

## Looks Solid

- `npm test -- --run` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Live transcript display is wired to Deepgram interim/final state.
- Offline Mode avoids cloud transcription when enabled.
- Offline Mode now exposes downloaded, loading percentage, ready, storage persistence, and retry state in Settings and on the main recording button.
- Recording uses the start-time mode through stop/transcription, so mid-recording setting changes cannot leak an Offline recording to cloud. If Whisper is still loading after Offline Mode is switched off, the local load is kept only long enough to finish that start-time Offline recording.
- Installed iOS PWA microphone permission stays on the primary Start Recording flow; Offline Mode handles storage/model prep when enabled.
- Active recording requests Screen Wake Lock when the browser supports it.
- Deepgram live stop trusts clean final live text and can fall back to the best live snapshot if batch fallback is unavailable.
- Free recordings now have layered spend controls: a 5 minute UI cap, server-side duration metadata check, smaller free upload cap, and dedicated `/api/transcribe` plus `/api/deepgram/token` rate buckets.
- Rate limiting keys prefer real client proxy headers before adapter socket addresses, so reverse proxies do not collapse all users into one bucket.
- Styled Gemini transcription falls back to a standard Deepgram transcript when Gemini quota, billing, or key problems would otherwise return a dead error.
- PWA auto-start now waits for nested recording controls to be ready.
- PWA auto-start has a tap-to-start fallback when browser mic startup stalls or needs a gesture.
- Permission-denied messaging handles common browser error shapes.
- Service worker runtime caching skips API, Passport, and sensitive query URLs.
- Service worker model handling no longer duplicates new Hugging Face model files outside the transformers.js browser cache.
- Supporter entitlement requires a signed supporter token in local state.
- Passport storage is simplified: the supporter code is stored on trusted devices and vault hashes are derived on demand.
- QRBuddy-backed Passport QR stamps point to `/passport#code=...&vault=...` for cross-device import and notes check-in.
- Passport has a clear product line: notes can follow the card through a simple encrypted current-state mirror. It is not a separate permanent archive.

## Still Needs Attention

- Real-device installed PWA testing on iPhone and Android.
- Mic permission deny/allow/retry smoke test on physical devices.
- Supporter checkout smoke test against Square sandbox/production config before launch.
- End-to-end Passport smoke test with the Pi drop-zone, QRBuddy, automatic history/recording mirror, delete cleanup, cross-device import, and encrypted audio restore.
- Long-recording recovery stress pass: backgrounding, refresh/crash simulation, phone-call-style interruption, and journal reconstruction.
- Further offline Whisper/ONNX runtime size reduction, if Offline Mode becomes a first-run priority.

## Obvious Next Moves

1. Run a physical iPhone installed-PWA pass: auto-start, mic permission, repeated recordings, Live Mode, interruption recovery.
2. Run a physical Android installed-PWA pass.
3. Run a supporter/Passport pass: Square checkout, card QR, automatic history/recording mirror, local delete cleanup, `/passport` import, notes check-in, history audio playback.
4. Decide whether the current Passport pattern should be copied into ZipList before extracting a shared package.
5. Decide whether the current `0.9.0` build should become `1.0.0` after live use.
