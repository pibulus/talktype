import { describe, expect, it } from 'vitest';
import { getAudioDisplayLevel, clampLevel } from './audioLevel.js';

// Representative getByteFrequencyData for fftSize 256 (128 bins, ~187Hz each).
// Speech energy sits in bins 0..22; everything above decays toward silence.
function frame(lowBins, midBins) {
	return Array.from({ length: 128 }, (_, i) => {
		const wobble = ((i * 37) % 13) - 6;
		if (i < 8) return Math.max(0, Math.min(255, lowBins + wobble));
		if (i < 22) return Math.max(0, Math.min(255, midBins + wobble));
		return Math.max(0, Math.round(midBins * 0.55 * Math.exp(-(i - 22) / 9)) + (wobble >> 1));
	});
}

const SILENCE = frame(14, 7);
const QUIET = frame(115, 60);
const NORMAL = frame(185, 115);
const LOUD = frame(235, 175);
const SHOUTING = frame(253, 230);

describe('getAudioDisplayLevel', () => {
	it('reads room tone as near-silent', () => {
		expect(getAudioDisplayLevel(SILENCE)).toBeLessThan(10);
	});

	// The regression this file exists for: every one of these used to return 100,
	// so the bars maxed out the moment anyone spoke and never moved again.
	it('leaves headroom above quiet speech', () => {
		const level = getAudioDisplayLevel(QUIET);
		expect(level).toBeGreaterThan(25);
		expect(level).toBeLessThan(55);
	});

	it('puts normal speech in the upper-middle, not at the ceiling', () => {
		const level = getAudioDisplayLevel(NORMAL);
		expect(level).toBeGreaterThan(60);
		expect(level).toBeLessThan(85);
	});

	it('saves the top of the scale for a genuinely raised voice', () => {
		expect(getAudioDisplayLevel(LOUD)).toBeGreaterThan(85);
		expect(getAudioDisplayLevel(SHOUTING)).toBeGreaterThan(95);
	});

	it('rises monotonically across the whole range', () => {
		const levels = [SILENCE, QUIET, NORMAL, LOUD, SHOUTING].map(getAudioDisplayLevel);
		for (let i = 1; i < levels.length; i++) {
			expect(levels[i]).toBeGreaterThan(levels[i - 1]);
		}
	});

	it('handles empty and missing input without throwing', () => {
		expect(getAudioDisplayLevel([])).toBe(0);
		expect(getAudioDisplayLevel(null)).toBe(0);
	});

	it('clamps to 0-100', () => {
		expect(clampLevel(-20)).toBe(0);
		expect(clampLevel(420)).toBe(100);
	});
});
