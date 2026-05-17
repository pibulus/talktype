import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { enforceRateLimit } from '$lib/server/rateLimiter.js';
import {
	isSupporterCodeValid,
	normalizeSupporterCode,
	parseSupporterCodes
} from '$lib/server/supporterCodes.js';

function getValidCodes() {
	return parseSupporterCodes(env.SUPPORTER_UNLOCK_CODES, env.SUPPORTER_UNLOCK_CODE);
}

export async function POST(event) {
	const rateResponse = await enforceRateLimit(event);
	if (rateResponse) return rateResponse;

	try {
		const { code } = await event.request.json();
		const normalizedCode = normalizeSupporterCode(code);
		const validCodes = getValidCodes();

		if (!normalizedCode) {
			return json({ valid: false, error: 'Enter a supporter code.' }, { status: 400 });
		}

		if (validCodes.length === 0) {
			return json(
				{ valid: false, error: 'Supporter codes are not configured on this server yet.' },
				{ status: 503 }
			);
		}

		const isValid = isSupporterCodeValid(normalizedCode, validCodes);

		if (!isValid) {
			return json({ valid: false, error: 'That supporter code did not match.' }, { status: 401 });
		}

		return json({ valid: true });
	} catch (error) {
		console.error('[API /validate-code] Failed to validate supporter code:', error);
		return json(
			{ valid: false, error: 'Could not validate that code right now.' },
			{ status: 500 }
		);
	}
}
