# Contributing

TalkType is a small utility app with a strong bias toward simple code, privacy, accessibility, and a soft user experience. Contributions are welcome when they keep that shape intact.

## Before Opening A Pull Request

1. Keep the change focused.
2. Avoid committing recordings, transcripts, API keys, supporter codes, payment data, or local `.env` files.
3. Match the existing Svelte and service patterns before adding a new abstraction.
4. Run the checks:

```bash
npm run lint
npm test -- --run
npm run build
```

## Useful Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

For normal local UI work, Deepgram, Gemini, and Square keys can be left unset until you need to test those exact flows.

## Product Priorities

- The default path should feel fast and obvious on mobile.
- Live transcription should stay visible while the user speaks.
- Offline mode should be explicit and predictable.
- Error copy should be calm, useful, and non-scary.
- Accessibility is not polish; it is part of the feature.

## Licensing Note

TalkType is source-available for personal, educational, and non-commercial use. Commercial reuse needs written permission. See [LICENSE](LICENSE).
