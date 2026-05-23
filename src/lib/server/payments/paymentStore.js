import { storage } from '../storage/index.js';
import { SUPPORTER_CHECKOUT } from '$lib/constants';

const STORE_KEY = 'supporter-checkouts';

function toMillis(value) {
	const millis = Date.parse(value || '');
	return Number.isFinite(millis) ? millis : null;
}

function getClaimExpiresAt(checkout) {
	const explicitExpiry = toMillis(checkout?.claimExpiresAt);
	if (explicitExpiry !== null) return explicitExpiry;

	const createdAt = toMillis(checkout?.createdAt);
	if (!createdAt) return null;

	return createdAt + SUPPORTER_CHECKOUT.CLAIM_TOKEN_TTL_MS;
}

export function isCheckoutClaimExpired(checkout, now = Date.now()) {
	const expiresAt = getClaimExpiresAt(checkout);
	return expiresAt ? now > expiresAt : false;
}

async function readStore() {
	const data = (await storage.get(STORE_KEY)) || {};
	return {
		checkouts: Array.isArray(data.checkouts) ? data.checkouts : []
	};
}

async function writeStore(data) {
	await storage.set(STORE_KEY, data);
}

export async function saveCheckout(checkout) {
	const store = await readStore();
	const existingIndex = store.checkouts.findIndex((candidate) => candidate.id === checkout.id);

	if (existingIndex >= 0) {
		store.checkouts[existingIndex] = {
			...store.checkouts[existingIndex],
			...checkout,
			updatedAt: new Date().toISOString()
		};
	} else {
		const now = Date.now();
		store.checkouts.push({
			...checkout,
			createdAt: checkout.createdAt || new Date(now).toISOString(),
			claimExpiresAt:
				checkout.claimExpiresAt ||
				(checkout.claimTokenHash
					? new Date(now + SUPPORTER_CHECKOUT.CLAIM_TOKEN_TTL_MS).toISOString()
					: null),
			updatedAt: new Date(now).toISOString()
		});
	}

	await writeStore(store);
	return checkout;
}

export async function consumeCheckoutClaim(id) {
	const store = await readStore();
	const checkout = store.checkouts.find((candidate) => candidate.id === id);

	if (!checkout) return null;

	checkout.claimUsedAt = checkout.claimUsedAt || new Date().toISOString();
	checkout.claimTokenHash = null;
	checkout.updatedAt = new Date().toISOString();

	await writeStore(store);
	return checkout;
}

export async function getCheckoutById(id) {
	const store = await readStore();
	return store.checkouts.find((checkout) => checkout.id === id) || null;
}

export async function getCheckoutByProviderOrderId(providerOrderId) {
	const store = await readStore();
	return store.checkouts.find((checkout) => checkout.providerOrderId === providerOrderId) || null;
}

export async function markCheckoutPaid(providerOrderId, payment) {
	const store = await readStore();
	const checkout = store.checkouts.find(
		(candidate) => candidate.providerOrderId === providerOrderId
	);

	if (!checkout) return null;

	checkout.status = 'paid';
	checkout.providerPaymentId = payment?.id || checkout.providerPaymentId || null;
	checkout.paidAt = checkout.paidAt || new Date().toISOString();
	checkout.payment = {
		id: payment?.id || null,
		status: payment?.status || null,
		orderId: payment?.order_id || providerOrderId,
		amountMoney: payment?.amount_money || null,
		receiptUrl: payment?.receipt_url || null
	};
	checkout.updatedAt = new Date().toISOString();

	await writeStore(store);
	return checkout;
}
