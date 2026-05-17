# TalkType Next

## Release Baseline

- Current release target: `0.9.0`.
- `main` is the active release branch.
- Live Mode is the default transcription setting.
- Offline Mode is explicit and overrides Live Mode.
- Supporter mode exists, but purchase automation is not wired yet.

## Recent Stabilization

- Dependency/security cleanup committed.
- Deepgram live streaming repaired and made the default path.
- Offline and live transcription modes separated.
- Recording/offline cleanup hardened.
- `RecordButtonWithTimer` state extracted and tested.
- PWA auto-start, permission messaging, stale Deepgram sockets, repeated stops, and Whisper unload races hardened.
- Documentation reorganized into current docs, research, and archive.

## Looks Solid

- `npm test -- --run` passes.
- `npm run lint` passes.
- `npm run build` passes, with the known offline Whisper chunk warning.
- Live transcript display is wired to Deepgram interim/final state.
- Offline Mode avoids cloud transcription when enabled.
- PWA auto-start now waits for nested recording controls to be ready.
- Permission-denied messaging handles common browser error shapes.

## Still Needs Attention

- Real-device installed PWA testing on iPhone and Android.
- Mic permission deny/allow/retry smoke test on physical devices.
- Payment automation for supporter mode.
- Build chunk reduction for the offline Whisper/ONNX runtime.
- Confirm deployment target versus current `@sveltejs/adapter-node` setup.

## Obvious Next Moves

1. Run a physical iPhone installed-PWA pass: auto-start, mic permission, repeated recordings, Live Mode.
2. Run a physical Android installed-PWA pass.
3. Decide whether the current `0.9.0` build should become `1.0.0` after live use.
4. Replace manual supporter code issuing with a real payment-to-code flow.
