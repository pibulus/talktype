/**
 * Analytics Service - Umami Integration
 * Privacy-focused, cookie-free analytics
 */

import { browser } from '$app/environment';

/**
 * Track event (safe wrapper for Umami)
 */
function track(eventName, properties = {}) {
	if (!browser || !window.umami) return;

	try {
		window.umami.track(eventName, properties);
	} catch (error) {
		console.warn('Analytics track error:', error);
	}
}

/**
 * === CRITICAL EVENTS ===
 */
export const analytics = {
	// Engagement
	completeTranscription(method, duration, wordCount) {
		track('transcription_completed', { method, duration, wordCount });
	},

	copyTranscript(wordCount) {
		track('transcript_copied', { word_count: wordCount });
	},

	shareTranscript(method, wordCount) {
		track('transcript_shared', { method, word_count: wordCount });
	},

	// UI Interactions
	viewModal(modalName) {
		track('modal_viewed', { modal: modalName });
	},

	clickExternal(destination) {
		track('external_link_clicked', { destination });
	},

	// Retention
	installPWA(outcome = 'accepted') {
		track('pwa_install_outcome', { outcome });
	},

	viewInstallModal(platform) {
		track('pwa_install_modal_viewed', { platform });
	},

	viewTranscriptHistory(transcriptCount) {
		track('transcript_history_viewed', { transcript_count: transcriptCount });
	}
};

// No init needed for Umami (script tag handles it)
export function initAnalytics() {
	// No-op
}

export default analytics;
