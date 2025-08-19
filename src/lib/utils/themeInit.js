// ===================================================================
// THEME INITIALIZATION - Deferred non-critical setup
// ===================================================================

import { browser } from '$app/environment';

/**
 * Initialize theme system after critical render
 * This handles the non-critical parts that were removed from app.html
 */
export function initializeTheme() {
	if (!browser) return;

	// Get theme from window (set by critical inline script)
	const currentTheme = window.__theme || 'peach';

	// Storage helpers
	const THEME_KEY = 'talktype-vibe';
	const DEFAULT_THEME = 'peach';

	// Save default theme if needed
	if (currentTheme === DEFAULT_THEME && !localStorage.getItem(THEME_KEY)) {
		try {
			localStorage.setItem(THEME_KEY, DEFAULT_THEME);
		} catch (e) {
			console.warn('Could not save default theme:', e);
		}
	}

	// Set initialization flag
	window.themeInitialized = true;

	// Clean up temporary variable
	delete window.__theme;
}

/**
 * Apply theme with optional transition
 * @param {string} theme - Theme name to apply
 * @param {boolean} animate - Whether to animate the transition
 */
export function applyTheme(theme, animate = true) {
	if (!browser) return;

	const root = document.documentElement;

	if (animate) {
		// Add transition class for smooth theme change
		root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
	}

	// Apply theme
	root.setAttribute('data-theme', theme);

	// Save to storage
	try {
		localStorage.setItem('talktype-vibe', theme);
	} catch (e) {
		console.warn('Could not save theme:', e);
	}

	if (animate) {
		// Remove transition after animation
		setTimeout(() => {
			root.style.transition = '';
		}, 300);
	}
}
