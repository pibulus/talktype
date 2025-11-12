# TalkType iOS Splash Screens

This directory contains splash screen images for iOS devices when installed as a PWA.

## Required Splash Screens

The HTML head includes references to the following splash screen images:

- `apple-splash-2048-2732.png` - 12.9" iPad Pro
- `apple-splash-1668-2388.png` - 11" iPad Pro
- `apple-splash-1536-2048.png` - 9.7" iPad
- `apple-splash-1290-2796.png` - iPhone 14 Pro Max
- `apple-splash-1179-2556.png` - iPhone 14 Pro
- `apple-splash-1170-2532.png` - iPhone 13/14
- `apple-splash-1125-2436.png` - iPhone X/XS/11 Pro
- `apple-splash-1284-2778.png` - iPhone 12/13 Pro Max
- `apple-splash-750-1334.png` - iPhone 8/SE

## How to Generate Splash Screens

Use the provided script at `scripts/generate-splash-screens.js`:

```bash
# Install dependencies
npm install sharp --no-save   # optional; use npx sharp if you prefer

# Run the script
node scripts/generate-splash-screens.js
```

The script will generate all required splash screens with the TalkType ghost logo centered on a peach gradient background.

## Why Splash Screens Matter

Splash screens provide a smooth, native-feeling launch experience when users open TalkType from their home screen. They help reinforce the brand and make the app feel more professional and integrated with the device.
