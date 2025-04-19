# TalkType Icon System & PWA Implementation

## The Ghost Icon System

TalkType uses a layered SVG approach for the ghost icon:

### SVG Layer Structure
- **Base Layer**: `/assets/talktype-icon-base.svg` or `/assets/talktype-icon-outline.svg`
- **Background Gradient**: `/assets/talktype-icon-bg-gradient*.svg` (with theme variants)
- **Eyes Layer**: `/assets/talktype-icon-eyes.svg` (top layer for blinking animation)

### Theme Variants
All gradient backgrounds should be stored in `/static/assets/`:
- **Peach (Default)**: `talktype-icon-bg-gradient.svg`
- **Mint**: `talktype-icon-bg-gradient-mint.svg`
- **Bubblegum**: `talktype-icon-bg-gradient-bubblegum.svg`
- **Rainbow**: `talktype-icon-bg-gradient-rainbow.svg`

### Icon Standards for Different Platforms
- **Favicon**: 32x32 PNG at `/static/favicon.png`
- **Apple Touch Icon**: 180x180 PNG at `/static/apple-touch-icon.png`
- **PWA Icons**: Various sizes (72x72 to 512x512) in `/static/icons/`
- **OG Image**: 1200x630 PNG at `/static/og-image.png` for social sharing

## Generating Icons

To generate all the required icons for the PWA:

1. Install Sharp:
   ```bash
   npm install sharp
   ```

2. Run the icon generation script:
   ```bash
   node generate-icons.js
   ```

This will create:
- All PWA icons in the `/static/icons/` directory
- favicon.png (32x32)
- apple-touch-icon.png (180x180)
- og-image.png (1200x630) for social sharing

## Testing the PWA

After generating the icons, test the PWA functionality:

1. **Installation Test**:
   - Desktop: Look for the install icon in the Chrome address bar
   - Android: Use "Add to Home Screen" from Chrome menu
   - iOS: Use "Add to Home Screen" from Safari share menu

2. **Offline Test**:
   - Enable airplane mode or use DevTools to simulate offline
   - Verify the offline page appears when trying to access the app
   - Test that the installed app can be launched offline

3. **Lighthouse Audit**:
   - Open Chrome DevTools
   - Go to Lighthouse tab
   - Check "Progressive Web App"
   - Run the audit and address any issues

## Final Checklist

- [ ] Generate all icon files
- [ ] Remove placeholder files
- [ ] Test installation on iOS
- [ ] Test installation on Android
- [ ] Test installation on desktop
- [ ] Verify offline functionality
- [ ] Run Lighthouse audit and fix any issues
- [ ] Update PWA documentation with results