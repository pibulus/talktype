# PWA Quick-Start Guide

A simplified checklist for adding PWA functionality to any web project.

## Required Files

1. **Web App Manifest** (`/static/manifest.json`)
   ```json
   {
     "name": "App Name",
     "short_name": "App",
     "description": "App description",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#FFFFFF",
     "theme_color": "#FFFFFF",
     "icons": [
       {
         "src": "/icons/icon-192x192.png",
         "sizes": "192x192",
         "type": "image/png",
         "purpose": "any maskable"
       },
       {
         "src": "/icons/icon-512x512.png",
         "sizes": "512x512",
         "type": "image/png",
         "purpose": "any maskable"
       }
     ]
   }
   ```

2. **Service Worker** (`/static/service-worker.js`)
   ```javascript
   const CACHE_NAME = 'app-cache-v1';
   const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json', '/favicon.png', '/offline.html'];

   self.addEventListener('install', event => {
     self.skipWaiting();
     event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
   });

   self.addEventListener('fetch', event => {
     event.respondWith(
       caches.match(event.request)
         .then(response => response || fetch(event.request))
         .catch(() => {
           if (event.request.mode === 'navigate') {
             return caches.match('/offline.html');
           }
         })
     );
   });
   ```

3. **Offline Page** (`/static/offline.html`)
   - Simple HTML page with your logo
   - Message indicating user is offline
   - "Try Again" button that reloads the page

4. **HTML Meta Tags** (in your HTML `<head>`)
   ```html
   <link rel="manifest" href="/manifest.json" />
   <meta name="theme-color" content="#FFFFFF" />
   <meta name="apple-mobile-web-app-capable" content="yes" />
   <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
   ```

5. **Service Worker Registration** (in your main JavaScript)
   ```javascript
   if ('serviceWorker' in navigator) {
     window.addEventListener('load', () => {
       navigator.serviceWorker.register('/service-worker.js');
     });
   }
   ```

## Required Icons

- favicon.png (32x32)
- apple-touch-icon.png (180x180)
- icon-192x192.png (for Android)
- icon-512x512.png (for Android)
- og-image.png (1200x630, for social sharing)

## Testing

1. Use Lighthouse in Chrome DevTools
2. Test installation:
   - Chrome desktop: Look for install icon in URL bar
   - Android: "Add to Home Screen" from menu
   - iOS: "Add to Home Screen" from share menu
3. Test offline:
   - Enable offline mode in DevTools
   - Verify offline page appears

## Icon Generation Snippet

```javascript
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Source icon (SVG or high-res PNG)
const sourceIcon = './static/app-icon.svg';
// Required sizes
const sizes = [192, 512];

// Generate app icons
sizes.forEach(size => {
  sharp(sourceIcon)
    .resize(size, size)
    .png()
    .toFile(`./static/icons/icon-${size}x${size}.png`);
});

// Generate apple-touch-icon
sharp(sourceIcon).resize(180, 180).png().toFile('./static/apple-touch-icon.png');

// Generate favicon
sharp(sourceIcon).resize(32, 32).png().toFile('./static/favicon.png');

// Generate OG image
sharp(sourceIcon)
  .resize(900, 900, { fit: 'contain' })
  .extend({
    top: 0, bottom: 0, left: 150, right: 150,
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  })
  .resize(1200, 630, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toFile('./static/og-image.png');
```

## Quick Checklist

- [ ] Create manifest.json
- [ ] Create service-worker.js
- [ ] Create offline.html
- [ ] Add meta tags to HTML
- [ ] Register service worker
- [ ] Generate all required icons
- [ ] Test installation and offline functionality
- [ ] Run Lighthouse audit