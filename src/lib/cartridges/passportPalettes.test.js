import { describe, expect, it } from 'vitest';
import {
	PASSPORT_PALETTES,
	PLACEHOLDER_PALETTE,
	selectPassportPalette,
	hexToRgba,
	mixHex
} from './passportPalettes.js';

describe('passport palette selection', () => {
	const hash = 'abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcd';

	it('is deterministic for the same hash', () => {
		expect(selectPassportPalette(hash)).toBe(selectPassportPalette(hash));
	});

	it('returns a real palette from the set for a valid hash', () => {
		expect(PASSPORT_PALETTES).toContain(selectPassportPalette(hash));
	});

	it('falls back to the placeholder palette for an empty hash', () => {
		expect(selectPassportPalette('')).toBe(PLACEHOLDER_PALETTE);
		expect(selectPassportPalette(undefined)).toBe(PLACEHOLDER_PALETTE);
	});

	it('every palette has the fields the card needs', () => {
		for (const palette of [...PASSPORT_PALETTES, PLACEHOLDER_PALETTE]) {
			expect(Array.isArray(palette.bg)).toBe(true);
			expect(palette.bg.length).toBeGreaterThanOrEqual(2);
			expect(palette.accent).toBeTruthy();
			expect(palette.ink).toBeTruthy();
			expect(palette.inkSoft).toBeTruthy();
			expect(palette.glow).toBeTruthy();
			expect(['funEmoji', 'thumbs', 'adventurer', 'bottts']).toContain(palette.avatar);
		}
	});
});

describe('colour helpers (color-mix replacements)', () => {
	it('hexToRgba converts 6- and 3-digit hex with clamped alpha', () => {
		expect(hexToRgba('#ff6a88', 0.38)).toBe('rgba(255, 106, 136, 0.38)');
		expect(hexToRgba('#fff', 1)).toBe('rgba(255, 255, 255, 1)');
		expect(hexToRgba('#000000', 2)).toBe('rgba(0, 0, 0, 1)');
		expect(hexToRgba('#000000', -1)).toBe('rgba(0, 0, 0, 0)');
	});

	it('hexToRgba returns transparent for bad input', () => {
		expect(hexToRgba('garbage')).toBe('transparent');
		expect(hexToRgba(undefined)).toBe('transparent');
		expect(hexToRgba('#12')).toBe('transparent');
	});

	it('mixHex blends toward white by amount', () => {
		expect(mixHex('#000000', 0)).toBe('rgb(255, 255, 255)');
		expect(mixHex('#000000', 1)).toBe('rgb(0, 0, 0)');
		expect(mixHex('#ffffff', 0.5)).toBe('rgb(255, 255, 255)');
	});

	it('mixHex returns the original input on bad hex', () => {
		expect(mixHex('nope', 0.5)).toBe('nope');
	});

	it('every palette glow/accent is valid hex (so the helpers never fall back)', () => {
		for (const p of [...PASSPORT_PALETTES, PLACEHOLDER_PALETTE]) {
			expect(hexToRgba(p.glow, 0.5)).not.toBe('transparent');
			expect(hexToRgba(p.accent, 0.5)).not.toBe('transparent');
		}
	});
});
