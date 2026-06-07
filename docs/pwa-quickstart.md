# TalkType PWA Guide

TalkType is installable as a PWA on iOS, Android, and desktop Chromium
browsers. The current PWA setup is SvelteKit-native: the manifest and static
assets live under `static/`, while the service worker lives at
`src/service-worker.js`.

## Current Files

- `static/manifest.json`: app name, install display mode, app shortcuts,
  screenshots, and web icon references.
- `src/service-worker.js`: SvelteKit service worker using `$service-worker`
  `build`, `files`, and `version`.
- `static/offline.html`: fallback page for offline navigation requests.
- `src/app.html`: manifest link, favicon links, Apple touch icons, splash
  screens, theme color, and social metadata.
- `static/appicon/web/`: PWA icons used by `manifest.json`.
- `static/appicon/ios/`: iOS app icon exports.
- `static/favicon/`: browser favicon assets.
- `static/splash/`: iOS startup images.
- `static/screenshots/`: manifest screenshots.
- `static/og-image.png`: social share image.

There is no active `static/icons/` directory and no icon generation build step.

## Install Behavior

- iOS: Safari Share menu, then Add to Home Screen.
- Android: Chrome install prompt or Add to Home Screen.
- Desktop Chromium: install icon in the address bar or browser app menu.
- In-app prompt: handled by `src/lib/services/pwa/pwaService.js`.
- Start-record shortcut: `static/manifest.json` points to
  `/?action=record&source=shortcut`, which `MainContainer.svelte` treats as an
  auto-start source.
- Installed iOS PWA microphone permission uses the normal Start Recording flow.
  Offline Mode requests persistent storage and prepares the Whisper model cache
  when that mode is enabled.

## Caching Behavior

`src/service-worker.js` caches:

- SvelteKit build output.
- Static files from `static/`.
- Runtime GET responses.
- Large ONNX runtime WASM responses in the `runtime-v1` cache.

Large ONNX runtime WASM assets are excluded from the install-time app cache and
handled at runtime so the initial service-worker install is less brittle. Stale
hashed runtime assets are pruned on activation.

Transformers.js owns the current Whisper model cache through its browser cache.
The service worker keeps only a legacy `whisper-models-v1` fallback long enough
to serve old cached model hits once and let transformers.js migrate the response.

## Updating Icons

1. Export the web icons into `static/appicon/web/`:
   - `icon-192.png`
   - `icon-512.png`
   - `icon-192-maskable.png`
   - `icon-512-maskable.png`
   - `apple-touch-icon.png`
2. Export iOS-specific sizes into `static/appicon/ios/` if the app icon changes.
3. Update favicons in `static/favicon/` if the small browser icon changes.
4. Update `static/manifest.json` only if filenames, sizes, or purposes change.
5. Update `static/splash/` and `static/screenshots/` when the launch or store
   presentation changes.
6. Run a production build, a manifest smoke check, and the normal Lighthouse
   performance/accessibility pass after icon changes.

## Test Checklist

- `npm run build` completes.
- Lighthouse performance/accessibility checks pass in Chrome.
- `/manifest.json` loads and points to existing icon files.
- `/offline.html` is present in the production output.
- App installs on desktop Chromium.
- iOS Add to Home Screen opens without browser chrome.
- Android install uses the expected icon and app name.
- Launch shortcut starts the app with `?action=record&source=shortcut`.
- Offline navigation shows cached app content or `offline.html`.
- Offline Mode still downloads and reuses Whisper models as expected.
- Installed iOS PWA Start Recording prompts for microphone permission without an
  extra setup pill.
- Active recording requests Screen Wake Lock when the browser supports it.
