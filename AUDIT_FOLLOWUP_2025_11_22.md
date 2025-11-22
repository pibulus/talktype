# TalkType Cleanup Launchpad — Nov 22, 2025

Use this as a ready-to-run checklist for the next cleanup sprint. Each section explains the problem, how to reproduce it, and the preferred fix.

---

## 1. Auth Modal Build Break
- **Symptom:** `AuthModal.svelte` references `<ModalCloseButton>` but never imports it. Svelte/Vite throws `ModalCloseButton is not defined` as soon as the modal renders.
- **Repro:** `npm run dev`, trigger an API call (transcription/animation) when `API_AUTH_TOKEN` is set → bundler error.
- **Fix:** Import `ModalCloseButton` from `$lib/components/modals/ModalCloseButton.svelte` at the top of `AuthModal.svelte`.
- **Follow-up:** Consider making the modal default-closed (`modal-open` is hardcoded right now) so it can mount without auto-showing.

## 2. Animation API Imports Dead Guard
- **Symptom:** `/api/generate-animation/+server.js` still imports `guardRequest` from the removed `requestGuard.js` file and doesn’t `await` it.
- **Repro:** Hit `/api/generate-animation` → server crashes with `Cannot find module '$lib/server/requestGuard.js'`.
- **Fix:** Replace the import with `from '$lib/server/authService.js'` and `await guardRequest(event)` just like `/api/transcribe`.
- **Follow-up:** Confirm both `/api/transcribe` and `/api/generate-animation` share the same guard behavior (session cookie + rate limit).

## 3. Cookie Sessions Crash When Auth Disabled
- **Symptom A:** `cookieStore.js` throws during module load if `API_COOKIE_SECRET` is missing, even when `API_AUTH_TOKEN` is unset (auth disabled).
- **Symptom B:** `createSession`/`validateSession` rely on `btoa/atob`, which don’t exist in Node. `/api/auth` POST/GET 500 on the first request.
- **Fix:**
  - Only initialize the HMAC key if auth is enabled (wrap the secret lookup in a helper or lazy getter, and guard by `authToken`).
  - Replace `btoa/atob` usage with `Buffer.from(...).toString('base64')` and reverse for decode.
- **Follow-up:** Add minimal unit coverage or a `npm run test cookieStore` script to prevent regressions.

## 4. File-Based Rate Limiter Won’t Survive Serverless
- **Symptom:** `fileStore.js` writes to `src/lib/server/.tmp/rate_limit_store.json` and schedules a `setInterval` cleanup. Serverless platforms (Vercel/Netlify) forbid writing to repo paths, so every request errors. Concurrency also reloads the JSON file on each read → race window.
- **Fix Options:**
  1. Roll back to the original in-memory `Map` (fast, stateless, acceptable for low-volume).
  2. Swap in a real external store (Redis, Upstash, KV) and use their SDK.
  3. If sticking with filesystem, write to `/tmp` and gate the interval behind `if (process.env.VERCEL)` → still brittle.
- **Recommendation:** Restore the in-memory store now, plan a Redis/KV follow-up if we actually need distributed limits.

## 5. Token Modal UX Regression
- **Symptom:** Failed submissions reject the promise, close the modal, and give no feedback. Users must re-trigger a fresh modal to try again.
- **Fix:** Keep the modal open, surface errors inline, and resolve/reject only when the user succeeds or cancels. Example approach:
  - Track `errorMessage` inside the modal props/store.
  - Only call `resolve()` after a successful POST; on errors set the message and keep the promise pending.
- **Follow-up:** Add basic accessibility (focus trap, `aria` labels) while touching the component.

## 6. Gemini Generation Config Ignored
- **Symptom:** `geminiService.js` passes `config: GENERATION_CONFIG` to `generateContent`, but the SDK expects `generationConfig`. All custom temperature/token limits are dropped.
- **Fix:** Rename the property and confirm via a quick console log or integration test.
- **Follow-up:** Consider shared constants for model IDs/config so animation + transcription don’t drift.

## 7. Docs + Env Hygiene
- Update `README`/`ENV.example` with the new `API_COOKIE_SECRET`, `API_RATE_*`, and `/api/auth` flow.
- Note that Gemini endpoints now live in `geminiService.js` (transcribe) + `generate-animation` (still using old client).

---

### Suggested Work Order
1. Fix compilation/runtime blockers (#1-#3, #6).
2. Decide rate limiter strategy (#4) → simplest path is reverting to in-memory for now.
3. Polish modal UX (#5) once the basics work.
4. Update docs/env samples and run lint/test to ensure no loose ends.

### Validation Checklist
- `npm run lint` + `npm run test` pass.
- `/api/auth` GET/POST works locally with and without env vars set.
- `/api/transcribe` + `/api/generate-animation` both succeed with valid tokens and reject invalid ones gracefully.
- Modal shows error messages on bad tokens and closes cleanly on cancel.

Drop this file in the repo root (already done) so the next agent can jump straight in.
