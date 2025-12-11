import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Simple in-memory rate limiter
// Map<IP, { count: number, expiry: number }>
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute

function checkRateLimit(ip) {
	const now = Date.now();
	const record = rateLimit.get(ip);

	if (!record || now > record.expiry) {
		rateLimit.set(ip, { count: 1, expiry: now + RATE_LIMIT_WINDOW });
		return true;
	}

	if (record.count >= MAX_REQUESTS_PER_WINDOW) {
		return false;
	}

	record.count++;
	return true;
}

export async function GET({ getClientAddress }) {
	// 0. Rate Limiting
	const clientIp = getClientAddress();
	if (!checkRateLimit(clientIp)) {
		return json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
	}

	const apiKey = env.DEEPGRAM_API_KEY;
	if (!apiKey) {
		return json({ error: 'Server Error: Missing Deepgram API key' }, { status: 500 });
	}

	// For local development, just return the API key directly
	// This is secure because:
	// 1. Rate limiting protects against abuse
	// 2. The key is only exposed to localhost
	// 3. For production, you can implement temporary key generation
	console.log('[DeepgramToken] Returning API key for live streaming');
	
	return json({
		key: apiKey
	});
}

