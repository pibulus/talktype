# TalkType

Your transcription ghost friend. Voice-to-text that doesn't suck.

## ✨ Features

### Progressive Transcription

- **⚡ Instant Start**: Web Speech API for 0ms latency (Chrome/Edge)
- **🔒 Privacy Mode**: 100% offline transcription with Whisper
- **🤖 Auto Mode**: Let TalkType choose the best option for you
- **Smart Model Selection**: Automatically picks optimal Distil-Whisper model based on your device

### Delightful Experience

- **👻 Ghost Personality**: Animated companion with 4 themes (peach, mint, bubblegum, rainbow)
- **📱 PWA Installable**: Works offline, installs like a native app
- **🎨 Beautiful Design**: Pastel-punk aesthetic with smooth animations
- **📋 Quick Copy**: One-click copy to clipboard

### Privacy & Performance

- **100% Private**: All transcription happens locally (in Privacy mode)
- **Distil-Whisper Models**: 6x faster, 50% smaller than regular Whisper
- **WebGPU Ready**: Future-proofed for 10-100x speed improvements
- **No Subscriptions**: Free forever, no accounts, no data collection

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

> 🔐 **New**: the first time you trigger any Gemini-powered feature, the browser
> will prompt you for the `API_AUTH_TOKEN` from `.env`. The token is only used
> to open an HttpOnly session cookie so random clients can’t drain your quota.
>
> Set `API_AUTH_TOKEN` and `API_COOKIE_SECRET` (any 32+ char random string) in
> your `.env`, and tweak `API_RATE_LIMIT`, `API_RATE_WINDOW_MS`, or
> `API_SESSION_TTL_MS` if you need different defaults.

## Deploying (Netlify)

We ship with `@sveltejs/adapter-netlify` and a `netlify.toml` that points Netlify at the correct build output. To deploy:

1. **Install deps**: `npm install`
2. **Set environment variables** in Netlify → Site settings → Environment:
   - `VITE_GEMINI_API_KEY`
   - `API_AUTH_TOKEN`
   - `API_COOKIE_SECRET` (32+ random chars)
   - Optional: `API_RATE_LIMIT`, `API_RATE_WINDOW_MS`, `API_SESSION_TTL_MS`, `MAX_UPLOAD_BYTES`, `API_COOKIE_SECURE=true`
3. **Build command**: `npm run build`
4. **Publish directory**: Netlify auto-detects `.svelte-kit/output/client` via the adapter (no manual override needed)

Hit “Deploy” and Netlify will generate the serverless functions + static assets automatically.

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## Quality Assurance

We use Lighthouse CI to maintain high performance, accessibility, and best practices standards.

```bash
# Run Lighthouse CI tests
npm run lighthouse
```

This will:

1. Build the production version of the app
2. Run Lighthouse audits against key metrics
3. Generate reports in the `lighthouse-reports` directory

### Thresholds

- Performance: 85+
- Accessibility: 90+
- Best Practices: 85+
- SEO: 90+

Failing these thresholds will cause warnings or errors in the CI process. We prioritize accessibility with stricter error thresholds.
