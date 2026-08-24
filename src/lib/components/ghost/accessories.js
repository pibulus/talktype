// ===================================================================
// GHOST ACCESSORIES — the wardrobe (Pirate patch, Victorian monocle, Sparkles)
// ===================================================================
//
// STYLE CONTRACT: Solid ink (#1e1714) matching the ghost outline weight.
// Authored in the same 0 0 1024 1024 viewBox as the ghost paths:
//   - Left eye center: (388, 462)
//   - Right eye center: (638, 464)
//   - Head crown line: y ≈ 104, x ≈ 512

const INK = '#1e1714';

export const ACCESSORIES = {
	none: {
		label: 'No accessory',
		svg: ''
	},

	// Pirate eye-patch — fitted over left eye (center 388, 462)
	'pirate-patch': {
		label: 'Pirate patch',
		svg: `
      <g stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">
        <!-- Strap across the forehead and temple -->
        <path d="M 210 320 Q 388 430 740 330" fill="none" stroke-width="20"/>
        <!-- Patch cup over left eye -->
        <path d="M 326 430
                 C 326 390 350 375 390 375
                 C 430 375 454 395 454 435
                 C 454 485 425 545 388 545
                 C 350 545 326 480 326 430 Z" fill="${INK}" stroke-width="12"/>
      </g>
    `
	},

	// Monocle — fitted over right eye (center 638, 464)
	monocle: {
		label: 'Monocle',
		svg: `
      <g stroke="${INK}" fill="none" stroke-linecap="round">
        <!-- Lens & thick frame -->
        <circle cx="638" cy="464" r="88" stroke-width="22" fill="rgba(255,255,255,0.22)"/>
        <!-- Hanging chain down to side -->
        <path d="M 724 476 Q 765 570 705 660" stroke-width="12"/>
      </g>
    `
	},

	// Sparkles — twinkling stars floating around the crown for BYO / custom mode
	sparkles: {
		label: 'Sparkles',
		svg: `
      <g fill="${INK}" stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">
        <!-- Big top sparkle -->
        <path d="M 512 28 Q 512 70 538 86 Q 512 102 512 144 Q 512 102 486 86 Q 512 70 512 28 Z" stroke-width="8"/>
        <!-- Left sparkle -->
        <path d="M 310 160 Q 310 190 326 200 Q 310 210 310 240 Q 310 210 294 200 Q 310 190 310 160 Z" stroke-width="6"/>
        <!-- Right sparkle -->
        <path d="M 714 150 Q 714 180 730 190 Q 714 200 714 230 Q 714 200 698 190 Q 714 180 714 150 Z" stroke-width="6"/>
        <!-- Tiny dot accents -->
        <circle cx="410" cy="110" r="9" stroke="none"/>
        <circle cx="620" cy="95" r="9" stroke="none"/>
      </g>
    `
	}
};

export function getAccessoryForPromptStyle(style) {
	switch (style) {
		case 'surlyPirate':
			return 'pirate-patch';
		case 'quillAndInk':
			return 'monocle';
		case 'custom':
			return 'sparkles';
		default:
			return 'none';
	}
}

export function getAccessory(name) {
	return ACCESSORIES[name] || ACCESSORIES.none;
}
