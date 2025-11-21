import { env } from '$env/dynamic/private';
import { SESSION_COOKIE_NAME, validateSession } from './sessionStore.js';

const allowedOrigins = (env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

const RATE_LIMIT_WINDOW_MS = Number(env.API_RATE_WINDOW_MS ?? '60000');
const RATE_LIMIT_MAX = Number(env.API_RATE_LIMIT ?? '60');
const authToken = env.API_AUTH_TOKEN?.trim() ?? null;

const rateMap = new Map();

export function guardRequest(event) {
	if (!authToken) {
		return null;
	}

	const authResponse = enforceAuth(event);
	if (authResponse) return authResponse;

	const originResponse = enforceOrigin(event);
	if (originResponse) return originResponse;

	const rateResponse = enforceRateLimit(event);
	if (rateResponse) return rateResponse;

	return null;
}

function enforceAuth(event) {
	if (validateSession(event.cookies.get(SESSION_COOKIE_NAME))) {
		return null;
	}

	const rawHeader =
		event.request.headers.get('authorization') ??
		event.request.headers.get('x-api-token');

	if (!rawHeader) {
		return unauthorizedResponse();
	}

	const token = rawHeader.startsWith('Bearer ')
		? rawHeader.slice(7).trim()
		: rawHeader.trim();

	if (!token || token !== authToken) {
		return unauthorizedResponse();
	}

	return null;
}

function enforceOrigin(event) {
	if (allowedOrigins.length === 0) return null;
	const origin = event.request.headers.get('origin');
	if (!origin) return null;
	if (allowedOrigins.includes(origin)) return null;
	return jsonResponse({ error: 'Origin not allowed' }, 403);
}

function enforceRateLimit(event) {
	if (RATE_LIMIT_MAX <= 0 || RATE_LIMIT_WINDOW_MS <= 0) {
		return null;
	}

	const key = getClientKey(event);
	const now = Date.now();
	const entry = rateMap.get(key) ?? { count: 0, windowStart: now };

	if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
		entry.count = 0;
		entry.windowStart = now;
	}

	entry.count += 1;
	rateMap.set(key, entry);

	if (entry.count > RATE_LIMIT_MAX) {
		return jsonResponse(
			{
				error: 'Too many requests. Slow down a little.',
				retry_after_ms: RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)
			},
			429
		);
	}

	return null;
}

function getClientKey(event) {
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

function unauthorizedResponse() {
	return jsonResponse({ error: 'Unauthorized' }, 401);
}

function jsonResponse(body, status) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
