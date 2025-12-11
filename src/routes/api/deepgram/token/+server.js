import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createClient } from '@deepgram/sdk';

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

	try {
		const deepgram = createClient(apiKey);

		// 1. Get the project ID (we need it to create a key)
		// We assume the API key belongs to the first project returned
		const { result: projectsResult, error: projectsError } = await deepgram.manage.getProjects();
		
		if (projectsError) {
			// console.error('[DeepgramToken] Failed to get projects:', JSON.stringify(projectsError, null, 2));
			throw new Error(`Failed to get Deepgram projects: ${projectsError.message || 'Unknown error'}`);
		}

		const projectId = projectsResult?.projects?.[0]?.project_id;

		if (!projectId) {
			throw new Error('No Deepgram project found');
		}

		// 2. Create a temporary key
		// Valid for 10 seconds, just enough to connect
		const { result: newKeyResult, error: newKeyError } = await deepgram.manage.createProjectKey(projectId, {
			comment: 'talktype-streaming-temp',
			scopes: ['usage:write'],
			time_to_live_in_seconds: 10
		});

		if (newKeyError) {
			// Only log full error if it's NOT a scope issue (which we expect for personal keys)
			if (newKeyError.status !== 403) {
				console.error('[DeepgramToken] Failed to create key:', newKeyError);
			}
			throw new Error('Failed to create temporary key');
		}

		return json({ 
			key: newKeyResult.key,
			projectId: projectId // Optional, but might be useful
		});

	} catch (error) {
		console.error('[DeepgramToken] ❌ Error generating temp key:', error);
		
		// SECURE: Do NOT return the master key on error.
		// If temp key generation fails, the user cannot use Live Mode.
		return json({ error: 'Failed to generate temporary key' }, { status: 500 });
	}
}
