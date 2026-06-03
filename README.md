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
- **Supporter Passport**: Supporter codes become deterministic Passport cards with QRBuddy QR handoff, and saved notes/recordings quietly follow the Passport through an encrypted Pi mirror.
- **Accessibility matters**: Core controls and modals are built around keyboard focus, named controls, readable mobile layouts, and 44px touch targets.

## Privacy Model

TalkType has three transcription paths:

- **Live Text** sends microphone chunks to Deepgram for realtime text.
- **After Stop** sends the finished recording to the server; standard transcription uses Deepgram and style presets use Gemini.
- **Offline** runs Whisper locally in the browser after the model has downloaded.

Transcript history is saved locally in the user's browser when supporter mode is unlocked. If a supporter has a Passport and notes endpoint configured, current transcripts and attached recordings can mirror themselves to the Pi drop-zone. Text and audio are encrypted client-side before upload, and local deletions remove items from the mirrored history on the next pass. Do not include private transcripts, recordings, API keys, supporter codes, or payment details in GitHub issues.

Production can enable Umami for privacy-focused aggregate analytics. TalkType only sends low-cardinality product events such as recording start/stop, transcription success/error, mode changes, checkout start, and PWA install signals. It must not send transcript text, audio, supporter codes, payment details, user IDs, or session replay data.

## Documentation

Start here:

- [Technical architecture](docs/ARCHITECTURE.md)
- [Documentation index](docs/INDEX.md)
- [Current release notes](docs/NEXT.md)
- [The Vault](docs/THE_VAULT.md)
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
- `PUBLIC_UMAMI_WEBSITE_ID`: optional Umami website id. When set in production, TalkType loads the Umami tracker.
- `PUBLIC_UMAMI_SCRIPT_URL`: optional Umami script URL; defaults to Umami Cloud.
- `PUBLIC_UMAMI_DOMAINS`: optional Umami domain allow-list; defaults to `talktype.app`.
- `PUBLIC_UMAMI_DISABLED`: set to `true` to suppress the Umami script even when an id is present.
- `SQUARE_ENVIRONMENT`: `sandbox` for testing or `production` for live Square checkout.
- `SQUARE_API_VERSION`: Square API version header. Keep pinned and bump deliberately after testing.
- `SQUARE_ACCESS_TOKEN`: Square access token for hosted checkout.
- `SQUARE_LOCATION_ID`: Square location id for the supporter product.
- `SQUARE_WEBHOOK_SIGNATURE_KEY`: Square webhook signature key.
- `SQUARE_WEBHOOK_NOTIFICATION_URL`: exact webhook URL configured in Square.
- `TALKTYPE_STORAGE_ADAPTER`: `filesystem`, `netlify-blobs`, or `memory`.
- `TALKTYPE_DATA_DIR`: filesystem storage directory for checkout/license data.
- `PUBLIC_QRBUDDY_API_URL`: QRBuddy `/render-qr` endpoint for Passport card QR stamps.
- `PUBLIC_QRBUDDY_APP_URL`: QRBuddy app/share origin for QR links when needed.
- `PUBLIC_PASSPORT_SERVER_URL`: optional default encrypted notes endpoint used by Passport QR/import/check-in. Falls back to `PUBLIC_VAULT_SERVER_URL` for older configs.

The standalone Vault server uses:

- `PORT`: Vault server port, default `3000`.
- `VAULT_DIR`: encrypted blob storage directory, default `./vaults`.
- `VAULT_ALLOWED_ORIGIN`: comma-separated browser origins allowed to call the Vault server.
- `MAX_VAULT_BLOB_BYTES`: upload cap for encrypted Vault payloads, default `150MB`.

## Deployment

The app currently uses `@sveltejs/adapter-node` and builds to `build/`.

```bash
npm run build
npm run preview
```

Netlify config is present, but deployment details should be checked against the current adapter before launch.

## Known Build Note

Offline Mode still ships a large ONNX Runtime WASM asset, but it is on the dynamic offline-transcription path and is cached at runtime rather than precached during service-worker install.

## License

TalkType uses a custom non-commercial source license. Personal, educational, and non-commercial use is allowed; commercial reuse needs written permission. See [LICENSE](LICENSE).
