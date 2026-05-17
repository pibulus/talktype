// Centralized stores for application state management
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import * as CONSTANTS from './constants';

// Initialize store with localStorage value if available
function createLocalStorageStore(key, initialValue) {
	// Create the writable store
	const store = writable(initialValue);

	// Initialize from localStorage if in browser context
	if (browser) {
		const storedValue = localStorage.getItem(key);
		if (storedValue) {
			store.set(storedValue);
		}
	}

	// Return a custom store that syncs with localStorage
	return {
		subscribe: store.subscribe,
		set: (value) => {
			if (browser) {
				localStorage.setItem(key, value);
			}
			store.set(value);
		},
		update: (fn) => {
			store.update((storeValue) => {
				const newValue = fn(storeValue);
				if (browser) {
					localStorage.setItem(key, newValue);
				}
				return newValue;
			});
		}
	};
}

// Create centralized store for theme/vibe management
export const theme = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.THEME, CONSTANTS.DEFAULT_THEME);

// Store for auto-record preference
export const autoRecord = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.AUTO_RECORD, 'false');

// Store for prompt style preference
export const promptStyle = createLocalStorageStore(
	CONSTANTS.STORAGE_KEYS.PROMPT_STYLE,
	CONSTANTS.DEFAULT_PROMPT_STYLE
);

// Store for custom prompt text
export const customPrompt = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.CUSTOM_PROMPT, '');

// Store for live mode preference
export const liveMode = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.LIVE_MODE, 'true');

// Store for offline/private Whisper mode preference
export const privacyMode = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.PRIVACY_MODE, 'false');

// Repair legacy state where Offline Mode and Live Mode could both be persisted.
// If the user only had Offline Mode saved, preserve that choice. If both were
// saved as enabled, prefer the current default live Deepgram path.
if (browser) {
	const storedPrivacyMode = localStorage.getItem(CONSTANTS.STORAGE_KEYS.PRIVACY_MODE) === 'true';
	const storedLiveMode = localStorage.getItem(CONSTANTS.STORAGE_KEYS.LIVE_MODE);

	if (storedPrivacyMode && storedLiveMode === 'true') {
		privacyMode.set('false');
	} else if (storedPrivacyMode && storedLiveMode === null) {
		liveMode.set('false');
	}
}

// Export all constants for use throughout the app
export { CONSTANTS };

// Helper function to apply theme across app components
// This is the single source of truth for theme application
export function applyTheme(vibeId, animate = false) {
	// Update the store (which also updates localStorage)
	theme.set(vibeId);

	if (browser) {
		const root = document.documentElement;

		// Add transition for smooth theme change if requested
		if (animate) {
			root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
		}

		// Apply theme to document root for consistent CSS targeting
		root.setAttribute('data-theme', vibeId);

		// Remove transition after animation
		if (animate) {
			setTimeout(() => {
				root.style.transition = '';
			}, 300);
		}
	}
}
