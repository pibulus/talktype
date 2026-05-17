import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { enforceRateLimit } from '$lib/server/rateLimiter.js';
import {
	isSupporterCodeValid,
	normalizeSupporterCode,
	parseSupporterCodes
} from '$lib/server/supporterCodes.js';
import {
	issueManualSupporterToken,
	issueTokenForLicense,
	redeemStoredLicense
} from '$lib/server/supporter/licenseStore.js';

function getManualCodes() {
	return parseSupporterCodes(env.SUPPORTER_UNLOCK_CODES, env.SUPPORTER_UNLOCK_CODE);
}

export async function POST(event) {
	const rateResponse = await enforceRateLimit(event);
	if (rateResponse) return rateResponse;

	try {
		const { code } = await event.request.json();
		const normalizedCode = normalizeSupporterCode(code);

		if (!normalizedCode) {
			return json({ valid: false, error: 'Enter your supporter code to unlock.' }, { status: 400 });
		}

		const license = await redeemStoredLicense(normalizedCode);
		if (license) {
			return json({
				valid: true,
				token: issueTokenForLicense(license),
				license
			});
		}

		const manualCodes = getManualCodes();
		if (manualCodes.length === 0) {
			return json(
				{ valid: false, error: 'Supporter codes need server setup before they can run here.' },
				{ status: 503 }
			);
		}

		if (!isSupporterCodeValid(normalizedCode, manualCodes)) {
			return json(
				{ valid: false, error: 'Check the supporter code and try once more.' },
				{ status: 401 }
			);
		}

		return json({
			valid: true,
			token: issueManualSupporterToken(),
			license: {
				id: 'manual-supporter-code',
				tier: 'supporter',
				source: 'manual-code'
			}
		});
	} catch (error) {
		console.error('[SupporterRedeem] Failed to redeem supporter code:', error);
		return json(
			{ valid: false, error: 'Code check needs one more try in a moment.' },
			{ status: 500 }
		);
	}
}
