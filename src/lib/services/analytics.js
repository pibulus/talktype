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
	// Premium funnel
	viewPremiumModal(feature = null) {
		track('premium_modal_viewed', { feature });
	},

	startPayment(amount, currency) {
		track('payment_started', { amount, currency });
	},

	completePayment(amount, currency) {
		track('payment_completed', { amount, currency });
	},

	// Campaign performance
	viewCampaignCountdown(remaining, total) {
		track('campaign_countdown_viewed', { remaining, total });
	},

	// Engagement
	completeTranscription(method, duration, wordCount) {
		track('transcription_completed', { method, duration, wordCount });
	},

	// Feature usage
	clickLockedFeature(featureName) {
		track('locked_feature_clicked', { feature: featureName });
	},

	// Retention
	installPWA() {
		track('pwa_installed');
	},

	viewTranscriptHistory(transcriptCount) {
		track('transcript_history_viewed', { transcript_count: transcriptCount });
	},

	// Unlock code usage
	validateUnlockCode(success) {
		track('unlock_code_validated', { success });
	}
};

// No init needed for Umami (script tag handles it)
export function initAnalytics() {
	// No-op
}

export default analytics;
