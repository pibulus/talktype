#!/usr/bin/env node
/**
 * Generate placeholder screenshots for PWA
 * Prevents 404 errors in manifest.json
 */

import { createPlaceholderSVG } from '../src/lib/utils/createPlaceholderScreenshot.js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Generate SVG placeholders
const screenshots = [
	{
		width: 1280,
		height: 720,
		filename: 'screenshot-1.svg',
		label: 'TalkType - Voice Transcription'
	},
	{
		width: 720,
		height: 1280,
		filename: 'screenshot-mobile.svg',
		label: 'TalkType Mobile'
	}
];

console.log('📸 Generating placeholder screenshots...\n');

screenshots.forEach(({ width, height, filename, label }) => {
	const svg = createPlaceholderSVG(width, height, label);
	const outputPath = resolve(__dirname, '..', 'static', 'screenshots', filename);

	writeFileSync(outputPath, svg, 'utf-8');
	console.log(`✅ Created ${filename} (${width}x${height})`);
});

console.log('\n🎉 Screenshots generated successfully!');
console.log(
	'Note: These are SVG placeholders. For PNG versions, use a converter or take real screenshots.'
);
