import { writable } from 'svelte/store';

// Store for the PWA install prompt event
export const installPromptEvent = writable(null);

// Store for tracking if PWA is installed
export const isPwaInstalled = writable(false);

// Check if app is running as installed PWA
if (typeof window !== 'undefined') {
	// Check if running in standalone mode (installed PWA)
	const isStandalone =
		window.matchMedia('(display-mode: standalone)').matches ||
		window.navigator.standalone ||
		document.referrer.includes('android-app://');

	isPwaInstalled.set(isStandalone);

	// Listen for the beforeinstallprompt event
	window.addEventListener('beforeinstallprompt', (e) => {
		// Prevent the default prompt
		e.preventDefault();
		// Store the event for later use
		installPromptEvent.set(e);
	});

	// Listen for successful app install
	window.addEventListener('appinstalled', () => {
		// Clear the install prompt
		installPromptEvent.set(null);
		isPwaInstalled.set(true);
	});
}
