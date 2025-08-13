/**
 * Generate PWA Icons Script
 *
 * This script generates PWA-compatible icons in various sizes from the
 * layered TalkType ghost SVG components.
 *
 * To run this script:
 * 1. Install dependencies: npm install sharp svgexport
 * 2. Run: node scripts/generate-pwa-icons.js
 *
 * It will create:
 * - Regular icons with peach gradient background for standard display
 * - Maskable icons with safe zone for Android adaptive icons
 * - Theme-specific icons for light/dark mode support
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const sharp = require('sharp');
const svgexport = require('svgexport');

// Configuration
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.join(__dirname, '../static/icons');
const SVG_DIR = path.join(__dirname, '../static/assets');
const TEMP_DIR = path.join(__dirname, '../temp');

// Source SVGs
const SVG_SOURCES = {
	peach: {
		bg: '/talktype-icon-bg-gradient.svg',
		base: '/assets/talktype-icon-base.svg',
		eyes: '/assets/talktype-icon-eyes.svg'
	},
	mint: {
		bg: '/talktype-icon-bg-gradient-mint.svg',
		base: '/assets/talktype-icon-base.svg',
		eyes: '/assets/talktype-icon-eyes.svg'
	},
	bubblegum: {
		bg: '/talktype-icon-bg-gradient-bubblegum.svg',
		base: '/assets/talktype-icon-base.svg',
		eyes: '/assets/talktype-icon-eyes.svg'
	},
	rainbow: {
		bg: '/talktype-icon-bg-gradient-rainbow.svg',
		base: '/assets/talktype-icon-base.svg',
		eyes: '/assets/talktype-icon-eyes.svg'
	}
};

// Create temp and output directories if they don't exist
if (!fs.existsSync(TEMP_DIR)) {
	fs.mkdirSync(TEMP_DIR, { recursive: true });
}

if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Generate a complete ghost icon by combining SVG layers
 */
async function generateCombinedSVG(theme = 'peach', maskable = false) {
	const sources = SVG_SOURCES[theme];

	// Create an SVG that combines all layers
	let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">`;

	// If maskable, add padding for the safe zone (Google's recommendation is 20%)
	if (maskable) {
		// Add a white background for maskable icons (full canvas)
		svgContent += `<rect width="512" height="512" fill="#ffffff"/>`;

		// Calculate safe zone (60% of the full size, centered)
		const safeZoneStart = 512 * 0.2; // 20% margin from each edge
		const safeZoneSize = 512 * 0.6; // 60% of total size

		// Add the SVG layers scaled and positioned within the safe zone
		svgContent += `
      <svg x="${safeZoneStart}" y="${safeZoneStart}" width="${safeZoneSize}" height="${safeZoneSize}" viewBox="0 0 512 512">
        <image href="../static${sources.bg}" width="512" height="512"/>
        <image href="../static${sources.base}" width="512" height="512"/>
        <image href="../static${sources.eyes}" width="512" height="512"/>
      </svg>`;
	} else {
		// For regular icons, use the full space
		svgContent += `
      <image href="../static${sources.bg}" width="512" height="512"/>
      <image href="../static${sources.base}" width="512" height="512"/>
      <image href="../static${sources.eyes}" width="512" height="512"/>`;
	}

	svgContent += `</svg>`;

	// Write the combined SVG to a temp file
	const suffix = maskable ? '-maskable' : '';
	const outputPath = path.join(TEMP_DIR, `combined-${theme}${suffix}.svg`);
	fs.writeFileSync(outputPath, svgContent);

	return outputPath;
}

/**
 * Convert the combined SVG to PNG at various sizes
 */
async function convertToPNG(svgPath, theme = 'peach', maskable = false) {
	const suffix = maskable ? '-maskable' : '';
	const baseName = path.basename(svgPath, '.svg');

	// Create conversion tasks for svgexport
	const tasks = [];

	for (const size of ICON_SIZES) {
		const outputFilename = maskable
			? `icon-maskable-${theme}-${size}x${size}.png`
			: `icon-${theme}-${size}x${size}.png`;

		const outputPath = path.join(OUTPUT_DIR, outputFilename);
		tasks.push({
			input: svgPath,
			output: `${outputPath} ${size}:${size}`
		});
	}

	// Execute all conversions
	return new Promise((resolve, reject) => {
		svgexport.render(tasks, function (err) {
			if (err) {
				reject(err);
			} else {
				console.log(`✅ Generated ${theme}${suffix} icons at all sizes`);
				resolve();
			}
		});
	});
}

/**
 * Optimize the PNGs using Sharp to reduce file size
 */
async function optimizeIcons() {
	const files = fs.readdirSync(OUTPUT_DIR);
	const pngFiles = files.filter((file) => file.endsWith('.png'));

	for (const file of pngFiles) {
		const filePath = path.join(OUTPUT_DIR, file);

		try {
			const image = await sharp(filePath).png({ quality: 90, compressionLevel: 9 }).toBuffer();

			fs.writeFileSync(filePath, image);
		} catch (err) {
			console.error(`Error optimizing ${file}:`, err);
		}
	}

	console.log('✅ Optimized all PNG icons');
}

/**
 * Create special monochrome versions for theme_icons
 */
async function createThemeIcons() {
	// Create light theme icon (black outline on white)
	const lightSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#ffffff"/>
  <svg x="102.4" y="102.4" width="307.2" height="307.2" viewBox="0 0 512 512">
    <image href="../static/assets/talktype-icon-outline.svg" width="512" height="512"/>
    <image href="../static/assets/talktype-icon-eyes.svg" width="512" height="512"/>
  </svg>
</svg>`;

	// Create dark theme icon (white outline on black)
	const darkSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#000000"/>
  <svg x="102.4" y="102.4" width="307.2" height="307.2" viewBox="0 0 512 512" style="filter: invert(1);">
    <image href="../static/assets/talktype-icon-outline.svg" width="512" height="512"/>
    <image href="../static/assets/talktype-icon-eyes.svg" width="512" height="512"/>
  </svg>
</svg>`;

	// Write theme SVGs to temp files
	const lightSvgPath = path.join(TEMP_DIR, 'theme-light.svg');
	const darkSvgPath = path.join(TEMP_DIR, 'theme-dark.svg');
	fs.writeFileSync(lightSvgPath, lightSvg);
	fs.writeFileSync(darkSvgPath, darkSvg);

	// Convert to PNG at 512px size
	const lightPngPath = path.join(OUTPUT_DIR, 'icon-maskable-light-512x512.png');
	const darkPngPath = path.join(OUTPUT_DIR, 'icon-maskable-dark-512x512.png');

	const tasks = [
		{ input: lightSvgPath, output: `${lightPngPath} 512:512` },
		{ input: darkSvgPath, output: `${darkPngPath} 512:512` }
	];

	return new Promise((resolve, reject) => {
		svgexport.render(tasks, function (err) {
			if (err) {
				reject(err);
			} else {
				console.log('✅ Generated theme-specific icons for light/dark mode');
				resolve();
			}
		});
	});
}

/**
 * Generate all icons for the PWA
 */
async function generateAllIcons() {
	try {
		console.log('🎨 Generating TalkType PWA icons...');

		// Generate main peach theme icons (default)
		const peachSvgPath = await generateCombinedSVG('peach', false);
		await convertToPNG(peachSvgPath, 'peach', false);

		// Generate maskable icons for Android adaptive icons
		const peachMaskableSvgPath = await generateCombinedSVG('peach', true);
		await convertToPNG(peachMaskableSvgPath, 'peach', true);

		// Create theme-specific icons for light/dark mode
		await createThemeIcons();

		// Optimize all generated PNGs
		await optimizeIcons();

		// Create compatibility links for standard icon names
		ICON_SIZES.forEach((size) => {
			const sourcePath = path.join(OUTPUT_DIR, `icon-peach-${size}x${size}.png`);
			const destPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

			// Check if source exists
			if (fs.existsSync(sourcePath)) {
				// Copy file instead of symlink for better compatibility
				fs.copyFileSync(sourcePath, destPath);
			}
		});

		// Link maskable icon
		fs.copyFileSync(
			path.join(OUTPUT_DIR, 'icon-maskable-peach-512x512.png'),
			path.join(OUTPUT_DIR, 'icon-maskable-512x512.png')
		);

		console.log('✅ All PWA icons generated successfully!');
		console.log('🔍 Check the /static/icons directory for the generated icons.');

		// Clean up temp files
		if (fs.existsSync(TEMP_DIR)) {
			fs.readdirSync(TEMP_DIR).forEach((file) => {
				fs.unlinkSync(path.join(TEMP_DIR, file));
			});
			fs.rmdirSync(TEMP_DIR);
			console.log('🧹 Cleaned up temporary files');
		}
	} catch (error) {
		console.error('❌ Error generating icons:', error);
	}
}

// Execute the script
generateAllIcons();
