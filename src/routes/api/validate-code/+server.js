import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { enforceRateLimit } from '$lib/server/rateLimiter.js';
import {
	isSupporterCodeValid,
	normalizeSupporterCode,
	parseSupporterCodes
} from '$lib/server/supporterCodes.js';
import { redeemStoredLicense } from '$lib/server/supporter/licenseStore.js';

function getValidCodes() {
	return parseSupporterCodes(env.SUPPORTER_UNLOCK_CODES, env.SUPPORTER_UNLOCK_CODE);
}

export async function POST(event) {
	const rateResponse = await enforceRateLimit(event);
	if (rateResponse) return rateResponse;

	let body;
	try {
		body = await event.request.json();
	} catch {
		return json({ valid: false, error: 'Enter your supporter code to unlock.' }, { status: 400 });
	}

	try {
		const normalizedCode = normalizeSupporterCode(body?.code);
		const validCodes = getValidCodes();

		if (!normalizedCode) {
			return json({ valid: false, error: 'Enter your supporter code to unlock.' }, { status: 400 });
		}

		if (validCodes.length === 0) {
			const license = await redeemStoredLicense(normalizedCode);
			if (license) {
				return json({ valid: true });
			}

			return json(
				{ valid: false, error: 'Check the supporter code and try once more.' },
				{ status: 401 }
			);
		}

		const isValid =
			isSupporterCodeValid(normalizedCode, validCodes) ||
			Boolean(await redeemStoredLicense(normalizedCode));

		if (!isValid) {
			return json(
				{ valid: false, error: 'Check the supporter code and try once more.' },
				{ status: 401 }
			);
		}

		return json({ valid: true });
	} catch (error) {
		console.error('[API /validate-code] Failed to validate supporter code:', error);
		return json(
			{ valid: false, error: 'Code check needs one more try in a moment.' },
			{ status: 500 }
		);
	}
}
