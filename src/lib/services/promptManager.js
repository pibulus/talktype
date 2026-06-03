import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '$lib/constants';
import {
	readStorageValue,
	writeStorageValue
} from '$lib/services/storage/localStorageMigration.js';
import { promptTemplates, applyTemplate } from './promptTemplates';

// Create a store for the current prompt style
const STORAGE_KEY = STORAGE_KEYS.PROMPT_STYLE;
const CUSTOM_PROMPT_KEY = STORAGE_KEYS.CUSTOM_PROMPT;
const DEFAULT_STYLE = 'standard';

// Initialize with stored preference or default
const createPromptStyleStore = () => {
	const store = writable(DEFAULT_STYLE);

	// Initialize from localStorage if in browser
	if (browser) {
		const storedStyle = readStorageValue(STORAGE_KEY, {
			legacyKeys: LEGACY_STORAGE_KEYS.PROMPT_STYLE
		});
		if (storedStyle && promptTemplates[storedStyle]) {
			store.set(storedStyle);
		} else if (storedStyle && !promptTemplates[storedStyle]) {
			// Handle the case where a stored style is no longer available (like 'corporate')
			console.log(`Stored prompt style '${storedStyle}' is no longer available, using default`);
			writeStorageValue(STORAGE_KEY, DEFAULT_STYLE, {
				legacyKeys: LEGACY_STORAGE_KEYS.PROMPT_STYLE
			});
			store.set(DEFAULT_STYLE);
		}
	}

	// Return the store with custom methods
	return {
		...store,
		setStyle: (style) => {
			if (!promptTemplates[style]) {
				console.error(`Prompt style '${style}' not found`);
				return false;
			}

			store.set(style);

			// Save to localStorage if in browser
			if (browser) {
				writeStorageValue(STORAGE_KEY, style, {
					legacyKeys: LEGACY_STORAGE_KEYS.PROMPT_STYLE
				});
			}

			return true;
		},
		getAvailableStyles: () => {
			return Object.keys(promptTemplates);
		}
	};
};

// Create and export the store
export const promptStyleStore = createPromptStyleStore();

// Prompt manager functions
export const promptManager = {
	// Get the current prompt style
	getCurrentStyle: () => get(promptStyleStore),

	// Set the current prompt style
	setStyle: (style) => promptStyleStore.setStyle(style),

	// Get available prompt styles
	getAvailableStyles: () => promptStyleStore.getAvailableStyles(),

	// Get a prompt for a specific operation using the current style
	getPrompt: (operation, variables = {}) => {
		let currentStyle = get(promptStyleStore);

		// Check if current style exists, if not, reset to default
		if (!promptTemplates[currentStyle]) {
			console.error(`Prompt style '${currentStyle}' not found, falling back to standard`);
			currentStyle = DEFAULT_STYLE;
			// Update the store to prevent repeated errors
			promptStyleStore.setStyle(DEFAULT_STYLE);
		}

		if (!promptTemplates[currentStyle][operation]) {
			console.error(
				`Operation '${operation}' not found in style '${currentStyle}', falling back to standard`
			);
			return applyTemplate(promptTemplates.standard[operation].text, variables);
		}

		return applyTemplate(promptTemplates[currentStyle][operation].text, variables);
	},

	// Subscribe to style changes
	subscribe: (callback) => promptStyleStore.subscribe(callback),

	// Custom prompt support
	setCustomPrompt: (prompt) => {
		if (browser) {
			writeStorageValue(CUSTOM_PROMPT_KEY, prompt, {
				legacyKeys: LEGACY_STORAGE_KEYS.CUSTOM_PROMPT
			});
		}
		return true;
	},

	getCustomPrompt: () => {
		if (browser) {
			return readStorageValue(CUSTOM_PROMPT_KEY, {
				legacyKeys: LEGACY_STORAGE_KEYS.CUSTOM_PROMPT
			});
		}
		return '';
	}
};
