import { env } from '$env/dynamic/private';
import { createSession, validateSession } from './cookieStore.js';
import { enforceRateLimit } from './rateLimiter.js';
import { json } from '@sveltejs/kit';
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
		event.request.headers.get('authorization') ?? event.request.headers.get('x-api-token');

	if (!rawHeader) {
		return unauthorizedResponse();
	}

	const token = rawHeader.startsWith('Bearer ') ? rawHeader.slice(7).trim() : rawHeader.trim();

	if (!token || token !== authToken) {
		return unauthorizedResponse();
	}

	return null;
}

function unauthorizedResponse() {
	return json({ error: 'Unauthorized' }, { status: 401 });
}
