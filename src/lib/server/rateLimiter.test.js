import { describe, expect, it } from 'vitest';
import { enforceRateLimit, getClientKey, getRateLimitConfig } from './rateLimiter.js';

function createEvent(address = '203.0.113.10', options = {}) {
	return {
		request: new Request('https://talktype.test/api/transcribe', {
			headers: {
				'x-forwarded-for': address,
				...(options.headers || {})
			}
		}),
		...(options.adapterAddress
			? {
					getClientAddress: () => options.adapterAddress
				}
			: {})
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

	it('prefers proxy client headers over the adapter socket address', () => {
		const event = createEvent('203.0.113.12', {
			adapterAddress: '127.0.0.1'
		});

		expect(getClientKey(event)).toBe('203.0.113.12');
	});

	it('uses the proxy-written forwarded entry, not a client-spoofed prefix', () => {
		// A client sending its own X-Forwarded-For gets it prepended by the
		// reverse proxy; only the rightmost entry is trustworthy.
		const event = createEvent('6.6.6.6, 203.0.113.12', {
			adapterAddress: '127.0.0.1'
		});

		expect(getClientKey(event)).toBe('203.0.113.12');
	});

	it('uses Cloudflare client IP before forwarded fallbacks', () => {
		const event = createEvent('198.51.100.44', {
			adapterAddress: '127.0.0.1',
			headers: {
				'cf-connecting-ip': '203.0.113.13'
			}
		});

		expect(getClientKey(event)).toBe('203.0.113.13');
	});

	it('separates requests by forwarded client instead of shared proxy address', async () => {
		const bucket = `proxy-${Date.now()}-${Math.random()}`;
		const firstClient = createEvent('203.0.113.14', { adapterAddress: '127.0.0.1' });
		const secondClient = createEvent('203.0.113.15', { adapterAddress: '127.0.0.1' });

		await expect(
			enforceRateLimit(firstClient, { bucket, windowMs: 60_000, max: 1 })
		).resolves.toBeNull();
		await expect(
			enforceRateLimit(secondClient, { bucket, windowMs: 60_000, max: 1 })
		).resolves.toBeNull();

		const blocked = await enforceRateLimit(firstClient, { bucket, windowMs: 60_000, max: 1 });
		expect(blocked.status).toBe(429);
	});
});
