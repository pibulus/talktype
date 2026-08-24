import { describe, expect, it } from 'vitest';
import { getAccessory, getAccessoryForPromptStyle } from './accessories.js';

describe('Ghost Accessories', () => {
	it('maps prompt styles to correct accessories', () => {
		expect(getAccessoryForPromptStyle('surlyPirate')).toBe('pirate-patch');
		expect(getAccessoryForPromptStyle('quillAndInk')).toBe('monocle');
		expect(getAccessoryForPromptStyle('custom')).toBe('sparkles');
		expect(getAccessoryForPromptStyle('standard')).toBe('none');
		expect(getAccessoryForPromptStyle('unknown')).toBe('none');
	});

	it('returns accessory SVG data', () => {
		const pirate = getAccessory('pirate-patch');
		expect(pirate.label).toBe('Pirate patch');
		expect(pirate.svg).toContain('stroke-width');

		const monocle = getAccessory('monocle');
		expect(monocle.label).toBe('Monocle');
		expect(monocle.svg).toContain('cx="638"');
		expect(monocle.svg).toContain('cy="464"');

		const sparkles = getAccessory('sparkles');
		expect(sparkles.label).toBe('Sparkles');
		expect(sparkles.svg).toContain('512');

		const none = getAccessory('none');
		expect(none.svg).toBe('');
	});
});
