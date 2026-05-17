# TalkType

[![CI](https://github.com/pibulus/talktype/actions/workflows/ci.yml/badge.svg)](https://github.com/pibulus/talktype/actions/workflows/ci.yml)
[![License: custom non-commercial](https://img.shields.io/badge/license-custom_non--commercial-pink.svg)](LICENSE)

TalkType is a small voice-to-text PWA with a soft ghost interface. Open it, tap the ghost, speak, and get usable editable text quickly.

Try it at [talktype.app](https://talktype.app).

## Current Shape

- **Live Mode is the default**: Deepgram realtime WebSocket transcription streams text while the user speaks.
- **Standard batch fallback**: Standard post-recording transcription routes to Deepgram Nova-3 through `/api/transcribe`.
- **Style presets**: Non-standard output styles route to Gemini through the same server endpoint.
- **Offline Mode is explicit**: When enabled, local Whisper runs in the browser with `@xenova/transformers`, WASM, IndexedDB/browser cache, and no cloud transcription.
- **PWA-first UX**: Install prompt, launch shortcut recording, auto-record preference, iOS safe areas, touch targets, and installed-app microphone handling are part of the core app.
- **Supporter mode**: History/export/style preset features are unlocked by one-time Square checkout, with manually issued supporter codes as a fallback.
- **Accessibility matters**: Core controls and modals are built around keyboard focus, named controls, readable mobile layouts, and 44px touch targets.

## Privacy Model

TalkType has three transcription paths:

- **Live Text** sends microphone chunks to Deepgram for realtime text.
- **After Stop** sends the finished recording to the server; standard transcription uses Deepgram and style presets use Gemini.
- **Offline** runs Whisper locally in the browser after the model has downloaded.

Transcript history is saved locally in the user's browser when supporter mode is unlocked. Do not include private transcripts, recordings, API keys, supporter codes, or payment details in GitHub issues.

## Documentation

Start here:

- [Technical architecture](docs/ARCHITECTURE.md)
- [Documentation index](docs/INDEX.md)
- [Current release notes](docs/NEXT.md)
- [Testing strategy](docs/TESTING.md)
- [Contributing](CONTRIBUTING.md)
- [Support](SUPPORT.md)
- [Security](SECURITY.md)
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
- `GEMINI_API_KEY`: required for output style presets.
- `GEMINI_MODEL`: optional; defaults to `gemini-3.1-flash-lite-preview`.
- `API_AUTH_TOKEN`: optional shared token. If set, API routes require an auth session.
- `API_COOKIE_SECRET`: required when API auth sessions are enabled.
- `SUPPORTER_UNLOCK_CODES`: comma-separated manual supporter codes for `/api/supporter/redeem` and legacy `/api/validate-code`; matched case-insensitively.
- `SUPPORTER_LICENSE_SECRET`: secret used to hash supporter codes and sign supporter tokens.
- `PUBLIC_FORCE_SUPPORTER_MODE`: set to `true` only for local/supporter testing.
- `MAX_UPLOAD_BYTES`: optional upload cap for `/api/transcribe`.
- `PUBLIC_APP_URL`: public app origin used for payment redirects.
- `SQUARE_ENVIRONMENT`: `sandbox` for testing or `production` for live Square checkout.
- `SQUARE_API_VERSION`: Square API version header. Keep pinned and bump deliberately after testing.
- `SQUARE_ACCESS_TOKEN`: Square access token for hosted checkout.
- `SQUARE_LOCATION_ID`: Square location id for the supporter product.
- `SQUARE_WEBHOOK_SIGNATURE_KEY`: Square webhook signature key.
- `SQUARE_WEBHOOK_NOTIFICATION_URL`: exact webhook URL configured in Square.
- `TALKTYPE_STORAGE_ADAPTER`: `filesystem`, `netlify-blobs`, or `memory`.
- `TALKTYPE_DATA_DIR`: filesystem storage directory for checkout/license data.

## Deployment

The app currently uses `@sveltejs/adapter-node` and builds to `build/`.

```bash
npm run build
npm run preview
```

Netlify config is present, but deployment details should be checked against the current adapter before launch.

## Known Build Note

The production build emits a large chunk warning for the offline Whisper/ONNX runtime path. That is expected while offline transcription ships in the main app bundle, but it remains a good future code-splitting target.

## License

TalkType uses a custom non-commercial source license. Personal, educational, and non-commercial use is allowed; commercial reuse needs written permission. See [LICENSE](LICENSE).
