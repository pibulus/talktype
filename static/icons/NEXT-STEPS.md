# TalkType Icon System & PWA Checklist

The source SVGs live under `static/` (see `combined-icon.svg` and the themed gradient variants) and the canonical Ghost Icon frames live in Figma. Export PNGs manually—no helper scripts or `sharp` installs required anymore:

1. Open the **Ghost Icon** Figma file (link in `docs/ghost-icon-reference.md`).
2. Export the required artboards at 1× PNG for each size listed in `static/icons/README.md`.
3. For favicons, export 32×32 light/dark pairs; for maskable icons, leave 20% padding.
4. Drop the PNGs into `static/icons/`, replacing the old files.
5. Commit the updated assets alongside any manifest changes.

Before shipping, run through this checklist:

- [ ] Generate the icons you changed (commit the PNGs)
- [ ] Verify `static/manifest.json` references the new sizes
- [ ] Install the PWA on desktop + Android to confirm icons update
- [ ] Run `npm run lighthouse` and ensure PWA audits stay green

```

```
