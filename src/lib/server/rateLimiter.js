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

function cleanClientAddress(value) {
	const candidate = value?.toString().trim();
	if (!candidate) return '';

	return candidate
		.replace(/^["']|["']$/g, '')
		.replace(/^\[(.+)\](?::\d+)?$/, '$1')
		.replace(/^([^:]+):\d+$/, '$1')
		.trim();
}

// The rightmost entry is the one written by our own reverse proxy; leftmost
// entries are client-supplied and trivially spoofable for bucket-hopping.
function getLastHeaderAddress(value) {
	const candidate = value
		?.split(',')
		.map((part) => cleanClientAddress(part))
		.filter(Boolean)
		.pop();

	return candidate || '';
}

function getForwardedHeaderAddress(value) {
	if (!value) return '';

	let lastAddress = '';
	for (const part of value.split(',')) {
		const match = part.match(/(?:^|;)\s*for=([^;]+)/i);
		const address = cleanClientAddress(match?.[1]);
		if (address) lastAddress = address;
	}

	return lastAddress;
}

const MAX_CLIENT_KEY_LENGTH = 64;

export function getClientKey(event) {
	const headers = event.request.headers;
	const headerAddress =
		cleanClientAddress(headers.get('cf-connecting-ip')) ||
		cleanClientAddress(headers.get('x-real-ip')) ||
		getLastHeaderAddress(headers.get('x-forwarded-for')) ||
		getForwardedHeaderAddress(headers.get('forwarded'));

	if (headerAddress) return headerAddress.slice(0, MAX_CLIENT_KEY_LENGTH);

	if (event.getClientAddress) {
		const addr = event.getClientAddress();
		if (addr) return addr.slice(0, MAX_CLIENT_KEY_LENGTH);
	}

	return 'unknown';
}
