import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS, SUPPORTER_VAULT } from '$lib/constants';
import {
	clearStoredSupporterCode,
	clearStoredVaultHash,
	readStoredSupporterCode,
	readStoredVaultHash,
	saveStoredSupporterCode,
	saveStoredVaultHash
} from './vaultHashStorage.js';

function createStorage() {
	const values = new Map();
	return {
		getItem: vi.fn((key) => values.get(key) || null),
		setItem: vi.fn((key, value) => values.set(key, value)),
		removeItem: vi.fn((key) => values.delete(key))
	};
}

describe('vault hash local storage', () => {
	it('saves and reads a supporter vault hash with a timestamp', () => {
		const storage = createStorage();
		const now = Date.now();

		saveStoredVaultHash('abc123', storage, now);

		expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.SUPPORTER_VAULT_HASH, 'abc123');
		expect(storage.setItem).toHaveBeenCalledWith(
			STORAGE_KEYS.SUPPORTER_VAULT_HASH_SAVED_AT,
			String(now)
		);
		expect(readStoredVaultHash(storage, now + 1000)).toBe('abc123');
	});

	it('clears stale hashes instead of keeping them indefinitely', () => {
		const storage = createStorage();
		const now = Date.now();

		saveStoredVaultHash('abc123', storage, now - SUPPORTER_VAULT.HASH_TTL_MS - 1000);

		expect(readStoredVaultHash(storage, now)).toBe('');
		expect(storage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.SUPPORTER_VAULT_HASH);
		expect(storage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.SUPPORTER_VAULT_HASH_SAVED_AT);
	});

	it('can explicitly clear the stored hash', () => {
		const storage = createStorage();

		saveStoredVaultHash('abc123', storage);
		clearStoredVaultHash(storage);

		expect(readStoredVaultHash(storage)).toBe('');
	});

	it('saves a normalized supporter passport code for trusted-device backups', () => {
		const storage = createStorage();

		const savedCode = saveStoredSupporterCode(' tt-abcd-1234 ', storage);

		expect(savedCode).toBe('TT-ABCD-1234');
		expect(storage.setItem).toHaveBeenCalledWith(
			STORAGE_KEYS.SUPPORTER_PASSPORT_CODE,
			'TT-ABCD-1234'
		);
		expect(readStoredSupporterCode(storage)).toBe('TT-ABCD-1234');
	});

	it('can explicitly clear the stored supporter passport code', () => {
		const storage = createStorage();

		saveStoredSupporterCode('TT-ABCD-1234', storage);
		clearStoredSupporterCode(storage);

		expect(readStoredSupporterCode(storage)).toBe('');
	});
});
