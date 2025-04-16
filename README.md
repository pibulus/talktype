# TalkType

Fast, accurate, and free voice-to-text transcription app.

## Features

- Instant speech-to-text transcription
- Beautifully animated ghost interface
- Easy copy to clipboard
- Multiple visual themes
- No cloud storage or account required
- Fully responsive design
- Built with accessibility in mind

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

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
