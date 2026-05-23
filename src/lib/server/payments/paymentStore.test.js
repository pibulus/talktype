import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPORTER_CHECKOUT } from '$lib/constants';

const storageState = vi.hoisted(() => new Map());

vi.mock('../storage/index.js', () => ({
	storage: {
		get: vi.fn(async (key) => storageState.get(key) || null),
		set: vi.fn(async (key, value) => {
			storageState.set(key, structuredClone(value));
			return true;
		})
	}
}));

import {
	consumeCheckoutClaim,
	getCheckoutById,
	isCheckoutClaimExpired,
	saveCheckout
} from './paymentStore.js';

describe('payment checkout storage', () => {
	beforeEach(() => {
		storageState.clear();
	});

	it('adds a claim expiry when storing a checkout claim token', async () => {
		await saveCheckout({
			id: 'checkout-1',
			status: 'pending',
			claimTokenHash: 'token-hash'
		});

		const checkout = await getCheckoutById('checkout-1');

		expect(checkout.claimExpiresAt).toBeTruthy();
		expect(Date.parse(checkout.claimExpiresAt)).toBeGreaterThan(Date.now());
	});

	it('expires checkout claims by explicit expiry or legacy createdAt fallback', () => {
		const now = Date.now();

		expect(
			isCheckoutClaimExpired({ claimExpiresAt: new Date(now - 1000).toISOString() }, now)
		).toBe(true);

		expect(
			isCheckoutClaimExpired(
				{ createdAt: new Date(now - SUPPORTER_CHECKOUT.CLAIM_TOKEN_TTL_MS - 1000).toISOString() },
				now
			)
		).toBe(true);
	});

	it('consumes claim tokens after a paid checkout is claimed', async () => {
		await saveCheckout({
			id: 'checkout-2',
			status: 'paid',
			claimTokenHash: 'token-hash'
		});

		const consumed = await consumeCheckoutClaim('checkout-2');
		const stored = await getCheckoutById('checkout-2');

		expect(consumed.claimUsedAt).toBeTruthy();
		expect(stored.claimUsedAt).toBe(consumed.claimUsedAt);
		expect(stored.claimTokenHash).toBeNull();
	});
});
