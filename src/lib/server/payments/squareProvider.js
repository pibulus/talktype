import crypto from 'crypto';
import { env } from '$env/dynamic/private';
import { PRICING } from '$lib/config/pricing.js';

const DEFAULT_SQUARE_VERSION = '2026-01-22';
const PROVIDER = 'square';

function getSquareBaseUrl() {
	return env.SQUARE_ENVIRONMENT === 'sandbox'
		? 'https://connect.squareupsandbox.com'
		: 'https://connect.squareup.com';
}

export function getSquareConfig() {
	return {
		provider: PROVIDER,
		accessToken: env.SQUARE_ACCESS_TOKEN?.trim() || '',
		locationId: env.SQUARE_LOCATION_ID?.trim() || '',
		apiVersion: env.SQUARE_API_VERSION?.trim() || DEFAULT_SQUARE_VERSION,
		webhookSignatureKey: env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim() || '',
		environment: env.SQUARE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production'
	};
}

export function isSquareCheckoutConfigured() {
	const config = getSquareConfig();
	return Boolean(config.accessToken && config.locationId);
}

export function isSquareWebhookConfigured() {
	return Boolean(getSquareConfig().webhookSignatureKey);
}

export function getSupporterPriceMoney() {
	return {
		amount: Math.round(PRICING.currentPrice * 100),
		currency: PRICING.currency
	};
}

export async function createSquareCheckout({ checkoutId, redirectUrl }) {
	const config = getSquareConfig();
	if (!isSquareCheckoutConfigured()) {
		throw new Error('Square checkout is not configured');
	}

	const priceMoney = getSupporterPriceMoney();
	const response = await fetch(`${getSquareBaseUrl()}/v2/online-checkout/payment-links`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.accessToken}`,
			'Square-Version': config.apiVersion,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			idempotency_key: checkoutId,
			description: `TalkType Supporter Mode ${checkoutId}`,
			quick_pay: {
				name: 'TalkType Supporter Mode',
				price_money: priceMoney,
				location_id: config.locationId
			},
			checkout_options: {
				redirect_url: redirectUrl
			},
			payment_note: `TalkType supporter checkout ${checkoutId}`
		})
	});

	const payload = await response.json().catch(() => ({}));
	if (!response.ok || !payload.payment_link?.url) {
		console.error('[Square] Failed to create checkout:', payload);
		throw new Error('Could not start Square checkout');
	}

	return {
		provider: PROVIDER,
		paymentLinkId: payload.payment_link.id,
		providerOrderId: payload.payment_link.order_id,
		checkoutUrl: payload.payment_link.long_url || payload.payment_link.url,
		shortUrl: payload.payment_link.url,
		amount: priceMoney.amount,
		currency: priceMoney.currency
	};
}

export function verifySquareWebhookSignature({
	rawBody,
	signature,
	notificationUrl,
	signatureKey = getSquareConfig().webhookSignatureKey
}) {
	if (!signatureKey || !signature || !notificationUrl) {
		return false;
	}

	const expected = crypto
		.createHmac('sha256', signatureKey)
		.update(`${notificationUrl}${rawBody}`)
		.digest('base64');

	const signatureBuffer = Buffer.from(signature, 'base64');
	const expectedBuffer = Buffer.from(expected, 'base64');

	return (
		signatureBuffer.length === expectedBuffer.length &&
		crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
	);
}

export function extractSquarePayment(event) {
	const payment = event?.data?.object?.payment;
	if (!payment?.id || !payment?.order_id) {
		return null;
	}

	return payment;
}
