import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { get as getEntry, set as setEntry, clearExpired } from './fileStore.js';

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 60;

function parsePositiveNumber(value, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getRateLimitConfig(options = {}) {
	return {
		windowMs: parsePositiveNumber(
			options.windowMs ?? env.API_RATE_WINDOW_MS,
			DEFAULT_RATE_LIMIT_WINDOW_MS
		),
		max: parsePositiveNumber(options.max ?? env.API_RATE_LIMIT, DEFAULT_RATE_LIMIT_MAX),
		bucket: options.bucket || 'global'
	};
}

export function isRateLimitEnabled(config = getRateLimitConfig()) {
	return config.max > 0 && config.windowMs > 0;
}

export async function enforceRateLimit(event, options = {}) {
	const { windowMs, max, bucket } = getRateLimitConfig(options);
	if (!isRateLimitEnabled({ windowMs, max })) {
		return null;
	}

	await clearExpired(windowMs);

	const key = `${bucket}:${getClientKey(event)}`;
	const now = Date.now();

	let entry = (await getEntry(key)) ?? { count: 0, windowStart: now };

	if (now - entry.windowStart > windowMs) {
		entry = { count: 0, windowStart: now };
	}

	entry.count += 1;
	await setEntry(key, entry);

	if (entry.count > max) {
		const retryAfterMs = Math.max(0, windowMs - (now - entry.windowStart));
		return json(
			{
				error: 'Give TalkType a moment, then try again.',
				retry_after_ms: retryAfterMs
			},
			{
				status: 429,
				headers: {
					'Retry-After': String(Math.ceil(retryAfterMs / 1000))
				}
			}
		);
	}

	return null;
}

export function getClientKey(event) {
	if (event.getClientAddress) {
		const addr = event.getClientAddress();
		if (addr) return addr;
	}

	const forwarded = event.request.headers.get('x-forwarded-for');
	if (forwarded) {
		return forwarded.split(',')[0]?.trim() || 'unknown';
	}

	return event.request.headers.get('cf-connecting-ip') ?? 'unknown';
}
