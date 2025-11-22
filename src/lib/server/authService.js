import { env } from '$env/dynamic/private';
import { createSession, validateSession } from './cookieStore.js';
import { enforceRateLimit } from './rateLimiter.js';
import { json } from '@sveltejs/kit';
import crypto from 'node:crypto';

const authToken = env.API_AUTH_TOKEN?.trim() ?? null;

export async function guardRequest(event) {
	// Fail-closed: If auth token is missing, deny everything
	if (!authToken) {
		console.error('🚨 CRITICAL: API_AUTH_TOKEN is not set. Refusing to serve requests.');
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	const authResponse = await enforceAuth(event);
	if (authResponse) return authResponse;

	const rateResponse = await enforceRateLimit(event);
	if (rateResponse) return rateResponse;

	return null;
}

export async function checkSession(event) {
	if (!authToken) {
		return false; // Auth disabled = no valid session possible
	}
	return await validateSession(event);
}

export async function verifyTokenAndCreateSession(token, event) {
	if (!authToken) {
		throw new Error('Auth not configured');
	}
	
	if (!token) return false;

	// Timing-safe comparison
	const tokenBuffer = Buffer.from(token);
	const authBuffer = Buffer.from(authToken);

	if (tokenBuffer.length !== authBuffer.length) {
		return false;
	}

	if (!crypto.timingSafeEqual(tokenBuffer, authBuffer)) {
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

	if (!token) {
		return unauthorizedResponse();
	}

	// Timing-safe comparison
	const tokenBuffer = Buffer.from(token);
	const authBuffer = Buffer.from(authToken);

	if (tokenBuffer.length !== authBuffer.length) {
		return unauthorizedResponse();
	}

	if (!crypto.timingSafeEqual(tokenBuffer, authBuffer)) {
		return unauthorizedResponse();
	}

	return null;
}

function unauthorizedResponse() {
	return json({ error: 'Unauthorized' }, { status: 401 });
}
