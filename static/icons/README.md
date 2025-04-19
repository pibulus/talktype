# TalkType PWA Icons

This directory contains icon files required for PWA functionality.

## Required Icon Sizes

For a complete PWA implementation, you need the following icon sizes:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

Additional important files (stored in the static directory):
- favicon.png (32x32)
- apple-touch-icon.png (180x180)
- og-image.png (1200x630) - for social sharing cards

## How to Generate These Icons

1. Install Sharp: `npm install sharp`

2. Create a script like this:

```javascript
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Source file - the main SVG icon
const sourceFile = path.join(__dirname, 'static', 'talktype-icon.svg');

// PWA icon sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate PWA icons in all required sizes
sizes.forEach(size => {
  const filename = `icon-${size}x${size}.png`;
  sharp(sourceFile)
    .resize(size, size)
    .png()
    .toFile(path.join(__dirname, 'static', 'icons', filename))
    .then(() => console.log(`Created ${filename}`))
    .catch(err => console.error(`Error creating ${filename}:`, err));
});

// Create favicon.png (32x32)
sharp(sourceFile)
  .resize(32, 32)
  .png()
  .toFile(path.join(__dirname, 'static', 'favicon.png'))
  .catch(err => console.error('Error creating favicon.png:', err));

// Create apple-touch-icon.png (180x180)
sharp(sourceFile)
  .resize(180, 180)
  .png()
  .toFile(path.join(__dirname, 'static', 'apple-touch-icon.png'))
  .catch(err => console.error('Error creating apple-touch-icon.png:', err));

// Create og-image.png (1200x630)
sharp(sourceFile)
  .resize(1200, 630, { fit: 'contain', background: { r: 253, g: 247, b: 239 } })
  .png()
  .toFile(path.join(__dirname, 'static', 'og-image.png'))
  .catch(err => console.error('Error creating og-image.png:', err));

console.log('Icon generation completed.');
```

3. Run the script: `node generate-icons.js`

## Tips for Icon Generation

- Use `talktype-icon.svg` as the source file for all icon generation
- For high-quality resizing of SVG to PNG, the Sharp library is recommended
- Ensure icons have transparent backgrounds for proper display across platforms
- The manifest.json file references these icons for PWA installation