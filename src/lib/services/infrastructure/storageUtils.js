import { browser } from '$app/environment';

export class StorageUtils {
	static getItem(key, defaultValue = null) {
		if (!browser) return defaultValue;

		try {
			const item = localStorage.getItem(key);
			return item !== null ? item : defaultValue;
		} catch (error) {
			console.warn(`StorageUtils: Error reading ${key} from localStorage:`, error);
			return defaultValue;
		}
	}

	static setItem(key, value) {
		if (!browser) return false;

		try {
			localStorage.setItem(key, value);
			return true;
		} catch (error) {
			console.warn(`StorageUtils: Error saving ${key} to localStorage:`, error);
			return false;
		}
	}

	static removeItem(key) {
		if (!browser) return false;

		try {
			localStorage.removeItem(key);
			return true;
		} catch (error) {
			console.warn(`StorageUtils: Error removing ${key} from localStorage:`, error);
			return false;
		}
	}

	static getBooleanItem(key, defaultValue = false) {
		const value = this.getItem(key);
		if (value === null) return defaultValue;
		return value === 'true';
	}

	static getNumberItem(key, defaultValue = 0) {
		const value = this.getItem(key);
		if (value === null) return defaultValue;

		const parsed = parseInt(value, 10);
		return isNaN(parsed) ? defaultValue : parsed;
	}

	static getJSONItem(key, defaultValue = null) {
		const value = this.getItem(key);
		if (value === null) return defaultValue;

		try {
			return JSON.parse(value);
		} catch (error) {
			console.warn(`StorageUtils: Error parsing JSON for ${key}:`, error);
			return defaultValue;
		}
	}

	static setJSONItem(key, value) {
		try {
			const stringified = JSON.stringify(value);
			return this.setItem(key, stringified);
		} catch (error) {
			console.warn(`StorageUtils: Error stringifying JSON for ${key}:`, error);
			return false;
		}
	}
}
