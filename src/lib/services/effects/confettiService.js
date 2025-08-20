// ===================================================================
// CONFETTI SERVICE
// Handles confetti animations and theme-aware color selection
// ===================================================================

import { ANIMATION } from '$lib/constants';
import { theme } from '$lib';

export class ConfettiService {
	constructor() {
		this.ConfettiComponent = null;
		this.activeTimeouts = [];
	}

	// Get theme-specific confetti colors
	getThemeConfettiColors() {
		// Get current theme from the store
		let currentTheme;
		const unsubscribe = theme.subscribe((value) => {
			currentTheme = value;
		});
		unsubscribe();

		// Use theme-specific colors if available
		if (currentTheme && ANIMATION.CONFETTI.THEME_COLORS[currentTheme]) {
			return ANIMATION.CONFETTI.THEME_COLORS[currentTheme];
		}

		// Fallback to default colors
		return ANIMATION.CONFETTI.COLORS;
	}

	// Lazy load the Confetti component
	async loadConfettiComponent() {
		if (!this.ConfettiComponent) {
			const module = await import('$lib/components/ui/effects/Confetti.svelte');
			this.ConfettiComponent = module.default;
		}
		return this.ConfettiComponent;
	}

	// Trigger confetti with 1/7 probability (Easter egg)
	shouldTriggerConfetti() {
		return Math.floor(Math.random() * 7) === 0;
	}

	// Create confetti configuration
	createConfettiConfig(targetSelector = '.ghost-icon-wrapper') {
		return {
			targetSelector,
			colors: this.getThemeConfettiColors(),
			duration: ANIMATION.CONFETTI.ANIMATION_DURATION
		};
	}

	// Trigger confetti animation
	async triggerConfetti(targetSelector = '.ghost-icon-wrapper', callback = null) {
		if (!this.shouldTriggerConfetti()) {
			return { shouldShow: false };
		}

		try {
			// Ensure confetti component is loaded
			const ConfettiComponent = await this.loadConfettiComponent();

			const config = this.createConfettiConfig(targetSelector);

			// Set up cleanup timeout
			if (callback) {
				const timeoutId = setTimeout(() => {
					callback();
				}, config.duration + 500);
				this.activeTimeouts.push(timeoutId);
			}

			return {
				shouldShow: true,
				component: ConfettiComponent,
				config
			};
		} catch (error) {
			console.error('Error triggering confetti:', error);
			return { shouldShow: false };
		}
	}

	// Clean up any active timeouts
	cleanup() {
		this.activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
		this.activeTimeouts = [];
	}
}

// Singleton instance
export const confettiService = new ConfettiService();
