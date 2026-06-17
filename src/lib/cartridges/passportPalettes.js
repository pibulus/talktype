/**
 * Passport palettes — modular, vibrant theme system for the supporter card.
 *
 * Each supporter gets a deterministic *themed* palette (not one washed pastel)
 * derived from their vault hash. Palettes are rich and saturated by design —
 * the card should feel like a collectible holo, not an office badge.
 *
 * Palette shape:
 *   name      — human label (kept for debugging / future "your card: Sunset")
 *   bg        — array of 2-3 hex stops for the main diagonal gradient
 *   accent    — punchy colour for chips / shape pattern
 *   ink       — text colour that stays legible on this bg
 *   inkSoft   — secondary text colour
 *   glow      — colour for the outer bloom / shadow tint
 *   avatar    — DiceBear collection key (see passportAvatar.js)
 */

export const PASSPORT_PALETTES = [
	{
		name: 'Sunset',
		bg: ['#ff9a8b', '#ff6a88', '#ff99ac'],
		accent: '#ffd166',
		ink: '#3d1029',
		inkSoft: 'rgba(61, 16, 41, 0.66)',
		glow: '#ff6a88',
		avatar: 'thumbs'
	},
	{
		name: 'Miami',
		bg: ['#f9d423', '#ff6b6b', '#4ecdc4'],
		accent: '#ff6b6b',
		ink: '#15323a',
		inkSoft: 'rgba(21, 50, 58, 0.64)',
		glow: '#ff6b6b',
		avatar: 'thumbs'
	},
	{
		name: 'Lavender',
		bg: ['#a18cd1', '#fbc2eb', '#c2a8f5'],
		accent: '#7c5cff',
		ink: '#26143f',
		inkSoft: 'rgba(38, 20, 63, 0.62)',
		glow: '#9370db',
		avatar: 'adventurer'
	},
	{
		name: 'Pool',
		bg: ['#43e0c7', '#3fb8ff', '#6a8bff'],
		accent: '#ffe066',
		ink: '#0c2a3a',
		inkSoft: 'rgba(12, 42, 58, 0.62)',
		glow: '#3fb8ff',
		avatar: 'adventurer'
	},
	{
		name: 'Risograph',
		bg: ['#ff48b0', '#7b5cff', '#0078bf'],
		accent: '#ffe800',
		ink: '#ffffff',
		inkSoft: 'rgba(255, 255, 255, 0.82)',
		glow: '#ff48b0',
		avatar: 'thumbs'
	},
	{
		name: 'Mango',
		bg: ['#ffd200', '#ff7e5f', '#feb47b'],
		accent: '#ff5e62',
		ink: '#3a1605',
		inkSoft: 'rgba(58, 22, 5, 0.6)',
		glow: '#ff7e5f',
		avatar: 'thumbs'
	},
	{
		name: 'Grape Soda',
		bg: ['#c471ed', '#f64f59', '#7c5cff'],
		accent: '#ffd166',
		ink: '#ffffff',
		inkSoft: 'rgba(255, 255, 255, 0.8)',
		glow: '#c471ed',
		avatar: 'adventurer'
	},
	{
		name: 'Spearmint',
		bg: ['#2af598', '#08c2c2', '#43e0c7'],
		accent: '#ff8fab',
		ink: '#073227',
		inkSoft: 'rgba(7, 50, 39, 0.6)',
		glow: '#08c2c2',
		avatar: 'adventurer'
	}
];

// Soft, dashed placeholder used before a real supporter identity exists.
export const PLACEHOLDER_PALETTE = {
	name: 'Pending',
	bg: ['#fff1f2', '#ffe4ef', '#ffeede'],
	accent: '#f9a8d4',
	ink: '#6b4a55',
	inkSoft: 'rgba(107, 74, 85, 0.6)',
	glow: '#f9a8d4',
	avatar: 'thumbs'
};

/**
 * Convert a #rrggbb (or #rgb) hex colour to an `rgba(r, g, b, a)` string.
 * Used to pre-mix glow/accent alphas in JS so the card never relies on CSS
 * `color-mix()` at render time (unsupported before Safari 16.2 / Chrome 111).
 * Non-hex input is returned as a `transparent` fallback.
 */
export function hexToRgba(hex, alpha = 1) {
	if (typeof hex !== 'string') return 'transparent';
	let h = hex.trim().replace(/^#/, '');
	if (h.length === 3) h = h.replace(/./g, (c) => c + c);
	if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return 'transparent';
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	const a = Math.max(0, Math.min(1, alpha));
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function parseHex(hex) {
	if (typeof hex !== 'string') return null;
	let h = hex.trim().replace(/^#/, '');
	if (h.length === 3) h = h.replace(/./g, (c) => c + c);
	if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Blend `hex` toward `toward` (default white) by `amount` (0..1 of `hex`).
 * `mixHex('#ff6a88', 0.45)` ≈ `color-mix(in srgb, #ff6a88 45%, #fff)`.
 * Returns an `rgb()` string; falls back to the original input on bad hex.
 */
export function mixHex(hex, amount = 0.5, toward = '#ffffff') {
	const a = parseHex(hex);
	const b = parseHex(toward);
	if (!a || !b) return hex;
	const t = Math.max(0, Math.min(1, amount));
	const m = (i) => Math.round(a[i] * t + b[i] * (1 - t));
	return `rgb(${m(0)}, ${m(1)}, ${m(2)})`;
}

/**
 * Pick a deterministic palette from a vault hash.
 * Uses a hash segment distinct from the name/avatar segments so the palette
 * varies independently of the generated name.
 */
export function selectPassportPalette(vaultHash) {
	const hash = typeof vaultHash === 'string' ? vaultHash.trim() : '';
	if (!hash) return PLACEHOLDER_PALETTE;

	const segment = hash.slice(48, 56) || hash.slice(0, 8) || hash;
	const parsed = Number.parseInt(segment, 16);
	let index;
	if (Number.isFinite(parsed)) {
		index = parsed % PASSPORT_PALETTES.length;
	} else {
		let total = 0;
		for (let i = 0; i < segment.length; i += 1) {
			total += segment.charCodeAt(i) * (i + 1);
		}
		index = total % PASSPORT_PALETTES.length;
	}
	return PASSPORT_PALETTES[index];
}
