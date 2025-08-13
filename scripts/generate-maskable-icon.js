/**
 * Generate a maskable icon variant for Android adaptive icons
 *
 * This script creates a maskable icon variant with proper padding
 * to ensure the icon looks good in various shapes (circle, squircle, etc.)
 */

import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Get the current file's directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source file - the main SVG icon
const sourceFile = path.join(__dirname, '..', 'static', 'talktype-icon.svg');

// Size for the maskable icon
const size = 512;

// Create a maskable icon with proper padding (icon in the center 80%)
async function generateMaskableIcon(colorMode = 'default') {
	try {
		// Calculate safe zone dimensions (80% of total size)
		const safeSize = Math.floor(size * 0.8);
		const padding = Math.floor((size - safeSize) / 2);

		let inputSvg = sourceFile;
		let suffix = '';

		// If we're generating a theme-specific icon
		if (colorMode === 'dark') {
			// For dark mode backgrounds (white ghost)
			const svgBuffer = await fs.readFile(sourceFile, 'utf8');
			const whiteSvg = svgBuffer.replace(/#000000/g, '#FFFFFF');
			inputSvg = Buffer.from(whiteSvg);
			suffix = '-dark';
		} else if (colorMode === 'light') {
			// For light mode backgrounds (black ghost) - using source directly
			suffix = '-light';
		} else if (colorMode === 'neutral') {
			// For neutral gray ghost
			const svgBuffer = await fs.readFile(sourceFile, 'utf8');
			const graySvg = svgBuffer.replace(/#000000/g, '#8F8F8F');
			inputSvg = Buffer.from(graySvg);
		}

		// Create a new image with padding
		await sharp({
			create: {
				width: size,
				height: size,
				channels: 4,
				background: { r: 0, g: 0, b: 0, alpha: 0 }
			}
		})
			.composite([
				{
					input: await sharp(inputSvg).resize(safeSize, safeSize).toBuffer(),
					top: padding,
					left: padding
				}
			])
			.png()
			.toFile(
				path.join(__dirname, '..', 'static', 'icons', `icon-maskable${suffix}-${size}x${size}.png`)
			);

		console.log(`✅ Created maskable icon${suffix}: icon-maskable${suffix}-${size}x${size}.png`);
	} catch (err) {
		console.error(`❌ Error creating maskable icon (${colorMode}):`, err);
	}
}

// Generate all the maskable icons
async function generateAllMaskableIcons() {
	// Default/neutral gray icon
	await generateMaskableIcon('neutral');

	// Theme-specific icons
	await generateMaskableIcon('light');
	await generateMaskableIcon('dark');

	console.log('✅ All maskable icons generated successfully');
}

// Run the generation
generateAllMaskableIcons();
