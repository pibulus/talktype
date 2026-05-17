# TalkType

TalkType is a small voice-to-text PWA with a soft ghost interface. The product goal is simple: open it, tap the ghost, speak, and get usable text quickly.

## Current Shape

- **Live Mode is the default**: Deepgram realtime WebSocket transcription streams text while the user speaks.
- **Standard batch fallback**: Standard post-recording transcription routes to Deepgram Nova-3 through `/api/transcribe`.
- **Styled/custom transcription**: Non-standard prompt styles route to Gemini through the same server endpoint.
- **Offline Mode is explicit**: When enabled, local Whisper runs in the browser with `@xenova/transformers`, WASM, IndexedDB/browser cache, and no cloud transcription.
- **PWA-first UX**: Install prompt, launch shortcut recording, auto-record preference, iOS safe areas, touch targets, and installed-app microphone handling are part of the core app.
- **Supporter mode**: History/export/custom prompt features are supporter-gated. Codes are manually issued for now and validated by `/api/validate-code`.

## Documentation

Start here:

- [Technical architecture](docs/ARCHITECTURE.md)
- [Documentation index](docs/INDEX.md)
- [Current release notes](docs/NEXT.md)
- [Testing strategy](docs/TESTING.md)
- [Agent/project notes](CLAUDE.md)

Historical audits and old session notes live in [docs/archive](docs/archive/README.md). Future feature research lives in [docs/research](docs/research).

## Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Useful checks:

```bash
npm test -- --run
npm run lint
npm run build
```

## Environment

Copy `.env.example` to `.env` and set the values needed for your mode:

- `DEEPGRAM_API_KEY`: required for Live Mode and standard batch transcription.
- `GEMINI_API_KEY`: required for styled/custom transcription.
- `GEMINI_MODEL`: optional; defaults to `gemini-3.1-flash-lite-preview`.
- `API_AUTH_TOKEN`: optional shared token. If set, API routes require an auth session.
- `API_COOKIE_SECRET`: required when API auth sessions are enabled.
- `SUPPORTER_UNLOCK_CODES`: comma-separated manual supporter codes for `/api/validate-code`; matched case-insensitively.
- `PUBLIC_FORCE_SUPPORTER_MODE`: set to `true` only for local/supporter testing.
- `MAX_UPLOAD_BYTES`: optional upload cap for `/api/transcribe`.

## Deployment

The app currently uses `@sveltejs/adapter-node` and builds to `build/`.

```bash
npm run build
npm run preview
```

Netlify config is present, but deployment details should be checked against the current adapter before launch.

## Known Build Note

The production build emits a large chunk warning for the offline Whisper/ONNX runtime path. That is expected while offline transcription ships in the main app bundle, but it remains a good future code-splitting target.
