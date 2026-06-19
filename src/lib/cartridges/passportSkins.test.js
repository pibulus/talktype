import { describe, expect, it } from 'vitest';
import {
	selectSkin,
	selectNamedSkin,
	shuffleSkinSeed,
	NAMED_SKINS,
	SKIN_AXES
} from './passportSkins.js';

const HASH = 'abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcd';

describe('passport skins', () => {
	it('is deterministic for the same hash', () => {
		expect(selectSkin(HASH)).toEqual(selectSkin(HASH));
	});

	it('resolves one valid option per axis from the hash', () => {
		const { choices } = selectSkin(HASH);
		expect(Object.keys(SKIN_AXES.holo)).toContain(choices.holo);
		expect(Object.keys(SKIN_AXES.frame)).toContain(choices.frame);
		expect(Object.keys(SKIN_AXES.texture)).toContain(choices.texture);
		expect(Object.keys(SKIN_AXES.type)).toContain(choices.type);
		expect(SKIN_AXES.avatar).toContain(choices.avatar);
	});

	it('produces a CSS var string and an avatar style', () => {
		const skin = selectSkin(HASH);
		expect(skin.varString).toContain('--holo-');
		expect(skin.varString).toContain('--f-');
		expect(skin.varString).toContain('--tx-');
		expect(skin.varString).toContain('--t-');
		expect(['thumbs', 'adventurer', 'bottts', 'funEmoji']).toContain(skin.avatarStyle);
	});

	it('falls back to a calm default for an empty hash', () => {
		const skin = selectSkin('');
		expect(skin.name).toBe('pending');
		expect(skin.palette.name).toBe('Pending');
	});

	it('resolves every named preset to valid choices', () => {
		for (const name of Object.keys(NAMED_SKINS)) {
			const skin = selectNamedSkin(name, HASH);
			expect(skin.choices).toEqual(NAMED_SKINS[name]);
			expect(skin.varString.length).toBeGreaterThan(0);
		}
	});

	it('shuffle is reproducible per seed and varies across seeds', () => {
		expect(shuffleSkinSeed(7)).toEqual(shuffleSkinSeed(7));
		const labels = new Set(
			Array.from({ length: 12 }, (_, i) => {
				const c = shuffleSkinSeed(i).choices;
				return `${c.holo}/${c.frame}/${c.texture}/${c.type}`;
			})
		);
		// Expect real entropy: not all 12 seeds collapse to one combo.
		expect(labels.size).toBeGreaterThan(3);
	});

	it('shuffle varies the palette across seeds (regression: was always Sunset)', () => {
		const palettes = new Set(Array.from({ length: 20 }, (_, i) => shuffleSkinSeed(i).palette.name));
		expect(palettes.size).toBeGreaterThan(3);
	});

	it('caps dodging holos on white-ink palettes so they do not blow out', () => {
		// Find a hash that lands a white-ink palette + a color-dodge/screen holo.
		for (let n = 0; n < 4000; n += 1) {
			const h = n.toString(16).padStart(8, '0').repeat(8).slice(0, 64);
			const skin = selectSkin(h);
			const blend = skin.vars['--holo-blend'];
			if (skin.palette.ink === '#ffffff' && (blend === 'color-dodge' || blend === 'screen')) {
				expect(Number(skin.vars['--holo-rest'])).toBeLessThanOrEqual(0.26);
				return;
			}
		}
	});
});
