import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';
import { StorageUtils } from '../infrastructure/storageUtils';
import { STORAGE_KEYS } from '../../constants';

// PWA state configuration - simplified to show after 3 transcriptions
const PWA_INSTALL_PROMPT_THRESHOLD = 3;

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

		// Simple logic: show after threshold transcriptions, unless installed or dismissed
		const isInstalled = StorageUtils.getBooleanItem(STORAGE_KEYS.PWA_INSTALLED, false);
		const isDismissed = StorageUtils.getBooleanItem(STORAGE_KEYS.PWA_DISMISSED, false);
		const count = this.getTranscriptionCount();

		return !isInstalled && !isDismissed && count >= PWA_INSTALL_PROMPT_THRESHOLD;
	}

	recordPromptShown() {
		if (!browser) return;
		// Simple tracking - just log that we showed it
		this.log('PWA installation prompt shown');
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

		// Skip PWA detection in development
		const isDevelopment =
			window.location.hostname === 'localhost' ||
			window.location.hostname === '127.0.0.1' ||
			window.location.port === '5173' ||
			window.location.port === '4173';

		if (isDevelopment) {
			this.log('Development environment - skipping PWA detection');
			return false;
		}

		// Simple check: standalone mode or iOS standalone
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
		const iOSStandalone = navigator.standalone === true;
		const isPWA = isStandalone || iOSStandalone;

		this.log(`PWA detection: standalone=${isStandalone}, iOS=${iOSStandalone}, isPWA=${isPWA}`);

		if (isPWA) {
			this.markAsInstalled();
		}

		return isPWA;
	}

	dismissPrompt() {
		// Mark as dismissed so we don't show again
		StorageUtils.setItem(STORAGE_KEYS.PWA_DISMISSED, 'true');
		showPwaInstallPrompt.set(false);
		this.log('PWA prompt dismissed by user');
	}
}

export const pwaService = new PwaService();
