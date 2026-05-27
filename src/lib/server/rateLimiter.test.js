import { describe, expect, it } from 'vitest';
import { enforceRateLimit, getRateLimitConfig } from './rateLimiter.js';

function createEvent(address = '203.0.113.10') {
	return {
		request: new Request('https://talktype.test/api/transcribe', {
			headers: {
				'x-forwarded-for': address
			}
		})
	};
}

describe('rate limiter', () => {
	it('keeps separate buckets for expensive endpoints', async () => {
		const bucket = `test-${Date.now()}-${Math.random()}`;
		const event = createEvent();

		await expect(enforceRateLimit(event, { bucket, windowMs: 60_000, max: 1 })).resolves.toBeNull();

		const blocked = await enforceRateLimit(event, { bucket, windowMs: 60_000, max: 1 });

		expect(blocked.status).toBe(429);
		expect(blocked.headers.get('Retry-After')).toBeTruthy();
	});

	it('supports disabled buckets', async () => {
		const bucket = `disabled-${Date.now()}-${Math.random()}`;
		const event = createEvent('203.0.113.11');

		await expect(enforceRateLimit(event, { bucket, windowMs: 60_000, max: 0 })).resolves.toBeNull();
		await expect(enforceRateLimit(event, { bucket, windowMs: 60_000, max: 0 })).resolves.toBeNull();
	});

	it('parses invalid overrides back to safe defaults', () => {
		expect(getRateLimitConfig({ windowMs: Number.NaN, max: Number.NaN })).toMatchObject({
			windowMs: 60_000,
			max: 60
		});
	});
});
