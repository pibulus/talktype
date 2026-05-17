import crypto from 'crypto';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { json } from '@sveltejs/kit';
import { enforceRateLimit } from '$lib/server/rateLimiter.js';
import {
	generateClaimToken,
	generateLicenseCode,
	hashSensitiveValue,
	hashSupporterCode
} from '$lib/server/supporter/licenseCrypto.js';
import {
	createSquareCheckout,
	isSquareCheckoutConfigured
} from '$lib/server/payments/squareProvider.js';
import { saveCheckout } from '$lib/server/payments/paymentStore.js';

function getAppOrigin(event) {
	return (
		publicEnv.PUBLIC_APP_URL?.trim() || env.APP_URL?.trim() || env.URL?.trim() || event.url.origin
	);
}

export async function POST(event) {
	const rateResponse = await enforceRateLimit(event);
	if (rateResponse) return rateResponse;

	if (!isSquareCheckoutConfigured()) {
		return json(
			{ error: 'Square checkout is not configured yet. Use a supporter code for now.' },
			{ status: 503 }
		);
	}

	try {
		const checkoutId = crypto.randomUUID();
		const claimToken = generateClaimToken();
		const licenseCode = generateLicenseCode(checkoutId);
		const redirectUrl = `${getAppOrigin(event)}/supporter/success?checkout_id=${encodeURIComponent(
			checkoutId
		)}`;

		const squareCheckout = await createSquareCheckout({ checkoutId, redirectUrl });

		await saveCheckout({
			id: checkoutId,
			provider: squareCheckout.provider,
			status: 'pending',
			claimTokenHash: hashSensitiveValue(claimToken),
			codeHash: hashSupporterCode(licenseCode),
			providerCheckoutId: squareCheckout.paymentLinkId,
			providerOrderId: squareCheckout.providerOrderId,
			checkoutUrl: squareCheckout.checkoutUrl,
			shortUrl: squareCheckout.shortUrl,
			amount: squareCheckout.amount,
			currency: squareCheckout.currency
		});

		return json({
			checkoutId,
			claimToken,
			checkoutUrl: squareCheckout.checkoutUrl
		});
	} catch (error) {
		console.error('[SupporterCheckout] Failed to start checkout:', error);
		return json({ error: 'Could not start checkout right now.' }, { status: 502 });
	}
}
