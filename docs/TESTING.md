# TalkType Testing

TalkType uses focused Vitest coverage around the risky service and state edges. The app still needs real-device PWA smoke testing for iOS/Android microphone behavior.

## Commands

```bash
npm test -- --run
npm run test:watch
npm run test:ui
npm run test:coverage
npm run lint
npm run build
```

## Current Test Focus

Unit tests cover:

- Deepgram live URL/transcript helpers.
- transcription mode resolution.
- Offline model preload/release behavior.
- Whisper release races when Offline Mode is toggled quickly.
- Recording controls time-limit behavior.
- Deepgram/offline mode switching during stop.
- Service-level repeated `MediaRecorder.stop()` calls.
- Permission error classification.
- Record button timer/progress helper logic.
- Service initialization idempotency.

## What Belongs In Unit Tests

- Pure helpers.
- Store/mode resolution.
- Service orchestration with mocked dependencies.
- Async race conditions around recording, stopping, live sockets, and model loading.
- Error classification and user-facing fallback messages.

## What Needs Browser Or Device Testing

- Live microphone permission prompts.
- Installed PWA auto-start.
- iOS warm microphone stream behavior.
- Visual transcript updates while speaking.
- Keyboard/touch interactions.
- Clipboard behavior.
- Install prompts and launch shortcuts.

## Manual Smoke Pass

For a release candidate:

1. Run `npm test -- --run`, `npm run lint`, and `npm run build`.
2. Start the app with `npm run dev`.
3. Test Live Mode default on desktop: start, speak, verify live text appears, stop, verify final transcript remains.
4. Test Offline Mode: toggle on, let model load, record, stop, verify no cloud request is needed.
5. Toggle Offline Mode off and Live Mode on between recordings.
6. Rapidly start/stop several recordings.
7. Deny microphone permission, reload, allow permission, and retry.
8. Install to iPhone/Android home screen and test auto-record plus mic permission flow.

## Known Gaps

- No Playwright suite yet.
- No automated real microphone tests.
- No automated visual regression tests.
- Real installed-PWA iOS behavior still requires physical-device testing.
