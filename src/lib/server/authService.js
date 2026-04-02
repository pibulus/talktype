import { env } from '$env/dynamic/private';
import { createSession } from './cookieStore.js';
import { validateSession } from './cookieStore.js';
import { enforceRateLimit } from './rateLimiter.js';

// If API_AUTH_TOKEN is not set, we default to "Open Mode" (no auth required)
// This allows the app to work with the server-side GEMINI_API_KEY without user input
const authToken = env.API_AUTH_TOKEN?.trim() || null;

export function isAuthConfigured() {
	return Boolean(authToken);
}

export async function guardRequest(event) {
	if (isAuthConfigured()) {
		const hasSession = await validateSession(event);
		if (!hasSession) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}

	const rateResponse = await enforceRateLimit(event);
	if (rateResponse) return rateResponse;

	return null;
}

export async function checkSession(event) {
	if (!isAuthConfigured()) {
		return true;
	}

	if (!event) {
		return false;
	}

	try {
		return await validateSession(event);
	} catch (error) {
		console.error('[auth] Session validation failed:', error);
		return false;
	}
}

export async function verifyTokenAndCreateSession(token, event) {
	if (!isAuthConfigured()) {
		await createSession(event);
		return true;
	}

	if (!token || token.trim() !== authToken) {
		return false;
	}

	if (!event) {
		return false;
	}

	await createSession(event);
	return true;
}

// Helper to get the API key for internal use
export function getApiKey() {
	return authToken;
}
