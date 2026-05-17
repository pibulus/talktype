## ✨ Gemini + Auth Improvements To Steal From Conversation Mapper

We just hardened Conversation Mapper’s AI endpoints. Here’s what TalkType should import next time I open a session:

1. **Server-side auth guard**
   - Conversation Mapper now requires a shared `API_AUTH_TOKEN`, stores it as an HttpOnly cookie via `/api/auth`, and rate-limits/allow-lists origins via a centralized `authService`.
   - TalkType’s `/api/transcribe` currently accepts any POST; copy the guard + session flow so random clients can’t burn the Gemini quota.

2. **Gemini upload cleanup**
   - Mapper uploads audio once (`services/audio.ts`) and deletes Gemini files with retries after each request. TalkType uploads but never deletes, so files accumulate. Mirror the helper & delete-on-finally logic.

3. **File-size guard**
   - Mapper caps uploads at 50 MB to prevent abuse. Add the same check to `/src/routes/api/transcribe/+server.js`.

4. **Request queue + timeout**
   - TalkType already has a client-side `geminiQueue` and a 30 s timeout in `simpleHybridService.js`. Mapper should adopt this pattern to keep requests serialized and error messaging friendly. Documented here so I remember to port it next session.
