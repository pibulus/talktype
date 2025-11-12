# TalkType Icon System & PWA Checklist

The source SVGs live under `static/` (see `combined-icon.svg` and the themed gradient variants). Use the helper scripts in `scripts/` whenever you need to regenerate assets:

```bash
# Core icons (192/512/maskable/apple touch)
node scripts/generate-basic-icons.js

# Favicon pair (light/dark)
node scripts/generate-favicon.js

# Maskable icon with safe padding
node scripts/generate-maskable-icon.js

# Splash screens + marketing screenshots
node scripts/generate-splash-screens.js
```

All scripts rely on `sharp`, so install it first (`npm install sharp --save-dev`). The generated files land in `static/icons/`, `static/`, and `static/splash/` ready for Lighthouse audits.

Before shipping, run through this checklist:
- [ ] Generate the icons you changed (commit the PNGs)
- [ ] Verify `static/manifest.json` references the new sizes
- [ ] Install the PWA on desktop + Android to confirm icons update
- [ ] Run `npm run lighthouse` and ensure PWA audits stay green
```
