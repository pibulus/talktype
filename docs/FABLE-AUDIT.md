# Fable Audit — 2026-07-05

Branch: `fable-audit-2026-07-05` (from `main` @ `e281e1f`). Pablo's WIP Toast SSR guard was
stashed (`fable-audit-safepoint WIP`, left intact as a safety net), re-applied, and folded
into the toast commit.

Method: four parallel read-only audits (core pipeline, server API, UI chaos pass,
dead-code/docs) + my own verification of every finding before fixing. All fixes verified by
lint + 186 tests + production build + an in-browser smoke of the app and toast layer.

---

## Production-breaking (was broken on main, fixed here)

1. **Offline Mode was completely dead.** `whisperService._loadModel()` read `device`/`dtype`
   eight lines before their `let` declarations — a temporal-dead-zone `ReferenceError` on
   _every_ model load, surfaced to users as a generic "failed to load". Regressed in the
   progress-bar rewrite (`55a5f3a`). One-line reorder; also added the ESLint rule
   (`no-use-before-define`, variables-only) that catches this class at lint time.

2. **Every toast crashed its animation.** `Toast.svelte` passed a cubic-bezier _array_ as
   `easing`; Svelte 5 calls `easing(t)`, so each fly transition threw a `TypeError`. Came in
   with the fresh "missing toast renderer" commit (`e281e1f`) — i.e. the toast layer never
   actually worked. Swapped for `quintOut` (same curve). Also: an unknown `type` on one
   toast event no longer kills the whole toast stack (coerced to `info`). Verified
   in-browser: success/error/bogus-type/no-type all render.

3. **Rate limiting was trivially bypassable.** The client key took the _leftmost_
   `X-Forwarded-For` entry — client-controlled. A loop spoofing a random header per request
   got a fresh bucket every call and could hammer `/api/transcribe` (paid Deepgram/Gemini)
   and `/api/deepgram/token` unmetered. Now uses the _rightmost_ entry (written by the
   Pi's own reverse proxy), keys clamped to 64 chars, and the in-process rate-limit Map is
   capped at 10k entries (oldest-evicted) so key floods can't grow memory unbounded.
   Test updated + explicit spoof-resistance test added.

4. **`npm run lint` was failing on main** (NEXT.md claimed it passed). Seven files had
   prettier drift, which also meant ESLint never ran and was hiding real errors. All green
   now.

## Payment-path hardening (should-fix, fixed here)

- **Square webhook**: storage/license failures while processing a _paid_ order now log the
  order id and return a deliberate 500 so Square retries until the license store is
  writable — previously an uncaught throw with accidental retry semantics and no
  domain log line. (The claim-poll endpoint also mints the license, so either path can
  complete a stuck purchase.)
- **Claim polling** (`/api/supporter/checkout/[checkoutId]`): storage hiccups now return the
  app's friendly-error contract instead of a bare SvelteKit 500 — this is the moment a
  paying customer is actively watching.
- **Checkout in Safari private mode**: if the claim token can't be stored, TalkType now
  refuses to redirect to Square with a clear message — previously the user could pay and
  then have no way to receive their code.
- Timing-safe comparison for manual supporter codes; malformed JSON to
  `validate-code`/`redeem` is now a 400, not a 500.

## Core-job resilience (fixed here)

- **`pagehide` recovery flush**: the recovery journal flushed every ~5s and on
  `visibilitychange`, but hard tab-close/back-nav on mobile doesn't reliably fire
  `visibilitychange`. `pagehide` now triggers a final journal flush with recorder data
  request — closes the "lost the last 5 seconds" gap.
- **Stale style guard**: a stored transcription style that no longer exists would 400 on
  every batch transcription; now sanitized to `standard` at send time.
- Storage-blocked browsers can't silently drop a finished transcript from the history
  pipeline (guarded `localStorage` read in the completion handler).
- Pasting into the transcript editor / history edit box is capped at 50k chars (real
  transcripts are never truncated).
- Rapid ghost-taps during startup can no longer stack retry timers.
- A suspended AudioContext (iOS gesture rules) now logs a warning — recording works but the
  waveform reads zeros, which was previously undiagnosable from user reports.

## Cleanup

- **Deleted the dead client prompt layer** (`geminiService.js`, `promptManager.js`,
  `promptTemplates.js`, ~200 lines): prompts are applied server-side; the client layer had
  become write-only duplication (same value written to the same localStorage key up to four
  times via two parallel systems). Call sites in Settings, TranscriptionStyleSelector, and
  MainContainer simplified.
- Remaining unconditional client `console.log`s routed through the dev-only logger
  (Deepgram connect, Whisper load/ready/clip logs, haptic). Server-side operational logs
  kept deliberately — that's Pi journald observability.
- Docs de-lied: README claimed Live Mode is the default (it's After Stop), named the wrong
  transformers package (`@xenova` → `@huggingface` v4), and documented a Gemini model
  default that the code rewrites away as stale. `docs/whisper-tiny-offline.md` updated for
  the adaptive WebGPU/distil-small reality.

## Deliberately left (ranked by how much I'd care)

1. **Supporter token secret fallback** (`licenseCrypto.js`): falls back
   `SUPPORTER_LICENSE_SECRET` → `API_COOKIE_SECRET` → `API_AUTH_TOKEN`. Not exploitable by
   itself, but it collapses two trust domains onto one secret. Fix is an env change, not
   code: set an explicit `SUPPORTER_LICENSE_SECRET` in `/etc/talktype.env` via the fleet
   tooling before launch. I didn't touch it — key handling is fleet-system territory.
2. **Record button mash feedback**: the service-level `toggleInFlight` guard makes mashing
   safe, but ignored taps give no visual feedback (only an aria-live message). A UX call,
   not a bug — left for Pablo.
3. **"Offline mode needs one more try"** narrow window: hitting record in the moment
   between enabling Offline Mode and the load promise attaching throws a retryable error
   instead of waiting. Rare, recoverable (draft is saved), and the "wait for a possibly
   minutes-long model download" alternative is worse. Left.
4. Nits, all harmless: duration estimated as `blob.size / 2000` in three places (would go
   stale together if the bitrate constant changes); `audioStates.isRecording()` duplicated
   in `AudioService`; multipart parse failures on `/api/transcribe` return the generic 500
   instead of a 400.

## Verified-good (audited, no action needed)

Webhook HMAC (timing-safe, URL-bound), license mint race handling (deterministic IDs — no
double-mint between webhook and claim-poll), modal service re-entrancy (Escape/backdrop/
close mashing all converge on one guarded path), history delete confirm pattern, empty
states, extension zip exists in `static/downloads/`, no `{@html}` on user content, no
secrets in logs or responses.

## Still on Pablo (can't be done from this chair)

- Real-device installed-PWA pass (iPhone + Android): mic permission, repeated recordings,
  interruption recovery. This remains the #1 unknown, as NEXT.md already says.
- Square **sandbox checkout end-to-end** in a real browser (card → webhook → Passport
  unlock). The code paths are hardened, but only a live run proves the config.
- Passport/Pi mirror end-to-end smoke.

## Results

- `npm run lint` ✅ (was failing on main)
- `npm test -- --run` ✅ 186/186 (was 185; +1 spoof-resistance test)
- `npm run build` ✅ (known large ONNX chunk warning, expected)
- In-browser smoke ✅ (app boot, toast layer incl. malformed events, supporter success sad
  path, key routes 200)
