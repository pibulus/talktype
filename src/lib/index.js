// Centralized stores for application state management
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import * as CONSTANTS from './constants';
import {
	readStorageValue,
	writeStorageValue
} from '$lib/services/storage/localStorageMigration.js';

// Initialize store with localStorage value if available
function createLocalStorageStore(key, initialValue, { legacyKeys = [] } = {}) {
	// Create the writable store
	const store = writable(initialValue);

	// Initialize from localStorage if in browser context
	if (browser) {
		const storedValue = readStorageValue(key, { legacyKeys });
		if (storedValue) {
			store.set(storedValue);
		}
	}

	// Return a custom store that syncs with localStorage
	return {
		subscribe: store.subscribe,
		set: (value) => {
			if (browser) {
				writeStorageValue(key, value, { legacyKeys });
			}
			store.set(value);
		},
		update: (fn) => {
			store.update((storeValue) => {
				const newValue = fn(storeValue);
				if (browser) {
					writeStorageValue(key, newValue, { legacyKeys });
				}
				return newValue;
			});
		}
	};
}

function hasStoredSupporterToken() {
	if (!browser) return false;
	if (import.meta.env.PUBLIC_FORCE_SUPPORTER_MODE === 'true') return true;

	const hasToken = Boolean(
		localStorage.getItem(CONSTANTS.STORAGE_KEYS.SUPPORTER_TOKEN) ||
			CONSTANTS.LEGACY_STORAGE_KEYS.SUPPORTER_TOKEN.some((key) => localStorage.getItem(key))
	);
	if (!hasToken) return false;

	// Honour the soft 1-year expiry (missing stamp = legacy unlock, still valid).
	const raw = localStorage.getItem(CONSTANTS.STORAGE_KEYS.SUPPORTER_EXPIRES);
	if (!raw) return true;
	const expires = Number(raw);
	return !Number.isFinite(expires) || Date.now() < expires;
}

function sanitizeTheme(vibeId) {
	if (vibeId === CONSTANTS.THEMES.RAINBOW && !hasStoredSupporterToken()) {
		return CONSTANTS.DEFAULT_THEME;
	}

	return Object.values(CONSTANTS.THEMES).includes(vibeId) ? vibeId : CONSTANTS.DEFAULT_THEME;
}

// Create centralized store for theme/vibe management
export const theme = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.THEME, CONSTANTS.DEFAULT_THEME);

if (browser) {
	const storedTheme = localStorage.getItem(CONSTANTS.STORAGE_KEYS.THEME);
	const safeTheme = sanitizeTheme(storedTheme);
	if (storedTheme && safeTheme !== storedTheme) {
		theme.set(safeTheme);
	}
}

// Store for auto-record preference
export const autoRecord = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.AUTO_RECORD, 'false');

// Store for prompt style preference
export const promptStyle = createLocalStorageStore(
	CONSTANTS.STORAGE_KEYS.PROMPT_STYLE,
	CONSTANTS.DEFAULT_PROMPT_STYLE,
	{ legacyKeys: CONSTANTS.LEGACY_STORAGE_KEYS.PROMPT_STYLE }
);

// Store for custom prompt text
export const customPrompt = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.CUSTOM_PROMPT, '', {
	legacyKeys: CONSTANTS.LEGACY_STORAGE_KEYS.CUSTOM_PROMPT
});

// Store for live mode preference
export const liveMode = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.LIVE_MODE, 'false');

// Store for offline/private Whisper mode preference
export const privacyMode = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.PRIVACY_MODE, 'false');

// Repair legacy state where Offline Mode and Live Mode could both be persisted.
// If the user only had Offline Mode saved, preserve that choice. If both modes
// were saved as enabled, keep Offline Mode and turn Live Mode off.
if (browser) {
	const storedPrivacyMode = localStorage.getItem(CONSTANTS.STORAGE_KEYS.PRIVACY_MODE) === 'true';
	const storedLiveMode = localStorage.getItem(CONSTANTS.STORAGE_KEYS.LIVE_MODE);
	const afterStopDefaultMigrated =
		localStorage.getItem(CONSTANTS.STORAGE_KEYS.TEXT_TIMING_DEFAULT_MIGRATED) === 'true';

	if (!afterStopDefaultMigrated) {
		if (!storedPrivacyMode) {
			liveMode.set('false');
		}
		localStorage.setItem(CONSTANTS.STORAGE_KEYS.TEXT_TIMING_DEFAULT_MIGRATED, 'true');
	}

	if (storedPrivacyMode && storedLiveMode === 'true') {
		liveMode.set('false');
	} else if (storedPrivacyMode && storedLiveMode === null) {
		liveMode.set('false');
	}
}

// Export all constants for use throughout the app
export { CONSTANTS };

// Helper function to apply theme across app components
// This is the single source of truth for theme application
export function applyTheme(vibeId, animate = false) {
	const safeVibeId = sanitizeTheme(vibeId);

	// Update the store (which also updates localStorage)
	theme.set(safeVibeId);

	if (browser) {
		const root = document.documentElement;

		// Add transition for smooth theme change if requested
		if (animate) {
			root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
		}

		// Apply theme to document root for consistent CSS targeting
		root.setAttribute('data-theme', safeVibeId);

		// Remove transition after animation
		if (animate) {
			setTimeout(() => {
				root.style.transition = '';
			}, 300);
		}
	}
}
