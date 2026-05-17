import { json } from '@sveltejs/kit';
import { enforceRateLimit } from '$lib/server/rateLimiter.js';
import { getCheckoutById } from '$lib/server/payments/paymentStore.js';
import { hashSensitiveValue } from '$lib/server/supporter/licenseCrypto.js';
import {
	createLicenseForCheckout,
	issueTokenForLicense
} from '$lib/server/supporter/licenseStore.js';

export async function GET(event) {
	const rateResponse = await enforceRateLimit(event);
	if (rateResponse) return rateResponse;

	const checkoutId = event.params.checkoutId;
	const claimToken = event.url.searchParams.get('claim_token') || '';
	const checkout = await getCheckoutById(checkoutId);

	if (!checkout) {
		return json({ error: 'Checkout not found.' }, { status: 404 });
	}

	if (!claimToken || checkout.claimTokenHash !== hashSensitiveValue(claimToken)) {
		return json({ error: 'Checkout claim token did not match.' }, { status: 403 });
	}

	if (checkout.status !== 'paid') {
		return json({ status: checkout.status || 'pending' });
	}

	const { license, code } = await createLicenseForCheckout(checkout);
	const token = issueTokenForLicense(license);

	return json({
		status: 'paid',
		code,
		token,
		license
	});
}
