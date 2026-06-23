import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { createLicenseForCheckout } from './licenseStore.js';
import { licenseIdForCheckout } from './licenseCrypto.js';

const SECRET = 'test-supporter-secret-with-enough-length';
const checkout = {
	id: 'checkout-abc',
	codeHash: 'deadbeef',
	provider: 'square',
	providerPaymentId: 'pay_1'
};

describe('license store', () => {
	beforeEach(() => {
		storageState.clear();
		vi.stubEnv('SUPPORTER_LICENSE_SECRET', SECRET);
	});

	it('derives a stable, UUID-shaped license id from the checkout id', () => {
		const id = licenseIdForCheckout('checkout-abc', SECRET);
		expect(id).toBe(licenseIdForCheckout('checkout-abc', SECRET));
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		expect(id).not.toBe(licenseIdForCheckout('checkout-xyz', SECRET));
	});

	it('creates exactly one license even when two callers race the same checkout', async () => {
		// Fire both before awaiting so they interleave at the readStore/writeStore
		// await points — the webhook-vs-claim race.
		const [a, b] = await Promise.all([
			createLicenseForCheckout(checkout),
			createLicenseForCheckout(checkout)
		]);

		const stored = storageState.get('supporter-licenses');
		expect(stored.licenses).toHaveLength(1);
		// Both callers return the same deterministic license — no lost license.
		expect(a.license.id).toBe(b.license.id);
		expect(a.license.id).toBe(stored.licenses[0].id);
	});

	it('is idempotent across sequential calls', async () => {
		await createLicenseForCheckout(checkout);
		await createLicenseForCheckout(checkout);

		const stored = storageState.get('supporter-licenses');
		expect(stored.licenses).toHaveLength(1);
	});
});
