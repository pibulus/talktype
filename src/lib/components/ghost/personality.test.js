import { describe, expect, it } from 'vitest';
import {
	buildGhostPersonality,
	getDayOfYear,
	getLocalDayKey,
	pickSpecialAnimation
} from './personality.js';

describe('ghost personality', () => {
	it('uses the local calendar day as a deterministic personality input', () => {
		const date = new Date(2026, 4, 27, 13, 30);

		expect(getLocalDayKey(date)).toBe('2026-05-27');
		expect(getDayOfYear(date)).toBe(147);
	});

	it('keeps one day stable for a seed and changes across days', () => {
		const first = buildGhostPersonality({ seed: 7, date: new Date(2026, 4, 27, 9) });
		const again = buildGhostPersonality({ seed: 7, date: new Date(2026, 4, 27, 23) });
		const tomorrow = buildGhostPersonality({ seed: 7, date: new Date(2026, 4, 28, 9) });

		expect(first).toEqual(again);
		expect(first.style).not.toBe(tomorrow.style);
	});

	it('keeps motion variables subtle', () => {
		const personality = buildGhostPersonality({ seed: 12, date: new Date(2026, 4, 27) });

		expect(personality.values.floatY).toBeLessThanOrEqual(-2.2);
		expect(personality.values.floatY).toBeGreaterThanOrEqual(-4);
		expect(Math.abs(personality.values.floatX)).toBeLessThanOrEqual(0.75);
		expect(Math.abs(personality.values.floatTilt)).toBeLessThanOrEqual(0.55);
		expect(personality.values.floatScale).toBeGreaterThanOrEqual(1.001);
		expect(personality.values.floatScale).toBeLessThanOrEqual(1.005);
	});

	it('picks only supported special animations', () => {
		const allowed = new Set(['spin', 'peek', 'shimmy']);

		for (let counter = 0; counter < 20; counter += 1) {
			expect(allowed.has(pickSpecialAnimation(3, counter, new Date(2026, 4, 27)))).toBe(true);
		}
	});
});
