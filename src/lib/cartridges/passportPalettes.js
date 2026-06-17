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
