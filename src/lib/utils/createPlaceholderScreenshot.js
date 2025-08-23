/**
 * Create placeholder screenshots for PWA manifest
 * These prevent 404 errors while we take real screenshots later
 */

export function createPlaceholderSVG(width, height, label) {
	const aspectRatio = (height / width).toFixed(2);
	const fontSize = Math.min(width, height) * 0.05;
	
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
	<!-- Gradient background matching TalkType theme -->
	<defs>
		<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" style="stop-color:#FFE5CC;stop-opacity:1" />
			<stop offset="100%" style="stop-color:#FFB3BA;stop-opacity:1" />
		</linearGradient>
	</defs>
	
	<!-- Background -->
	<rect width="${width}" height="${height}" fill="url(#bg)"/>
	
	<!-- Ghost icon placeholder -->
	<g transform="translate(${width/2}, ${height/2})">
		<!-- Ghost body -->
		<ellipse cx="0" cy="-20" rx="60" ry="80" fill="white" opacity="0.9"/>
		<!-- Ghost bottom waves -->
		<path d="M -60,40 Q -45,60 -30,40 T 0,40 T 30,40 T 60,40" 
			  fill="white" opacity="0.9"/>
		<!-- Eyes -->
		<circle cx="-20" cy="-20" r="8" fill="#333"/>
		<circle cx="20" cy="-20" r="8" fill="#333"/>
		<!-- Blush -->
		<ellipse cx="-30" cy="0" rx="15" ry="10" fill="#FFB3BA" opacity="0.5"/>
		<ellipse cx="30" cy="0" rx="15" ry="10" fill="#FFB3BA" opacity="0.5"/>
	</g>
	
	<!-- Text -->
	<text x="${width/2}" y="${height - 40}" 
		  font-family="system-ui, -apple-system, sans-serif" 
		  font-size="${fontSize}" 
		  font-weight="600"
		  fill="#333" 
		  text-anchor="middle">
		${label}
	</text>
	
	<!-- Subtle border -->
	<rect width="${width}" height="${height}" fill="none" stroke="#FFB3BA" stroke-width="2" opacity="0.3"/>
</svg>`;
}

// Generate placeholder screenshots
export function generatePlaceholders() {
	const screenshots = [
		{ width: 1280, height: 720, filename: 'screenshot-1.png', label: 'TalkType - Voice to Text' },
		{ width: 720, height: 1280, filename: 'screenshot-mobile.png', label: 'TalkType Mobile' }
	];
	
	return screenshots.map(({ width, height, filename, label }) => ({
		filename,
		svg: createPlaceholderSVG(width, height, label)
	}));
}