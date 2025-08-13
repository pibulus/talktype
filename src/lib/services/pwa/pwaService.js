import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';
import { StorageUtils } from '../infrastructure/storageUtils';
import { STORAGE_KEYS } from '../../constants';

// PWA state configuration
const PWA_INSTALL_PROMPT_THRESHOLD = 5;

// PWA stores
export const deferredInstallPrompt = writable(null);
export const transcriptionCount = writable(0);
export const showPwaInstallPrompt = writable(false);
export const isPwaInstalled = writable(false);

// Derived store to determine if prompt should be shown
export const shouldShowPrompt = derived(
	[transcriptionCount, isPwaInstalled],
	([$count, $isInstalled]) => {
		if (!browser || $isInstalled) return false;

		// Skip prompt in development environments
		const isDevelopment =
			browser &&
			(window.location.hostname === 'localhost' ||
				window.location.hostname === '127.0.0.1' ||
				window.location.port === '5173' ||
				window.location.port === '4173');

		if (isDevelopment) return false;

		// Check if on desktop - only show prompt on compatible platforms
		const isMobile = browser ? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) : false;
		const isCompatibleDesktop = browser
			? /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent)
			: false;

		if (!isMobile && !isCompatibleDesktop) return false;

		return $count >= PWA_INSTALL_PROMPT_THRESHOLD;
	}
);

export class PwaService {
	constructor() {
		this.debug = false;

		if (browser) {
			// Check if we're in development mode
			const isDevelopment =
				window.location.hostname === 'localhost' ||
				window.location.hostname === '127.0.0.1' ||
				window.location.port === '5173' ||
				window.location.port === '4173';

			// Always load stored values
			this.initializeFromStorage();
			this.setupEventListeners();

			// In development, don't auto-check for PWA status
			if (!isDevelopment) {
				// Defer PWA check slightly to ensure document is fully loaded
				setTimeout(() => this.checkIfRunningAsPwa(), 500);
			}
		}
	}

	setDebug(value) {
		this.debug = !!value;
	}

	log(message) {
		if (this.debug) {
			console.log(`[PwaService] ${message}`);
		}
	}

	initializeFromStorage() {
		// Load transcription count
		const count = this.getTranscriptionCount();
		transcriptionCount.set(count);

		// Check if installed
		const isInstalled = StorageUtils.getBooleanItem(STORAGE_KEYS.PWA_INSTALLED, false);
		isPwaInstalled.set(isInstalled);

		this.log(`Initialized: count=${count}, installed=${isInstalled}`);
	}

	setupEventListeners() {
		// Listen for beforeinstallprompt event
		window.addEventListener('beforeinstallprompt', (e) => {
			// Prevent the mini-infobar from appearing on mobile
			e.preventDefault();

			// Store the event for later use
			deferredInstallPrompt.set(e);
			this.log('Captured beforeinstallprompt event');
		});

		// Listen for app installed event
		window.addEventListener('appinstalled', () => {
			this.log('App installed successfully');
			this.markAsInstalled();
			deferredInstallPrompt.set(null);
			showPwaInstallPrompt.set(false);
		});
	}

	getTranscriptionCount() {
		return StorageUtils.getNumberItem(STORAGE_KEYS.TRANSCRIPTION_COUNT, 0);
	}

	incrementTranscriptionCount() {
		if (!browser) return 0;

		try {
			const currentCount = this.getTranscriptionCount();
			const newCount = currentCount + 1;

			StorageUtils.setItem(STORAGE_KEYS.TRANSCRIPTION_COUNT, newCount.toString());
			transcriptionCount.set(newCount);

			this.log(`Transcription count incremented to ${newCount}`);

			// Check if we should show the prompt
			if (this.shouldShowPwaPrompt()) {
				this.log('Conditions met for showing PWA prompt');
				showPwaInstallPrompt.set(true);
			}

			return newCount;
		} catch (error) {
			console.error('Error incrementing transcription count:', error);
			return 0;
		}
	}

	shouldShowPwaPrompt() {
		if (!browser) return false;

		try {
			// Don't show if already installed
			if (StorageUtils.getBooleanItem(STORAGE_KEYS.PWA_INSTALLED, false)) {
				return false;
			}

			// Check conditions based on transcription count and last prompt
			const count = this.getTranscriptionCount();
			const hasShownPrompt = StorageUtils.getBooleanItem(STORAGE_KEYS.PWA_PROMPT_SHOWN, false);
			const promptCount = StorageUtils.getNumberItem(STORAGE_KEYS.PWA_PROMPT_COUNT, 0);
			const lastPromptDate = StorageUtils.getItem(STORAGE_KEYS.PWA_LAST_PROMPT_DATE);

			// If we've never shown the prompt before, show it after threshold
			if (!hasShownPrompt && count >= PWA_INSTALL_PROMPT_THRESHOLD) {
				return true;
			}

			// If we've shown the prompt 1-2 times before
			if (hasShownPrompt && promptCount < 3) {
				const daysSinceLastPrompt = lastPromptDate
					? Math.floor((Date.now() - new Date(lastPromptDate).getTime()) / (1000 * 60 * 60 * 24))
					: 0;

				// Show again after at least 3 days and 5 more transcriptions
				if (daysSinceLastPrompt >= 3 && count >= 5) {
					return true;
				}
			}

			// If we've shown the prompt 3+ times, be more conservative
			if (promptCount >= 3) {
				const daysSinceLastPrompt = lastPromptDate
					? Math.floor((Date.now() - new Date(lastPromptDate).getTime()) / (1000 * 60 * 60 * 24))
					: 0;

				// Show again after at least 14 days and 10 more transcriptions
				if (daysSinceLastPrompt >= 14 && count >= 10) {
					return true;
				}
			}

			return false;
		} catch (error) {
			console.error('Error checking if PWA prompt should be shown:', error);
			return false;
		}
	}

	recordPromptShown() {
		if (!browser) return;

		try {
			// Mark that we've shown the prompt
			StorageUtils.setItem(STORAGE_KEYS.PWA_PROMPT_SHOWN, 'true');

			// Get and increment the prompt count
			const promptCount = StorageUtils.getNumberItem(STORAGE_KEYS.PWA_PROMPT_COUNT, 0);
			StorageUtils.setItem(STORAGE_KEYS.PWA_PROMPT_COUNT, (promptCount + 1).toString());

			// Record the current date
			StorageUtils.setItem(STORAGE_KEYS.PWA_LAST_PROMPT_DATE, new Date().toISOString());

			this.log(`PWA installation prompt shown (count: ${promptCount + 1})`);
		} catch (error) {
			console.error('Error recording PWA prompt shown:', error);
		}
	}

	markAsInstalled() {
		if (!browser) return;

		try {
			StorageUtils.setItem(STORAGE_KEYS.PWA_INSTALLED, 'true');
			isPwaInstalled.set(true);
			this.log('PWA marked as installed');
		} catch (error) {
			console.error('Error marking PWA as installed:', error);
		}
	}

	async checkIfRunningAsPwa() {
		if (!browser) return false;

		try {
			// Skip PWA detection in development environments
			const isDevelopment =
				window.location.hostname === 'localhost' ||
				window.location.hostname === '127.0.0.1' ||
				window.location.port === '5173' ||
				window.location.port === '4173';

			if (isDevelopment) {
				this.log('Development environment detected, bypassing PWA detection');
				return false;
			}

			let confidenceScore = 0;
			const confidenceThreshold = 2;

			// Display mode checks (less weight now)
			const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
			const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
			const isMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
			const iOSStandalone = navigator.standalone; // iOS specific

			if (isStandalone || iOSStandalone) confidenceScore += 1;
			if (isFullscreen || isMinimalUi) confidenceScore += 0.5;

			// Web App Manifest check
			const manifestLinks = document.querySelectorAll('link[rel="manifest"]');
			if (manifestLinks.length > 0) confidenceScore += 0.5;

			// Service Worker check (strong indicator)
			if ('serviceWorker' in navigator) {
				const registrations = await navigator.serviceWorker.getRegistrations();
				if (registrations.length > 0) confidenceScore += 1.5;
			}

			// Check for installation event registration
			if (StorageUtils.getBooleanItem(STORAGE_KEYS.PWA_PROMPT_SHOWN, false)) {
				confidenceScore += 0.5;
			}

			// Check for device context (desktop needs more confidence)
			const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
			const requiredConfidence = isMobile ? confidenceThreshold - 0.5 : confidenceThreshold;

			const isPWA = confidenceScore >= requiredConfidence;

			this.log(
				`PWA detection: confidence=${confidenceScore}, threshold=${requiredConfidence}, isPWA=${isPWA}`
			);

			if (isPWA) {
				this.markAsInstalled();
			}

			return isPWA;
		} catch (error) {
			console.error('Error checking if running as PWA:', error);
			return false;
		}
	}

	dismissPrompt() {
		// Simply update the store value to control component visibility
		showPwaInstallPrompt.set(false);
	}
}

export const pwaService = new PwaService();
