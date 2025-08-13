import { browser } from '$app/environment';
import { StorageUtils } from '../infrastructure/storageUtils';
import { STORAGE_KEYS } from '../../constants';

export class ThemeService {
	constructor() {
		this.storageKey = STORAGE_KEYS.THEME;
		this.defaultTheme = 'peach';
		this.initialized = false;
	}

	getCurrentTheme() {
		return StorageUtils.getItem(this.storageKey, this.defaultTheme);
	}

	applyTheme(themeId) {
		if (!browser) return;

		StorageUtils.setItem(this.storageKey, themeId);
		document.documentElement.setAttribute('data-theme', themeId);
	}

	initializeTheme() {
		if (!browser) return;

		// Check if theme was already initialized by the inline script
		if (typeof window !== 'undefined' && window.themeInitialized) {
			this.initialized = true;
			return;
		}

		// Only initialize if not already done
		if (this.initialized) return;

		const savedTheme = StorageUtils.getItem(this.storageKey);
		const currentTheme = document.documentElement.getAttribute('data-theme');

		if (!savedTheme) {
			StorageUtils.setItem(this.storageKey, this.defaultTheme);
			if (currentTheme !== this.defaultTheme) {
				document.documentElement.setAttribute('data-theme', this.defaultTheme);
			}
		} else if (currentTheme !== savedTheme) {
			document.documentElement.setAttribute('data-theme', savedTheme);
		}

		// Force browser reflow to ensure theme is applied immediately
		if (typeof document !== 'undefined') {
			void document.documentElement.offsetWidth;
		}

		this.initialized = true;
	}
}

export const themeService = new ThemeService();
