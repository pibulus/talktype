import { env } from '$env/dynamic/private';
import { createSession, validateSession } from './cookieStore.js';
import { get as getRate, set as setRate, clearExpired } from './fileStore.js';
import { json } from '@sveltejs/kit';

const RATE_LIMIT_WINDOW_MS = Number(env.API_RATE_WINDOW_MS ?? '60000');
const RATE_LIMIT_MAX = Number(env.API_RATE_LIMIT ?? '60');
const authToken = env.API_AUTH_TOKEN?.trim() ?? null;

export async function guardRequest(event) {
	if (!authToken) {
		return null;
	}

	const authResponse = await enforceAuth(event);
	if (authResponse) return authResponse;

	const rateResponse = await enforceRateLimit(event);
	if (rateResponse) return rateResponse;

	return null;
}

export async function checkSession(event) {
	if (!authToken) {
		return true; // Auth is disabled
	}
	return await validateSession(event);
}

export async function verifyTokenAndCreateSession(token, event) {
	if (!authToken) {
		throw new Error('Auth not configured');
	}
	if (!token || token.trim() !== authToken) {
		return false;
	}
	await createSession(event);
	return true;
}

async function enforceAuth(event) {
	if (await validateSession(event)) {
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

async function enforceRateLimit(event) {
	if (RATE_LIMIT_MAX <= 0 || RATE_LIMIT_WINDOW_MS <= 0) {
		return null;
	}

	const key = getClientKey(event);
	const now = Date.now();
	
	await clearExpired(RATE_LIMIT_WINDOW_MS); // Clean up expired entries before processing
	let entry = (await getRate(key)) ?? { count: 0, windowStart: now };

	if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
		entry.count = 0;
		entry.windowStart = now;
	}

	entry.count += 1;
	await setRate(key, entry);

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
	return json({ error: 'Unauthorized' }, { status: 401 });
}

function jsonResponse(body, status) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

