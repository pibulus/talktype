import { browser } from '$app/environment';

function getStorage(storage) {
	if (storage) return storage;
	if (!browser) return null;
	return localStorage;
}

function removeKeys(storage, keys) {
	keys.forEach((key) => storage.removeItem(key));
}

export function readStorageValue(key, { legacyKeys = [], storage = null, defaultValue = '' } = {}) {
	const targetStorage = getStorage(storage);
	if (!targetStorage) return defaultValue;

	try {
		const currentValue = targetStorage.getItem(key);
		if (currentValue !== null) return currentValue;

		for (const legacyKey of legacyKeys) {
			const legacyValue = targetStorage.getItem(legacyKey);
			if (legacyValue !== null) {
				targetStorage.setItem(key, legacyValue);
				removeKeys(targetStorage, legacyKeys);
				return legacyValue;
			}
		}

		return defaultValue;
	} catch (error) {
		console.warn(`Failed to read local storage key ${key}:`, error);
		return defaultValue;
	}
}

export function writeStorageValue(key, value, { legacyKeys = [], storage = null } = {}) {
	const targetStorage = getStorage(storage);
	if (!targetStorage) return value;

	try {
		targetStorage.setItem(key, value);
		removeKeys(targetStorage, legacyKeys);
	} catch (error) {
		console.warn(`Failed to write local storage key ${key}:`, error);
	}

	return value;
}

export function removeStorageValue(key, { legacyKeys = [], storage = null } = {}) {
	const targetStorage = getStorage(storage);
	if (!targetStorage) return;

	try {
		targetStorage.removeItem(key);
		removeKeys(targetStorage, legacyKeys);
	} catch (error) {
		console.warn(`Failed to remove local storage key ${key}:`, error);
	}
}
