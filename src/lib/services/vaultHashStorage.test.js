import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '$lib/constants';
import {
	clearStoredSupporterCode,
	clearStoredVaultHash,
	readStoredSupporterCode,
	saveStoredSupporterCode
} from './vaultHashStorage.js';

function createStorage() {
	const values = new Map();
	return {
		getItem: vi.fn((key) => values.get(key) || null),
		setItem: vi.fn((key, value) => values.set(key, value)),
		removeItem: vi.fn((key) => values.delete(key))
	};
}

describe('supporter passport local storage', () => {
	it('clears the legacy stored hash cache', () => {
		const storage = createStorage();

		clearStoredVaultHash(storage);

		expect(storage.removeItem).toHaveBeenCalledWith('talktype_supporter_vault_hash');
		expect(storage.removeItem).toHaveBeenCalledWith('talktype_supporter_vault_hash_saved_at');
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
		expect(storage.removeItem).toHaveBeenCalledWith('talktype_supporter_vault_hash');
		expect(storage.removeItem).toHaveBeenCalledWith('talktype_supporter_vault_hash_saved_at');
	});

	it('can explicitly clear the stored supporter passport code', () => {
		const storage = createStorage();

		saveStoredSupporterCode('TT-ABCD-1234', storage);
		clearStoredSupporterCode(storage);

		expect(readStoredSupporterCode(storage)).toBe('');
	});
});
