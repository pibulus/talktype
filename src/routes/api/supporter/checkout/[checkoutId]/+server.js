import { json } from '@sveltejs/kit';
import { enforceRateLimit } from '$lib/server/rateLimiter.js';
import {
	consumeCheckoutClaim,
	getCheckoutById,
	isCheckoutClaimExpired
} from '$lib/server/payments/paymentStore.js';
import { hashSensitiveValue } from '$lib/server/supporter/licenseCrypto.js';
import {
	createLicenseForCheckout,
	issueTokenForLicense
} from '$lib/server/supporter/licenseStore.js';
import { SUPPORTER_CHECKOUT } from '$lib/constants';

export async function GET(event) {
	const rateResponse = await enforceRateLimit(event);
	if (rateResponse) return rateResponse;

	const checkoutId = event.params.checkoutId;
	const claimToken = event.request.headers.get(SUPPORTER_CHECKOUT.CLAIM_HEADER) || '';
	const checkout = await getCheckoutById(checkoutId);

	if (!checkout) {
		return json({ error: 'Open TalkType and start supporter checkout again.' }, { status: 404 });
	}

	if (checkout.claimUsedAt) {
		return json({ error: 'This supporter checkout has already been claimed.' }, { status: 410 });
	}

	if (isCheckoutClaimExpired(checkout)) {
		return json(
			{ error: 'This supporter checkout link expired. Start checkout again.' },
			{ status: 410 }
		);
	}

	if (!claimToken || checkout.claimTokenHash !== hashSensitiveValue(claimToken)) {
		return json(
			{ error: 'Open this supporter link in the same browser used for checkout.' },
			{ status: 403 }
		);
	}

	if (checkout.status !== 'paid') {
		return json({ status: checkout.status || 'pending' });
	}

	const { license, code } = await createLicenseForCheckout(checkout);
	const token = issueTokenForLicense(license);
	await consumeCheckoutClaim(checkout.id);

	return json({
		status: 'paid',
		code,
		token,
		license
	});
}
