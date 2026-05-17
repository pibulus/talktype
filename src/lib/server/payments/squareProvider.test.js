import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { verifySquareWebhookSignature } from './squareProvider.js';

describe('square provider', () => {
	it('verifies Square webhook signatures with the exact notification URL and raw body', () => {
		const rawBody = JSON.stringify({ type: 'payment.updated' });
		const notificationUrl = 'https://talktype.app/api/square/webhook';
		const signatureKey = 'square-webhook-test-secret';
		const signature = crypto
			.createHmac('sha256', signatureKey)
			.update(`${notificationUrl}${rawBody}`)
			.digest('base64');

		expect(
			verifySquareWebhookSignature({
				rawBody,
				signature,
				notificationUrl,
				signatureKey
			})
		).toBe(true);
		expect(
			verifySquareWebhookSignature({
				rawBody: `${rawBody}\n`,
				signature,
				notificationUrl,
				signatureKey
			})
		).toBe(false);
	});
});
