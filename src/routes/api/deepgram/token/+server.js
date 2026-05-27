import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { guardRequest } from '$lib/server/authService.js';
import { enforceRateLimit } from '$lib/server/rateLimiter.js';

const DEEPGRAM_GRANT_URL = 'https://api.deepgram.com/v1/auth/grant';
const TOKEN_TTL_SECONDS = 30;
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function parsePositiveNumber(value, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const TOKEN_RATE_WINDOW_MS = parsePositiveNumber(env.DEEPGRAM_TOKEN_RATE_WINDOW_MS, 10 * 60 * 1000);
const TOKEN_RATE_LIMIT = parsePositiveNumber(env.DEEPGRAM_TOKEN_RATE_LIMIT, 12);

export async function GET(event) {
	const guardResponse = await guardRequest(event);
	if (guardResponse) {
		return guardResponse;
	}

	const tokenRateResponse = await enforceRateLimit(event, {
		bucket: 'deepgram-token',
		windowMs: TOKEN_RATE_WINDOW_MS,
		max: TOKEN_RATE_LIMIT
	});
	if (tokenRateResponse) {
		return tokenRateResponse;
	}

	const apiKey = env.DEEPGRAM_API_KEY;
	if (!apiKey) {
		return json(
			{ error: 'Live transcription needs server setup before it can run here.' },
			{ status: 500, headers: NO_STORE_HEADERS }
		);
	}

	try {
		const response = await fetch(DEEPGRAM_GRANT_URL, {
			method: 'POST',
			headers: {
				Authorization: `Token ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ ttl_seconds: TOKEN_TTL_SECONDS })
		});

		const payload = await response.json().catch(() => ({}));

		if (!response.ok || !payload.access_token) {
			console.error('[DeepgramToken] Failed to mint temporary token:', payload);
			return json(
				{ error: 'Live transcription needs a moment. Try After Stop mode for this one.' },
				{ status: response.status || 502, headers: NO_STORE_HEADERS }
			);
		}

		return json(
			{
				token: payload.access_token,
				expires_in: payload.expires_in ?? TOKEN_TTL_SECONDS
			},
			{ headers: NO_STORE_HEADERS }
		);
	} catch (error) {
		console.error('[DeepgramToken] Error minting temporary token:', error);
		return json(
			{ error: 'Live transcription needs a moment. Try After Stop mode for this one.' },
			{ status: 502, headers: NO_STORE_HEADERS }
		);
	}
}
