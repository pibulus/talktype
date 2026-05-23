import { browser } from '$app/environment';
import { STORAGE_KEYS, SUPPORTER_VAULT } from '$lib/constants';

function getStorage(storage) {
	if (storage) return storage;
	if (!browser) return null;
	return localStorage;
}

function getStoredAt(storage) {
	const storedAt = Number.parseInt(
		storage.getItem(STORAGE_KEYS.SUPPORTER_VAULT_HASH_SAVED_AT) || '',
		10
	);
	return Number.isFinite(storedAt) ? storedAt : 0;
}

export function clearStoredVaultHash(storage) {
	const targetStorage = getStorage(storage);
	if (!targetStorage) return;

	try {
		targetStorage.removeItem(STORAGE_KEYS.SUPPORTER_VAULT_HASH);
		targetStorage.removeItem(STORAGE_KEYS.SUPPORTER_VAULT_HASH_SAVED_AT);
	} catch (error) {
		console.warn('Failed to clear supporter passport hash:', error);
	}
}

export function readStoredVaultHash(storage, now = Date.now()) {
	const targetStorage = getStorage(storage);
	if (!targetStorage) return '';

	try {
		const hash = targetStorage.getItem(STORAGE_KEYS.SUPPORTER_VAULT_HASH) || '';
		if (!hash) return '';

		const storedAt = getStoredAt(targetStorage);
		if (!storedAt || now - storedAt > SUPPORTER_VAULT.HASH_TTL_MS) {
			clearStoredVaultHash(targetStorage);
			return '';
		}

		return hash;
	} catch (error) {
		console.warn('Failed to read supporter passport hash:', error);
		return '';
	}
}

export function saveStoredVaultHash(hash, storage, now = Date.now()) {
	if (!hash) {
		throw new Error('Supporter passport hash is missing');
	}

	const targetStorage = getStorage(storage);
	if (!targetStorage) return hash;

	try {
		targetStorage.setItem(STORAGE_KEYS.SUPPORTER_VAULT_HASH, hash);
		targetStorage.setItem(STORAGE_KEYS.SUPPORTER_VAULT_HASH_SAVED_AT, String(now));
	} catch (error) {
		console.warn('Failed to persist supporter passport hash:', error);
	}

	return hash;
}
