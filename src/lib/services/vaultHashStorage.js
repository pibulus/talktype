import { browser } from '$app/environment';
import { STORAGE_KEYS } from '$lib/constants';

const LEGACY_VAULT_HASH_KEYS = [
	'talktype_supporter_vault_hash',
	'talktype_supporter_vault_hash_saved_at'
];

function getStorage(storage) {
	if (storage) return storage;
	if (!browser) return null;
	return localStorage;
}

export function clearStoredVaultHash(storage) {
	const targetStorage = getStorage(storage);
	if (!targetStorage) return;

	try {
		LEGACY_VAULT_HASH_KEYS.forEach((key) => targetStorage.removeItem(key));
	} catch (error) {
		console.warn('Failed to clear legacy supporter passport hash:', error);
	}
}

export function normalizeStoredSupporterCode(code) {
	return code?.toString().trim().toUpperCase() || '';
}

export function clearStoredSupporterCode(storage) {
	const targetStorage = getStorage(storage);
	if (!targetStorage) return;

	try {
		targetStorage.removeItem(STORAGE_KEYS.SUPPORTER_PASSPORT_CODE);
		clearStoredVaultHash(targetStorage);
	} catch (error) {
		console.warn('Failed to clear supporter passport code:', error);
	}
}

export function readStoredSupporterCode(storage) {
	const targetStorage = getStorage(storage);
	if (!targetStorage) return '';

	try {
		return normalizeStoredSupporterCode(
			targetStorage.getItem(STORAGE_KEYS.SUPPORTER_PASSPORT_CODE) || ''
		);
	} catch (error) {
		console.warn('Failed to read supporter passport code:', error);
		return '';
	}
}

export function saveStoredSupporterCode(code, storage) {
	const normalizedCode = normalizeStoredSupporterCode(code);
	if (!normalizedCode) {
		throw new Error('Supporter passport code is missing');
	}

	const targetStorage = getStorage(storage);
	if (!targetStorage) return normalizedCode;

	try {
		targetStorage.setItem(STORAGE_KEYS.SUPPORTER_PASSPORT_CODE, normalizedCode);
		clearStoredVaultHash(targetStorage);
	} catch (error) {
		console.warn('Failed to persist supporter passport code:', error);
	}

	return normalizedCode;
}
