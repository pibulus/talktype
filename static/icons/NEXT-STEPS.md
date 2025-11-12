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

The scripts shell out to `sharp`. When you need to regenerate assets run `npx sharp --version` first (which auto-installs a temporary copy) or `npm install sharp --no-save`. No need to keep it in package.json.

Before shipping, run through this checklist:
- [ ] Generate the icons you changed (commit the PNGs)
- [ ] Verify `static/manifest.json` references the new sizes
- [ ] Install the PWA on desktop + Android to confirm icons update
- [ ] Run `npm run lighthouse` and ensure PWA audits stay green
```
