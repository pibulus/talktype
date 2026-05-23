import { browser } from '$app/environment';
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '$lib/constants';
import {
	readStorageValue,
	removeStorageValue,
	writeStorageValue
} from '$lib/services/storage/localStorageMigration.js';

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
	removeStorageValue(STORAGE_KEYS.SUPPORTER_PASSPORT_CODE, {
		legacyKeys: LEGACY_STORAGE_KEYS.SUPPORTER_PASSPORT_CODE,
		storage
	});
	clearStoredVaultHash(storage);
}

export function readStoredSupporterCode(storage) {
	return normalizeStoredSupporterCode(
		readStorageValue(STORAGE_KEYS.SUPPORTER_PASSPORT_CODE, {
			legacyKeys: LEGACY_STORAGE_KEYS.SUPPORTER_PASSPORT_CODE,
			storage
		})
	);
}

export function saveStoredSupporterCode(code, storage) {
	const normalizedCode = normalizeStoredSupporterCode(code);
	if (!normalizedCode) {
		throw new Error('Supporter passport code is missing');
	}

	const savedCode = writeStorageValue(STORAGE_KEYS.SUPPORTER_PASSPORT_CODE, normalizedCode, {
		legacyKeys: LEGACY_STORAGE_KEYS.SUPPORTER_PASSPORT_CODE,
		storage
	});
	clearStoredVaultHash(storage);
	return savedCode;
}

export function readStoredVaultServerUrl(storage) {
	return readStorageValue(STORAGE_KEYS.VAULT_SERVER_URL, {
		legacyKeys: LEGACY_STORAGE_KEYS.VAULT_SERVER_URL,
		storage
	}).trim();
}

export function saveStoredVaultServerUrl(url, storage) {
	const normalizedUrl = url?.toString().trim() || '';
	if (!normalizedUrl) {
		removeStorageValue(STORAGE_KEYS.VAULT_SERVER_URL, {
			legacyKeys: LEGACY_STORAGE_KEYS.VAULT_SERVER_URL,
			storage
		});
		return '';
	}

	return writeStorageValue(STORAGE_KEYS.VAULT_SERVER_URL, normalizedUrl, {
		legacyKeys: LEGACY_STORAGE_KEYS.VAULT_SERVER_URL,
		storage
	});
}
