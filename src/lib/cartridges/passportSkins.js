/**
 * Passport skins — a modular, orthogonal theming system for the supporter card.
 *
 * The card aesthetic is decomposed into independent AXES. Each axis is a small
 * list of options, and every option is just a bag of CSS custom properties
 * (plus, for the avatar axis, a DiceBear collection key). The component spreads
 * the resolved vars into its inline style and the CSS reacts — no per-skin
 * markup branches.
 *
 * A "skin" is one coordinate in this space: one option chosen per axis. Because
 * the axes are independent, a handful of small definitions multiply into
 * thousands of combinations. Each supporter gets a deterministic coordinate
 * from their vault hash (full shuffle per axis → every card one-of-a-kind).
 *
 * Named presets (NEON_BRUT, HACKER, UNICORN, VIBRANT) are curated coordinates
 * used as anchors / dev previews. `shuffleSkinSeed()` makes a wild one.
 *
 * To add design entropy later: add an option to any axis. Every other axis
 * recombines with it for free.
 */

import { selectPassportPalette, PASSPORT_PALETTES } from './passportPalettes.js';

/* ===================================================================
   AXIS: HOLO — the foil technique. Drives the .holofoil layer via vars.
   --holo-angle      gradient sweep angle
   --holo-size       background-size of the rainbow (bigger = slower sweep)
   --holo-blend      mix-blend-mode of the foil
   --holo-filter     filter applied to the foil
   --holo-rest/-bloom opacity floor + how much pointer movement adds
   --holo-c1..c6     the six spectral stops (so palettes can stay coherent)
   --holo-scan-*     the texture is a separate axis, but holo sets its tint
   =================================================================== */
const SPECTRAL = {
	'--holo-c1': 'hsl(320, 100%, 70%)',
	'--holo-c2': 'hsl(30, 100%, 65%)',
	'--holo-c3': 'hsl(58, 100%, 65%)',
	'--holo-c4': 'hsl(160, 100%, 55%)',
	'--holo-c5': 'hsl(205, 100%, 65%)',
	'--holo-c6': 'hsl(270, 100%, 72%)'
};

const HOLO = {
	rainbow: {
		// Lush full-spectrum metallic sheen (the current "Vibrant" look).
		...SPECTRAL,
		'--holo-angle': '110deg',
		'--holo-size': '400% 400%',
		'--holo-blend': 'color-dodge',
		'--holo-filter': 'brightness(0.95) contrast(1.45) saturate(1.7)',
		'--holo-rest': '0.4',
		'--holo-bloom': '0.55'
	},
	oily: {
		// Oily CRT iridescence — tighter bands, soft-light so it reads on dark.
		'--holo-c1': 'hsl(150, 90%, 55%)',
		'--holo-c2': 'hsl(180, 90%, 55%)',
		'--holo-c3': 'hsl(280, 80%, 60%)',
		'--holo-c4': 'hsl(120, 90%, 50%)',
		'--holo-c5': 'hsl(200, 90%, 55%)',
		'--holo-c6': 'hsl(300, 80%, 58%)',
		'--holo-angle': '125deg',
		'--holo-size': '260% 260%',
		'--holo-blend': 'color-dodge',
		'--holo-filter': 'brightness(0.85) contrast(1.7) saturate(1.5) hue-rotate(0deg)',
		'--holo-rest': '0.34',
		'--holo-bloom': '0.5'
	},
	pearl: {
		// Pearlescent — desaturated, soft, premium. Restrained shimmer.
		'--holo-c1': 'hsl(320, 60%, 88%)',
		'--holo-c2': 'hsl(40, 60%, 88%)',
		'--holo-c3': 'hsl(160, 50%, 88%)',
		'--holo-c4': 'hsl(200, 60%, 90%)',
		'--holo-c5': 'hsl(270, 55%, 90%)',
		'--holo-c6': 'hsl(330, 55%, 90%)',
		'--holo-angle': '105deg',
		'--holo-size': '320% 320%',
		'--holo-blend': 'soft-light',
		'--holo-filter': 'brightness(1.08) contrast(1.05) saturate(1.1)',
		'--holo-rest': '0.18',
		'--holo-bloom': '0.34'
	},
	prismatic: {
		// Prismatic sigil — sharp, high-contrast spectral, screen blend for glow.
		...SPECTRAL,
		'--holo-angle': '135deg',
		'--holo-size': '500% 500%',
		'--holo-blend': 'screen',
		'--holo-filter': 'brightness(1.0) contrast(1.5) saturate(1.8)',
		'--holo-rest': '0.22',
		'--holo-bloom': '0.5'
	}
};

/* ===================================================================
   AXIS: FRAME — border, radius, shadow shape. Drives .passport-card.
   =================================================================== */
// --f-substrate is an overlay tint painted under the content: transparent for
// light frames, a dark wash for terminal so "hacker" reads dark regardless of
// which palette the hash picked. --f-ink-shift flips text toward light on dark.
const FRAME = {
	chunky: {
		'--f-radius': '1.55rem',
		'--f-border': '3px solid rgba(0, 0, 0, 0.78)',
		'--f-shadow': '7px 7px 0 rgba(0, 0, 0, 0.65), 0 18px 40px var(--f-glow-38)',
		'--f-substrate': 'transparent',
		'--f-ink-shift': '0'
	},
	soft: {
		'--f-radius': '1.55rem',
		'--f-border': '2px solid rgba(255, 255, 255, 0.38)',
		'--f-shadow':
			'0 24px 48px var(--f-glow-38), 0 8px 18px var(--f-glow-20), 0 3px 0 rgba(255, 255, 255, 0.22) inset',
		'--f-substrate': 'transparent',
		'--f-ink-shift': '0'
	},
	hairline: {
		'--f-radius': '1.1rem',
		'--f-border': '1px solid rgba(255, 255, 255, 0.55)',
		'--f-shadow': '0 16px 40px var(--f-glow-20), 0 2px 10px rgba(0, 0, 0, 0.06)',
		// 0.22 (was 0.42): a 42% white wash fogged vivid cool gradients to grey.
		'--f-substrate': 'rgba(255, 255, 255, 0.22)',
		'--f-ink-shift': '0'
	},
	terminal: {
		'--f-radius': '0.5rem',
		'--f-border': '1px solid var(--p-accent)',
		'--f-shadow':
			'0 0 0 1px rgba(0, 0, 0, 0.6), 0 0 22px var(--f-glow-38), 0 18px 40px rgba(0, 0, 0, 0.55)',
		'--f-substrate': 'rgba(8, 10, 16, 0.86)',
		'--f-ink-shift': '1'
	}
};

/* ===================================================================
   AXIS: TEXTURE — surface overlay. Drives the .passport-texture layer.
   --tx-image / --tx-size / --tx-blend / --tx-opacity
   =================================================================== */
const NO_TEXTURE = {
	'--tx-image': 'none',
	'--tx-size': 'auto',
	'--tx-blend': 'normal',
	'--tx-opacity': '0'
};
const TEXTURE = {
	none: NO_TEXTURE,
	scanlines: {
		'--tx-image':
			'repeating-linear-gradient(0deg, rgba(0,0,0,0.0) 0px, rgba(0,0,0,0.22) 1px, rgba(0,0,0,0.0) 3px)',
		'--tx-size': '100% 3px',
		'--tx-blend': 'multiply',
		'--tx-opacity': '0.5'
	},
	grain: {
		'--tx-image':
			'repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, rgba(0,0,0,0.05) 0% 50%)',
		'--tx-size': '4px 4px',
		'--tx-blend': 'overlay',
		'--tx-opacity': '0.4'
	},
	halftone: {
		'--tx-image':
			'radial-gradient(rgba(0,0,0,0.18) 22%, transparent 23%)',
		'--tx-size': '7px 7px',
		'--tx-blend': 'multiply',
		'--tx-opacity': '0.4'
	},
	sparkle: {
		'--tx-image':
			'radial-gradient(rgba(255,255,255,0.9) 9%, transparent 10%), radial-gradient(rgba(255,255,255,0.7) 7%, transparent 8%)',
		'--tx-size': '26px 26px, 17px 17px',
		'--tx-blend': 'screen',
		'--tx-opacity': '0.5'
	}
};

/* ===================================================================
   AXIS: TYPE — font, casing, tracking. Drives text in the card.
   =================================================================== */
const TYPE = {
	display: {
		'--t-font': "'Poppins', system-ui, sans-serif",
		'--t-name-size': '1.56rem',
		'--t-name-weight': '900',
		'--t-transform': 'none',
		'--t-tracking': '0'
	},
	mono: {
		'--t-font': "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",
		'--t-name-size': '1.28rem',
		'--t-name-weight': '700',
		'--t-transform': 'uppercase',
		'--t-tracking': '0.04em'
	},
	airy: {
		'--t-font': "'Poppins', system-ui, sans-serif",
		'--t-name-size': '1.4rem',
		// 500 floor: weight 300 lost contrast on saturated gradients (WCAG fail).
		'--t-name-weight': '500',
		'--t-transform': 'none',
		'--t-tracking': '0.12em'
	}
};

/* ===================================================================
   AXIS: AVATAR — DiceBear collection (not a CSS var; a style key).
   thumbs/adventurer are the cute character styles Pablo liked.
   =================================================================== */
const AVATAR = ['thumbs', 'adventurer', 'bottts', 'funEmoji'];

/* The axis registry — order matters only for stable hash mapping. */
export const SKIN_AXES = {
	holo: HOLO,
	frame: FRAME,
	texture: TEXTURE,
	type: TYPE,
	avatar: AVATAR
};

/* ===================================================================
   NAMED PRESETS — curated coordinates. Used as anchors / previews.
   Each names an option per axis (palette index is optional; if omitted
   the palette is taken from the hash like everything else).
   =================================================================== */
export const NAMED_SKINS = {
	vibrant: { holo: 'rainbow', frame: 'soft', texture: 'sparkle', type: 'display', avatar: 'thumbs' },
	neonBrut: { holo: 'rainbow', frame: 'chunky', texture: 'halftone', type: 'display', avatar: 'thumbs' },
	hacker: { holo: 'oily', frame: 'terminal', texture: 'scanlines', type: 'mono', avatar: 'bottts' },
	unicorn: { holo: 'pearl', frame: 'hairline', texture: 'none', type: 'airy', avatar: 'adventurer' }
};

// Keys of each axis, cached for indexable selection.
const AXIS_KEYS = {
	holo: Object.keys(HOLO),
	frame: Object.keys(FRAME),
	texture: Object.keys(TEXTURE),
	type: Object.keys(TYPE),
	avatar: AVATAR
};

// Pull an integer from a slice of the hash (hex), fallback to char-sum.
function hashSlice(hash, start, len = 4) {
	const seg = hash.slice(start, start + len) || hash.slice(0, len) || hash;
	const parsed = Number.parseInt(seg, 16);
	if (Number.isFinite(parsed)) return parsed;
	let total = 0;
	for (let i = 0; i < seg.length; i += 1) total += seg.charCodeAt(i) * (i + 1);
	return total;
}

// Resolve a {holo, frame, texture, type, avatar} choice-map into a single
// flat object of CSS vars (+ the avatar style key).
function resolveVars(choices) {
	const vars = {};
	Object.assign(vars, HOLO[choices.holo] || HOLO.rainbow);
	Object.assign(vars, FRAME[choices.frame] || FRAME.soft);
	Object.assign(vars, TEXTURE[choices.texture] || TEXTURE.sparkle);
	Object.assign(vars, TYPE[choices.type] || TYPE.display);
	return vars;
}

/**
 * Deterministically pick a full skin coordinate from a vault hash.
 * Each axis reads a DISTINCT hash slice so they shuffle independently.
 *
 * @returns {{ name, palette, choices, vars, avatarStyle, varString }}
 */
export function selectSkin(vaultHash) {
	const hash = typeof vaultHash === 'string' && vaultHash.trim() ? vaultHash.trim() : '';
	const palette = selectPassportPalette(hash);

	if (!hash) {
		// Placeholder → calm vibrant defaults.
		const choices = NAMED_SKINS.vibrant;
		return finalize('pending', palette, choices);
	}

	const choices = {
		holo: AXIS_KEYS.holo[hashSlice(hash, 8) % AXIS_KEYS.holo.length],
		frame: AXIS_KEYS.frame[hashSlice(hash, 16) % AXIS_KEYS.frame.length],
		texture: AXIS_KEYS.texture[hashSlice(hash, 24) % AXIS_KEYS.texture.length],
		type: AXIS_KEYS.type[hashSlice(hash, 32) % AXIS_KEYS.type.length],
		avatar: AXIS_KEYS.avatar[hashSlice(hash, 40) % AXIS_KEYS.avatar.length]
	};
	return finalize('shuffle', palette, choices);
}

/**
 * Resolve a named preset (e.g. 'hacker') against a hash for the palette.
 * Useful for forcing a skin in dev/preview or future user-pick.
 */
export function selectNamedSkin(name, vaultHash) {
	const choices = NAMED_SKINS[name] || NAMED_SKINS.vibrant;
	const palette = selectPassportPalette(vaultHash);
	return finalize(name, palette, choices);
}

/**
 * A fully random skin for shuffle/preview. `seed` only varies which options
 * get picked deterministically (no Math.random — keeps things reproducible
 * and SSR-safe). Pass an incrementing integer to walk the space.
 */
export function shuffleSkinSeed(seed = 0) {
	const pick = (arr, salt) => arr[Math.abs((seed * 2654435761 + salt * 40503) >>> 0) % arr.length];
	const choices = {
		holo: pick(AXIS_KEYS.holo, 1),
		frame: pick(AXIS_KEYS.frame, 2),
		texture: pick(AXIS_KEYS.texture, 3),
		type: pick(AXIS_KEYS.type, 4),
		avatar: pick(AXIS_KEYS.avatar, 5)
	};
	// 18000 % 8 === 0 made every seed pick palette[0]; use an odd multiplier.
	const palette =
		PASSPORT_PALETTES[Math.abs((seed * 2654435761 + 37) >>> 0) % PASSPORT_PALETTES.length];
	return finalize('shuffle', palette, choices);
}

// White-ink palettes (Risograph, Grape Soda) sit on vivid saturated gradients.
// The dodging holos (color-dodge / screen) blow those backgrounds toward white
// and bury the white text. Cap their intensity so the foil stays iridescent
// rather than bleaching the card.
const WHITE_INK = '#ffffff';
function guardHoloForInk(vars, palette) {
	if (palette.ink !== WHITE_INK) return vars;
	const blend = vars['--holo-blend'];
	if (blend === 'color-dodge' || blend === 'screen') {
		return {
			...vars,
			'--holo-rest': '0.24',
			'--holo-bloom': '0.36'
		};
	}
	return vars;
}

function finalize(name, palette, choices) {
	const vars = guardHoloForInk(resolveVars(choices), palette);
	const varString = Object.entries(vars)
		.map(([k, v]) => `${k}: ${v}`)
		.join('; ');
	return {
		name,
		palette,
		choices,
		vars,
		// Always set from the AVATAR axis; palette.avatar is a pre-refactor legacy field.
		avatarStyle: choices.avatar,
		varString
	};
}
