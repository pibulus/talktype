/**
 * Premium Purchase API Endpoint
 * Processes Square payments and generates unlock codes
 */

import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { generateUnlockCode, storeUnlockCode } from '$lib/server/unlockCodeStore';
import { recordCampaignSale } from '$lib/server/campaignTracker';

// Square API configuration
const SQUARE_API_URL = dev
	? 'https://connect.squareupsandbox.com/v2/payments'
	: 'https://connect.squareup.com/v2/payments';

const SQUARE_ACCESS_TOKEN = dev
	? process.env.SQUARE_SANDBOX_ACCESS_TOKEN
	: process.env.SQUARE_ACCESS_TOKEN;

const SQUARE_LOCATION_ID = dev
	? process.env.SQUARE_SANDBOX_LOCATION_ID
	: process.env.SQUARE_LOCATION_ID;

/**
 * POST /api/purchase-premium
 * Process Square payment and return unlock code
 */
export async function POST({ request }) {
	try {
		const { sourceId, amount, currency, email } = await request.json();

		// Validate input
		if (!sourceId || !amount) {
			return json({ success: false, error: 'Missing required fields' }, { status: 400 });
		}

		// In development, skip Square API and generate code immediately
		if (dev && sourceId === 'test-payment-token') {
			console.log('🧪 Development mode: Skipping Square API, generating test code');

			const unlockCode = generateUnlockCode();
			storeUnlockCode(unlockCode, {
				paymentId: 'dev-test-payment',
				amount,
				currency: currency || 'AUD',
				email: email || null,
				environment: 'development'
			});

			// Record campaign sale
			const campaignStatus = recordCampaignSale({
				paymentId: 'dev-test-payment',
				amount,
				email: email || null
			});

			return json({
				success: true,
				unlockCode,
				paymentId: 'dev-test-payment',
				message: 'Development payment - code generated',
				campaign: campaignStatus
			});
		}

		// Production: Process real Square payment
		if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
			console.error('Square credentials not configured');
			return json({ success: false, error: 'Payment system not configured' }, { status: 500 });
		}

		// Call Square Payments API
		const squareResponse = await fetch(SQUARE_API_URL, {
			method: 'POST',
			headers: {
				'Square-Version': '2024-01-18',
				Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				source_id: sourceId,
				idempotency_key: crypto.randomUUID(),
				amount_money: {
					amount: Math.round(amount * 100), // Convert to cents
					currency: currency || 'AUD'
				},
				location_id: SQUARE_LOCATION_ID,
				note: 'TalkType Premium Unlock',
				buyer_email_address: email || undefined
			})
		});

		const squareData = await squareResponse.json();

		if (!squareResponse.ok) {
			console.error('Square payment failed:', squareData);
			return json(
				{
					success: false,
					error: squareData.errors?.[0]?.detail || 'Payment failed'
				},
				{ status: 400 }
			);
		}

		// Payment successful - generate unlock code
		const payment = squareData.payment;

		if (payment.status === 'COMPLETED') {
			const unlockCode = generateUnlockCode();

			storeUnlockCode(unlockCode, {
				paymentId: payment.id,
				amount: payment.amount_money.amount / 100,
				currency: payment.amount_money.currency,
				email: email || null,
				squareOrderId: payment.order_id,
				receiptUrl: payment.receipt_url
			});

			// Record campaign sale
			const campaignStatus = recordCampaignSale({
				paymentId: payment.id,
				amount: payment.amount_money.amount / 100,
				email: email || null
			});

			return json({
				success: true,
				unlockCode,
				paymentId: payment.id,
				receiptUrl: payment.receipt_url,
				campaign: campaignStatus
			});
		}

		// Payment not completed
		return json(
			{
				success: false,
				error: `Payment status: ${payment.status}`
			},
			{ status: 400 }
		);
	} catch (error) {
		console.error('Purchase premium error:', error);
		return json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		);
	}
}
