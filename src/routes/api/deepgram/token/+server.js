import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { guardRequest } from '$lib/server/authService.js';

const DEEPGRAM_GRANT_URL = 'https://api.deepgram.com/v1/auth/grant';
const TOKEN_TTL_SECONDS = 30;

export async function GET(event) {
	const guardResponse = await guardRequest(event);
	if (guardResponse) {
		return guardResponse;
	}

	const apiKey = env.DEEPGRAM_API_KEY;
	if (!apiKey) {
		return json({ error: 'Server Error: Missing Deepgram API key' }, { status: 500 });
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
				{ error: 'Could not start live transcription right now.' },
				{ status: response.status || 502 }
			);
		}

		return json({
			token: payload.access_token,
			expires_in: payload.expires_in ?? TOKEN_TTL_SECONDS
		});
	} catch (error) {
		console.error('[DeepgramToken] Error minting temporary token:', error);
		return json({ error: 'Could not start live transcription right now.' }, { status: 502 });
	}
}
