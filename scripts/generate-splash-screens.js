/**
 * Generate PWA Splash Screens for iOS
 *
 * This script generates splash screen images for iOS when TalkType is installed
 * as a PWA (Progressive Web App).
 *
 * To run this script:
 * 1. Install dependencies: npm install sharp
 * 2. Run: node scripts/generate-splash-screens.js
 *
 * It creates splash screens for all current iOS device sizes with
 * the TalkType ghost centered on a peach gradient background.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../static/splash');
const ASSETS_DIR = path.join(__dirname, '../static/assets');
const TEMP_DIR = path.join(__dirname, '../temp');

// Create directories if they don't exist
if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

if (!fs.existsSync(TEMP_DIR)) {
	fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// iOS splash screen sizes
const SPLASH_SCREENS = [
	{ name: 'apple-splash-2048-2732.png', width: 2048, height: 2732 }, // 12.9" iPad Pro
	{ name: 'apple-splash-1668-2388.png', width: 1668, height: 2388 }, // 11" iPad Pro
	{ name: 'apple-splash-1536-2048.png', width: 1536, height: 2048 }, // 9.7" iPad
	{ name: 'apple-splash-1290-2796.png', width: 1290, height: 2796 }, // iPhone 14 Pro Max
	{ name: 'apple-splash-1179-2556.png', width: 1179, height: 2556 }, // iPhone 14 Pro
	{ name: 'apple-splash-1170-2532.png', width: 1170, height: 2532 }, // iPhone 13/14
	{ name: 'apple-splash-1125-2436.png', width: 1125, height: 2436 }, // iPhone X/XS/11 Pro
	{ name: 'apple-splash-1284-2778.png', width: 1284, height: 2778 }, // iPhone 12/13 Pro Max
	{ name: 'apple-splash-750-1334.png', width: 750, height: 1334 } // iPhone 8/SE
];

/**
 * Create a combined SVG with the TalkType ghost
 */
async function createSplashSVG() {
	// Background gradient (peach - default TalkType theme)
	const gradientSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#fff6e6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#ffefda;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#grad1)" />
  </svg>`;

	// Path to ghost SVG assets
	const basePath = path.join(ASSETS_DIR, 'talktype-icon-base.svg');
	const eyesPath = path.join(ASSETS_DIR, 'talktype-icon-eyes.svg');
	const bgPath = path.join(ASSETS_DIR, '../talktype-icon-bg-gradient.svg');

	// Ensure SVG assets exist
	if (!fs.existsSync(basePath) || !fs.existsSync(eyesPath)) {
		console.error('❌ Ghost SVG assets not found. Please check paths.');
		process.exit(1);
	}

	// Create temporary gradient SVG
	const tempGradientPath = path.join(TEMP_DIR, 'splash-gradient.svg');
	fs.writeFileSync(tempGradientPath, gradientSVG);

	return {
		bg: fs.existsSync(bgPath) ? bgPath : tempGradientPath,
		base: basePath,
		eyes: eyesPath
	};
}

/**
 * Generate all splash screen images
 */
async function generateSplashScreens() {
	console.log('🎨 Generating TalkType splash screens for iOS...');

	try {
		// Get SVG elements
		const ghostSVG = await createSplashSVG();

		// Process each splash screen size
		for (const screen of SPLASH_SCREENS) {
			console.log(`  ⚙️ Generating ${screen.name}...`);

			// Calculate ghost logo size (40% of screen width)
			const logoSize = Math.round(screen.width * 0.4);

			// Calculate position to center the logo (with slight upward adjustment)
			const logoX = Math.round((screen.width - logoSize) / 2);
			const logoY = Math.round((screen.height - logoSize) / 2 - screen.height * 0.1); // Positioned slightly above center

			// Create a canvas with the peach gradient background
			const canvas = sharp({
				create: {
					width: screen.width,
					height: screen.height,
					channels: 4,
					background: { r: 255, g: 246, b: 230, alpha: 1 } // #FFF6E6
				}
			}).png();

			// Add a gradient overlay
			const gradientBuffer = await sharp(ghostSVG.bg)
				.resize(screen.width, screen.height, { fit: 'fill' })
				.toBuffer();

			// Resize the ghost base and eyes
			const baseBuffer = await sharp(ghostSVG.base).resize(logoSize, logoSize).toBuffer();

			const eyesBuffer = await sharp(ghostSVG.eyes).resize(logoSize, logoSize).toBuffer();

			// Compose the final image
			await sharp({
				create: {
					width: screen.width,
					height: screen.height,
					channels: 4,
					background: { r: 255, g: 246, b: 230, alpha: 1 }
				}
			})
				// Add gradient background
				.composite([{ input: gradientBuffer, blend: 'over' }])
				// Add ghost logo layers
				.composite([
					{ input: baseBuffer, left: logoX, top: logoY, blend: 'over' },
					{ input: eyesBuffer, left: logoX, top: logoY, blend: 'over' }
				])
				// Add TalkType text (using a text overlay)
				.png()
				.toFile(path.join(OUTPUT_DIR, screen.name));
		}

		console.log('✅ All splash screens generated successfully!');
		console.log(`📂 Splash screens saved to: ${OUTPUT_DIR}`);

		// Clean up temporary files
		if (fs.existsSync(TEMP_DIR)) {
			fs.readdirSync(TEMP_DIR).forEach((file) => {
				fs.unlinkSync(path.join(TEMP_DIR, file));
			});
			fs.rmdirSync(TEMP_DIR);
		}
	} catch (error) {
		console.error('❌ Error generating splash screens:', error);
	}
}

// Run the generator
generateSplashScreens();
