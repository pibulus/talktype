# TalkType Next

Release baseline:
- Current release target: `0.9.0`
- `main` now points at the supporter-gated build with `PUBLIC_FORCE_SUPPORTER_MODE` support and Gemini aligned to `gemini-3.1-flash-lite-preview`

What looks solid:
- Build passes
- Supporter mode wiring is in place
- Mobile/modal polish is materially better than before
- Server-side Gemini config now matches ZipList

What still wants attention:
- Payment automation is still missing. Unlock is code-based, not purchase-webhook-based.
- `npm run lint` still has repo-wide Prettier drift and should get a cleanup pass before a true `1.0.0`.
- There is still a large ONNX chunk warning in build output. Not a blocker, but worth reducing.
- Real-device PWA/install/autorecord testing on iPhone and Android still matters more than desktop confidence.

Obvious next moves:
- Test installed PWA flow on phone, including microphone permission and auto-record behavior
- Decide whether TalkType goes `1.0.0` after a few days of live use
- Replace manual supporter code ops with a real payment -> code delivery flow
