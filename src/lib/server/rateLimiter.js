import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { get as getEntry, set as setEntry, clearExpired } from './fileStore.js';

const RATE_LIMIT_WINDOW_MS = Number(env.API_RATE_WINDOW_MS ?? '60000');
const RATE_LIMIT_MAX = Number(env.API_RATE_LIMIT ?? '60');

export function getRateLimitConfig() {
	return { windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX };
}

export function isRateLimitEnabled() {
	return RATE_LIMIT_MAX > 0 && RATE_LIMIT_WINDOW_MS > 0;
}

export async function enforceRateLimit(event) {
	if (!isRateLimitEnabled()) {
		return null;
	}

	const { windowMs, max } = getRateLimitConfig();
	await clearExpired(windowMs);

	const key = getClientKey(event);
	const now = Date.now();

	let entry = (await getEntry(key)) ?? { count: 0, windowStart: now };

	if (now - entry.windowStart > windowMs) {
		entry = { count: 0, windowStart: now };
	}

	entry.count += 1;
	await setEntry(key, entry);

	if (entry.count > max) {
		return json(
			{
				error: 'Too many requests. Slow down a little.',
				retry_after_ms: windowMs - (now - entry.windowStart)
			},
			{ status: 429 }
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
