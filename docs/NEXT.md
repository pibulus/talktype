# TalkType Next

## Release Baseline

- Current release target: `0.9.0`.
- `main` is the active release branch.
- Live Mode is the default transcription setting.
- Offline Mode is explicit and overrides Live Mode.
- Supporter mode has Square hosted checkout, signed supporter tokens, manually issued code fallback, and Passport/Vault sync.

## Recent Stabilization

- Dependency/security cleanup committed.
- Deepgram live streaming repaired and made the default path.
- Offline and live transcription modes separated.
- Recording/offline cleanup hardened.
- `RecordButtonWithTimer` state extracted and tested.
- PWA auto-start, permission messaging, stale Deepgram sockets, repeated stops, and Whisper unload races hardened.
- Supporter checkout, membership card, Passport QR/link import, encrypted Vault backup/restore, and optional encrypted audio history landed.
- Active recording recovery now keeps an append-only IndexedDB journal for long-note crash/interruption recovery.
- Documentation reorganized into current docs, research, and archive.

## Looks Solid

- `npm test -- --run` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Live transcript display is wired to Deepgram interim/final state.
- Offline Mode avoids cloud transcription when enabled.
- PWA auto-start now waits for nested recording controls to be ready.
- Permission-denied messaging handles common browser error shapes.
- Passport storage is simplified: the supporter code is stored on trusted devices and vault hashes are derived on demand.
- QRBuddy-backed Passport QR stamps point to `/passport#code=...&vault=...` for cross-device import and Vault restore.

## Still Needs Attention

- Real-device installed PWA testing on iPhone and Android.
- Mic permission deny/allow/retry smoke test on physical devices.
- Supporter checkout smoke test against Square sandbox/production config before launch.
- End-to-end Vault smoke test with the Pi drop-zone, QRBuddy, encrypted text restore, and encrypted audio restore.
- Long-recording recovery stress pass: backgrounding, refresh/crash simulation, phone-call-style interruption, and journal reconstruction.
- Further offline Whisper/ONNX runtime size reduction, if Offline Mode becomes a first-run priority.
- Confirm deployment target versus current `@sveltejs/adapter-node` setup.

## Obvious Next Moves

1. Run a physical iPhone installed-PWA pass: auto-start, mic permission, repeated recordings, Live Mode, interruption recovery.
2. Run a physical Android installed-PWA pass.
3. Run a supporter/Vault pass: Square checkout, card QR, `/passport` import, Vault backup, Vault restore, history audio playback.
4. Decide whether the current Passport pattern should be copied into ZipList before extracting a shared package.
5. Decide whether the current `0.9.0` build should become `1.0.0` after live use.
