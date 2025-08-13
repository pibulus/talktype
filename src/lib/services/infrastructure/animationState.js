import { writable, derived } from 'svelte/store';

// Create a store to track if app animations should be active
export const appActive = writable(true);

// Derived store for animation state
// This is more idiomatic in Svelte than maintaining a cached value
export const shouldAnimateStore = derived(appActive, ($appActive) => $appActive);

// Initialize visibility listener if in browser environment
if (typeof document !== 'undefined') {
	// Set initial state based on document visibility
	appActive.set(document.visibilityState === 'visible');

	// Update state when visibility changes
	document.addEventListener('visibilitychange', () => {
		appActive.set(document.visibilityState === 'visible');
	});
}
