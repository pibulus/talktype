/**
 * Ultra-simple PWA Icon Generator - Just the core PWA icons
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const OUTPUT_DIR = path.join(__dirname, '../static/icons');
const STATIC_DIR = path.join(__dirname, '../static');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Use our combined icon with the gradient
const sourceIcon = path.join(STATIC_DIR, 'combined-icon.svg');

async function generateBasicIcons() {
	try {
		console.log('🔄 Generating basic PWA icons from source SVG...');
		console.log(`Using source icon: ${sourceIcon}`);

		if (!fs.existsSync(sourceIcon)) {
			console.error(`❌ Source icon not found at: ${sourceIcon}`);
			process.exit(1);
		}

		// Generate standard icons
		await sharp(sourceIcon).resize(192, 192).toFile(path.join(OUTPUT_DIR, 'icon-192x192.png'));
		console.log('✅ Generated icon-192x192.png');

		await sharp(sourceIcon).resize(512, 512).toFile(path.join(OUTPUT_DIR, 'icon-512x512.png'));
		console.log('✅ Generated icon-512x512.png');

		// Generate Apple touch icon
		await sharp(sourceIcon).resize(180, 180).toFile(path.join(STATIC_DIR, 'apple-touch-icon.png'));
		console.log('✅ Generated apple-touch-icon.png');

		// Simple maskable icon - just add padding and background color
		await sharp(sourceIcon)
			.resize(Math.round(512 * 0.8), Math.round(512 * 0.8)) // 80% of final size
			.extend({
				top: Math.round(512 * 0.1),
				bottom: Math.round(512 * 0.1),
				left: Math.round(512 * 0.1),
				right: Math.round(512 * 0.1),
				background: { r: 255, g: 246, b: 230, alpha: 1 } // #FFF6E6
			})
			.toFile(path.join(OUTPUT_DIR, 'icon-maskable-512x512.png'));
		console.log('✅ Generated icon-maskable-512x512.png');

		console.log('✅ Done! Basic PWA icons generated successfully.');
	} catch (error) {
		console.error('❌ Error generating icons:', error);
	}
}

generateBasicIcons();
