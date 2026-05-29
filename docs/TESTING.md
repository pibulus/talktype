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
- Active recording recovery journal flushes and journal sequence behavior.
- Permission error classification.
- Record button timer/progress helper logic.
- Service initialization idempotency.
- Supporter license crypto, payment store behavior, Square provider request shaping, and supporter code validation.
- Passport QR URL construction and QRBuddy render URL generation.
- Passport local storage migration and vault hash cleanup.
- Encrypted notes mirror/check-in, stale audio cleanup, transcript import/replacement, smart tags, and audio media manifest helpers.

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
- Square hosted checkout return flow and webhook-backed license creation.
- Membership card QR import on a second device.
- Passport notes check-in against the Pi drop-zone, including encrypted audio history and delete cleanup.
- Long recording recovery on mobile after backgrounding, refresh, and interruption.

## Manual Smoke Pass

For a release candidate:

1. Run `npm test -- --run`, `npm run lint`, and `npm run build`.
2. Start the app with `npm run dev`.
3. Test After Stop default on desktop: start, speak, verify text appears after stop.
4. Test Offline Mode: toggle on, let model load, record, stop, verify no cloud request is needed.
5. Toggle Offline Mode off and Live Mode on between recordings.
6. Rapidly start/stop several recordings.
7. Deny microphone permission, reload, allow permission, and retry.
8. Record a longer note, background the app, refresh or interrupt it, and verify the recovery card can restore usable audio/text.
9. Unlock supporter mode through Square sandbox or a manual code.
10. Save a supporter transcript with a Passport and notes endpoint configured, then verify text and attached audio mirror to the Pi drop-zone.
11. Scan/click the Passport QR on another device and verify `/passport` imports the Passport and notes appear.
12. Verify a restored history item can play its encrypted audio when the source history item had a recording.
13. Delete the source history item locally, run/observe the next mirror, and verify the other device no longer includes that item or stale audio after check-in.
14. Install to iPhone/Android home screen and test auto-record plus mic permission flow.

## Known Gaps

- No Playwright suite yet.
- No automated real microphone tests.
- No automated visual regression tests.
- Real installed-PWA iOS behavior still requires physical-device testing.
- No automated browser-level Passport/QR/Square end-to-end flow yet.
