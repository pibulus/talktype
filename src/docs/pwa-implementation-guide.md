# Modular PWA Implementation Guide

This document provides a step-by-step guide for implementing Progressive Web App (PWA) functionality in any web project. This is a modular approach designed to be easily adapted to different frameworks.

## Overview: What We've Implemented

We've created a complete PWA setup with:

1. Web App Manifest
2. Service Worker
3. Complete icon set
4. Offline fallback page
5. PWA meta tags
6. Icon generation script

## Step 1: Create the Web App Manifest

The manifest provides metadata for your application that enables installability.

**File: `/static/manifest.json`**

```json
{
	"name": "YourAppName",
	"short_name": "AppName",
	"description": "Your app description",
	"start_url": "/",
	"display": "standalone",
	"background_color": "#FEFAF4",
	"theme_color": "#FDF7EF",
	"orientation": "portrait-primary",
	"icons": [
		{
			"src": "/icons/icon-72x72.png",
			"sizes": "72x72",
			"type": "image/png",
			"purpose": "any maskable"
		},
		{
			"src": "/icons/icon-96x96.png",
			"sizes": "96x96",
			"type": "image/png",
			"purpose": "any maskable"
		},
		{
			"src": "/icons/icon-128x128.png",
			"sizes": "128x128",
			"type": "image/png",
			"purpose": "any maskable"
		},
		{
			"src": "/icons/icon-144x144.png",
			"sizes": "144x144",
			"type": "image/png",
			"purpose": "any maskable"
		},
		{
			"src": "/icons/icon-152x152.png",
			"sizes": "152x152",
			"type": "image/png",
			"purpose": "any maskable"
		},
		{
			"src": "/icons/icon-192x192.png",
			"sizes": "192x192",
			"type": "image/png",
			"purpose": "any maskable"
		},
		{
			"src": "/icons/icon-384x384.png",
			"sizes": "384x384",
			"type": "image/png",
			"purpose": "any maskable"
		},
		{
			"src": "/icons/icon-512x512.png",
			"sizes": "512x512",
			"type": "image/png",
			"purpose": "any maskable"
		}
	],
	"shortcuts": [
		{
			"name": "Start App",
			"short_name": "Start",
			"description": "Start a new session",
			"url": "/?action=start",
			"icons": [{ "src": "/icons/icon-192x192.png", "sizes": "192x192" }]
		}
	]
}
```

## Step 2: Create the Service Worker

The service worker enables offline functionality through caching.

**File: `/static/service-worker.js`**

```javascript
// App Service Worker
const CACHE_NAME = 'app-cache-v1';

// Assets to cache for offline use
const ASSETS_TO_CACHE = [
	'/',
	'/index.html',
	'/manifest.json',
	'/favicon.png',
	'/offline.html',
	// Add your important static assets here
	'/icons/icon-192x192.png'
];

// Install service worker and cache core assets
self.addEventListener('install', (event) => {
	self.skipWaiting(); // Ensure new service worker activates immediately

	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			console.log('Caching app assets');
			return cache.addAll(ASSETS_TO_CACHE);
		})
	);
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						console.log('Removing old cache', cacheName);
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
});

// Serve from cache first, then network
self.addEventListener('fetch', (event) => {
	event.respondWith(
		caches
			.match(event.request)
			.then((response) => {
				// Cache hit - return the response from the cached version
				if (response) {
					return response;
				}

				// Not in cache - make a network request and cache the response
				return fetch(event.request).then((networkResponse) => {
					// Don't cache if response isn't valid or is an error
					if (
						!networkResponse ||
						networkResponse.status !== 200 ||
						networkResponse.type !== 'basic'
					) {
						return networkResponse;
					}

					// Clone the response since we need to use it twice
					let responseToCache = networkResponse.clone();

					// Add to cache for future use
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});

					return networkResponse;
				});
			})
			.catch(() => {
				// Fallback for navigation requests if offline
				if (event.request.mode === 'navigate') {
					return caches.match('/offline.html');
				}

				// Otherwise, just return an error response
				return new Response('Sorry, you appear to be offline and this resource is not cached.');
			})
	);
});
```

## Step 3: Create an Offline Fallback Page

This page will be shown when the user is offline and trying to access non-cached content.

**File: `/static/offline.html`**

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>You're Offline</title>
		<style>
			body {
				font-family:
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					sans-serif;
				background-color: #fefaf4;
				color: #333;
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				min-height: 100vh;
				margin: 0;
				padding: 20px;
				text-align: center;
			}

			.container {
				max-width: 500px;
				background-color: white;
				border-radius: 24px;
				padding: 30px;
				box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
				border: 1px solid rgba(0, 0, 0, 0.05);
			}

			.icon {
				width: 100px;
				height: 100px;
				margin: 0 auto 20px;
				position: relative;
			}

			h1 {
				font-size: 2rem;
				font-weight: 800;
				margin-bottom: 10px;
			}

			p {
				font-size: 1.1rem;
				line-height: 1.6;
				color: #555;
				margin-bottom: 25px;
			}

			.button {
				background: linear-gradient(to right, #4a90e2, #63b3ed);
				color: white;
				font-weight: 600;
				padding: 12px 24px;
				border-radius: 50px;
				text-decoration: none;
				display: inline-block;
				border: none;
				cursor: pointer;
				transition: all 0.3s ease;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			}

			.button:hover {
				transform: translateY(-2px);
				box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
			}

			.offline-message {
				margin-top: 30px;
				font-size: 0.9rem;
				color: #777;
			}

			@keyframes float {
				0%,
				100% {
					transform: translateY(0);
				}
				50% {
					transform: translateY(-10px);
				}
			}

			.icon {
				animation: float 3s ease-in-out infinite;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<div class="icon">
				<img src="/favicon.png" alt="App Icon" width="100" height="100" />
			</div>

			<h1>You're Offline</h1>

			<p>
				Looks like you're not connected to the internet right now. Some features may not be
				available until you're back online.
			</p>

			<button class="button" onclick="location.reload()">Try Again</button>

			<div class="offline-message">
				Once you're back online, you'll be able to use all features again!
			</div>
		</div>
	</body>
</html>
```

## Step 4: Add PWA Meta Tags to HTML

Add these meta tags to your HTML `<head>` section for better integration with operating systems.

```html
<!-- Favicon and App Icons -->
<link rel="icon" href="%PUBLIC_PATH%/favicon.png" />
<link rel="apple-touch-icon" href="%PUBLIC_PATH%/apple-touch-icon.png" />

<!-- PWA related meta tags -->
<meta name="theme-color" content="#your-theme-color" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Your App Name" />
<link rel="manifest" href="%PUBLIC_PATH%/manifest.json" />

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://your-site.com/" />
<meta property="og:title" content="Your App - Tagline" />
<meta property="og:description" content="Brief description of your app" />
<meta property="og:image" content="%PUBLIC_PATH%/og-image.png" />

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:url" content="https://your-site.com/" />
<meta property="twitter:title" content="Your App - Tagline" />
<meta property="twitter:description" content="Brief description of your app" />
<meta property="twitter:image" content="%PUBLIC_PATH%/og-image.png" />
```

Replace `%PUBLIC_PATH%` with your framework's public path variable:

- For SvelteKit: `%sveltekit.assets%`
- For React/Create React App: `%PUBLIC_URL%`
- For Vue: `<%= BASE_URL %>`
- For plain HTML: The actual path to your assets

## Step 5: Register the Service Worker

This needs to be adjusted based on your framework.

### Generic JavaScript (Framework Agnostic)

```javascript
// Add this to your main JavaScript file
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker
			.register('/service-worker.js')
			.then((registration) => {
				console.log('ServiceWorker registration successful with scope: ', registration.scope);
			})
			.catch((error) => {
				console.log('ServiceWorker registration failed: ', error);
			});
	});
}
```

### For SvelteKit (in +layout.svelte)

```javascript
import { browser } from '$app/environment';
import { onMount } from 'svelte';

onMount(() => {
	if (browser && 'serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('/service-worker.js')
			.then((registration) => {
				console.log('ServiceWorker registration successful');
			})
			.catch((error) => {
				console.log('ServiceWorker registration failed:', error);
			});
	}
});
```

### For React (in index.js)

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

ReactDOM.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
	document.getElementById('root')
);

// Register service worker
serviceWorkerRegistration.register();
```

## Step 6: Icon Generation Script

This is a reusable script for generating all the required icon sizes from a source SVG or PNG.

**File: `/generate-icons.js`**

```javascript
/**
 * PWA Icon Generator
 *
 * This script generates all the necessary icon sizes for PWA
 * from a source SVG or high-resolution PNG file.
 *
 * Usage:
 * 1. npm install sharp
 * 2. node generate-icons.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name correctly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// -----------------------------------------
// Change these settings for your project
const APP_CONFIG = {
	// Source icon (SVG preferred for best quality)
	sourceIcon: path.join(__dirname, 'static', 'app-icon.svg'),

	// Output directories
	outputDir: path.join(__dirname, 'static', 'icons'),
	staticDir: path.join(__dirname, 'static'),

	// Background color for the OG image (social sharing)
	// Format: {r, g, b, alpha}
	backgroundColor: { r: 255, g: 255, b: 255, alpha: 1 },

	// PWA icon sizes required
	sizes: [72, 96, 128, 144, 152, 192, 384, 512]
};
// -----------------------------------------

// Ensure output directory exists
if (!fs.existsSync(APP_CONFIG.outputDir)) {
	fs.mkdirSync(APP_CONFIG.outputDir, { recursive: true });
}

console.log('🚀 PWA Icon Generator');
console.log('==========================');
console.log(`Source icon: ${APP_CONFIG.sourceIcon}`);
console.log(`Output directory: ${APP_CONFIG.outputDir}`);
console.log('');

// Generate PWA icons in all required sizes
const iconPromises = APP_CONFIG.sizes.map((size) => {
	const filename = `icon-${size}x${size}.png`;
	console.log(`Generating ${filename}...`);
	return sharp(APP_CONFIG.sourceIcon)
		.resize(size, size)
		.png()
		.toFile(path.join(APP_CONFIG.outputDir, filename))
		.then(() => console.log(`✅ Created ${filename}`))
		.catch((err) => console.error(`❌ Error creating ${filename}:`, err));
});

// Generate apple-touch-icon.png (180x180)
console.log('Generating apple-touch-icon.png...');
const appleIconPromise = sharp(APP_CONFIG.sourceIcon)
	.resize(180, 180)
	.png()
	.toFile(path.join(APP_CONFIG.staticDir, 'apple-touch-icon.png'))
	.then(() => console.log('✅ Created apple-touch-icon.png'))
	.catch((err) => console.error('❌ Error creating apple-touch-icon.png:', err));

// Generate favicon.png (32x32)
console.log('Generating favicon.png...');
const faviconPromise = sharp(APP_CONFIG.sourceIcon)
	.resize(32, 32)
	.png()
	.toFile(path.join(APP_CONFIG.staticDir, 'favicon.png'))
	.then(() => console.log('✅ Created favicon.png'))
	.catch((err) => console.error('❌ Error creating favicon.png:', err));

// Generate og-image.png (1200x630) with padding and background
console.log('Generating og-image.png...');
const ogImagePromise = sharp(APP_CONFIG.sourceIcon)
	.resize(900, 900, { fit: 'contain' })
	.extend({
		top: 0,
		bottom: 0,
		left: 150,
		right: 150,
		background: APP_CONFIG.backgroundColor
	})
	.resize(1200, 630, {
		fit: 'contain',
		background: APP_CONFIG.backgroundColor
	})
	.png()
	.toFile(path.join(APP_CONFIG.staticDir, 'og-image.png'))
	.then(() => console.log('✅ Created og-image.png'))
	.catch((err) => console.error('❌ Error creating og-image.png:', err));

// Wait for all promises to resolve
Promise.all([...iconPromises, appleIconPromise, faviconPromise, ogImagePromise])
	.then(() => {
		console.log('');
		console.log('🎉 Icon generation complete!');
		console.log('');
		console.log('Next steps:');
		console.log('1. Test the PWA using Lighthouse in Chrome DevTools');
		console.log('2. Verify installability on various devices');
		console.log('3. Test the offline experience');
	})
	.catch((err) => {
		console.error('Error generating some icons:', err);
	});
```

## Step 7: PWA Implementation Checklist

Use this checklist to ensure you've completed all necessary steps:

- [ ] Create manifest.json
- [ ] Add PWA meta tags to HTML head
- [ ] Create service worker file
- [ ] Register service worker in app
- [ ] Create offline.html page
- [ ] Set up icon directory structure
- [ ] Generate all required icon sizes
- [ ] Test PWA functionality in Lighthouse
- [ ] Verify installation on multiple devices
- [ ] Test offline capability

## Framework-Specific Considerations

### SvelteKit

- SvelteKit includes the `$app/environment` module with a `browser` variable to prevent service worker registration during SSR
- Place service worker registration in `+layout.svelte` to ensure it runs on all routes
- Use `%sveltekit.assets%` for asset paths in HTML

### React

- Create React App includes built-in PWA support with the PWA template
- Use `%PUBLIC_URL%` for asset paths in HTML
- React service worker registration is typically handled in a separate file

### Vue

- Vue CLI has PWA plugin: `@vue/cli-plugin-pwa`
- Configure via `vue.config.js`
- Use `<%= BASE_URL %>` for asset paths in HTML

### Next.js

- Use `next-pwa` package for easy PWA integration
- Configure via `next.config.js`
- Public assets go in the `/public` directory

## Testing Your PWA

1. **Lighthouse Audit**:
   - Open Chrome DevTools
   - Go to Lighthouse tab
   - Check "Progressive Web App"
   - Run audit and address any issues

2. **Installation Testing**:
   - Desktop Chrome: Look for the install icon in the address bar
   - Android Chrome: Menu > "Add to Home Screen"
   - iOS Safari: Share button > "Add to Home Screen"

3. **Offline Testing**:
   - Enable Chrome DevTools' offline mode
   - Or use airplane mode on your device
   - Navigate to your app and verify offline fallback works

## Resources

- [Google PWA Documentation](https://web.dev/progressive-web-apps/)
- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Workbox (Service Worker library)](https://developers.google.com/web/tools/workbox/)
- [PWA Builder](https://www.pwabuilder.com/)
- [Can I Use PWA](https://caniuse.com/?search=PWA)
- [Sharp NPM Package](https://www.npmjs.com/package/sharp) - For icon generation
