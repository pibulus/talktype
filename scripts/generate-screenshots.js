#!/usr/bin/env node
/**
 * Generate lightweight PWA screenshots referenced by static/manifest.json.
 */

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const screenshotDir = resolve(root, 'static', 'screenshots');
const iconPath = resolve(root, 'static', 'appicon', 'web', 'icon-512.png');

function screenshotSvg({ width, height, mobile }) {
	const centerX = width / 2;
	const buttonWidth = mobile ? 290 : 360;
	const buttonHeight = mobile ? 64 : 72;
	const titleY = mobile ? 258 : 238;
	const buttonY = mobile ? 398 : 360;
	const cardY = mobile ? 514 : 488;
	const cardWidth = mobile ? 324 : 760;
	const cardHeight = mobile ? 152 : 128;
	const font = 'Arial, Helvetica, sans-serif';

	return `
		<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stop-color="#fff8f0"/>
					<stop offset="0.58" stop-color="#fff6e6"/>
					<stop offset="1" stop-color="#fff0f8"/>
				</linearGradient>
				<linearGradient id="button" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stop-color="#fbbf24"/>
					<stop offset="1" stop-color="#f472b6"/>
				</linearGradient>
				<filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
					<feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#f9a8d4" flood-opacity="0.28"/>
				</filter>
			</defs>
			<rect width="100%" height="100%" fill="url(#bg)"/>
			<circle cx="${mobile ? 60 : 160}" cy="${mobile ? 112 : 118}" r="${mobile ? 72 : 116}" fill="#ecfeff" opacity="0.55"/>
			<circle cx="${mobile ? 352 : 1090}" cy="${mobile ? 706 : 610}" r="${mobile ? 92 : 150}" fill="#fce7f3" opacity="0.58"/>
			<text x="${centerX}" y="${titleY}" text-anchor="middle" font-family="${font}" font-size="${mobile ? 42 : 64}" font-weight="900" fill="#1f2937">TalkType</text>
			<text x="${centerX}" y="${titleY + (mobile ? 40 : 52)}" text-anchor="middle" font-family="${font}" font-size="${mobile ? 17 : 25}" font-weight="650" fill="#4b5563">Voice to text that starts fast</text>
			<rect x="${centerX - buttonWidth / 2}" y="${buttonY}" width="${buttonWidth}" height="${buttonHeight}" rx="${buttonHeight / 2}" fill="url(#button)" filter="url(#soft)"/>
			<text x="${centerX}" y="${buttonY + buttonHeight / 2 + (mobile ? 7 : 9)}" text-anchor="middle" font-family="${font}" font-size="${mobile ? 24 : 30}" font-weight="850" fill="#111827">Start Recording</text>
			<rect x="${centerX - cardWidth / 2}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="28" fill="#ffffff" opacity="0.82" stroke="#f9a8d4" stroke-opacity="0.45"/>
			<text x="${centerX}" y="${cardY + 50}" text-anchor="middle" font-family="${font}" font-size="${mobile ? 19 : 25}" font-weight="800" fill="#374151">Fast words. Local history. Offline mode.</text>
			<text x="${centerX}" y="${cardY + 88}" text-anchor="middle" font-family="${font}" font-size="${mobile ? 14 : 18}" font-weight="550" fill="#6b7280">Tap, talk, and keep the ghost on your home screen.</text>
		</svg>`;
}

async function writeScreenshot({ width, height, filename, mobile }) {
	const iconSize = mobile ? 132 : 142;
	const iconTop = mobile ? 84 : 54;

	await sharp(Buffer.from(screenshotSvg({ width, height, mobile })))
		.composite([
			{
				input: await sharp(iconPath).resize(iconSize, iconSize).png().toBuffer(),
				left: Math.round(width / 2 - iconSize / 2),
				top: iconTop
			}
		])
		.png()
		.toFile(resolve(screenshotDir, filename));
}

await mkdir(screenshotDir, { recursive: true });
await writeScreenshot({
	width: 390,
	height: 844,
	filename: 'screenshot-mobile.png',
	mobile: true
});
await writeScreenshot({
	width: 1280,
	height: 720,
	filename: 'screenshot-wide.png',
	mobile: false
});

console.log('Generated TalkType PWA screenshots.');
