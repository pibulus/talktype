import { describe, expect, it } from 'vitest';
import {
	PASSPORT_PALETTES,
	PLACEHOLDER_PALETTE,
	selectPassportPalette
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
