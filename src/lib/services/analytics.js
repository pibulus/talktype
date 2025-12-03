/**
 * Analytics Service - PostHog Integration
 * Tracks critical events for conversion optimization
 *
 * 80/20 Rule: Track only what matters for revenue
 *
 * Setup:
 *   npm install posthog-js
 *   Add VITE_POSTHOG_KEY to .env
 */

import { browser } from '$app/environment';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

let initialized = false;
let posthog = null;

/**
 * Initialize PostHog (call once on app load)
 */
export async function initAnalytics() {
	if (!browser || !POSTHOG_KEY) {
		// console.log('📊 Analytics: Not configured (missing VITE_POSTHOG_KEY)');
		return;
	}

	if (initialized) return;

	try {
		// Dynamically import PostHog (graceful fallback if not installed)
		const module = await import('posthog-js');
		posthog = module.default;

		posthog.init(POSTHOG_KEY, {
			api_host: POSTHOG_HOST,
			// Privacy-first settings
			autocapture: false, // We'll track manually
			capture_pageview: true,
			disable_session_recording: true, // Respect privacy
			// Performance
			loaded: () => {
				// console.log('📊 Analytics: PostHog initialized');
				initialized = true;
			}
		});
	} catch {
		// console.warn('📊 Analytics: PostHog not available (install with: npm install posthog-js)');
		// App continues to work without analytics
	}
}

/**
 * Track event (safe wrapper)
 */
function track(eventName, properties = {}) {
	if (!browser || !initialized) return;

	try {
		posthog.capture(eventName, properties);
	} catch (error) {
		console.error('Analytics track error:', error);
	}
}

/**
 * === CRITICAL EVENTS (80/20) ===
 * These drive business decisions
 */

// 1. CONVERSION FUNNEL
export const analytics = {
	// Premium funnel
	viewPremiumModal(feature = null) {
		track('premium_modal_viewed', {
			triggered_by: feature, // Which locked feature they clicked
			timestamp: new Date().toISOString()
		});
	},

	startPayment(amount, currency) {
		track('payment_started', {
			amount,
			currency,
			timestamp: new Date().toISOString()
		});
	},

	completePayment(amount, currency, unlockCode) {
		track('payment_completed', {
			amount,
			currency,
			unlock_code: unlockCode,
			timestamp: new Date().toISOString()
		});
		// Identify as premium user
		if (initialized) {
			posthog.setPersonProperties({
				is_premium: true,
				unlock_date: new Date().toISOString()
			});
		}
	},

	// Campaign performance
	viewCampaignCountdown(remaining, total) {
		track('campaign_countdown_viewed', {
			remaining,
			total,
			percentage_sold: Math.round(((total - remaining) / total) * 100)
		});
	},

	// 2. ENGAGEMENT
	completeTranscription(method, duration, wordCount) {
		track('transcription_completed', {
			method, // 'gemini' | 'whisper'
			duration_seconds: duration,
			word_count: wordCount
		});
	},

	// 3. FEATURE USAGE (what drives conversions?)
	clickLockedFeature(featureName) {
		track('locked_feature_clicked', {
			feature: featureName // 'theme', 'custom_prompt', 'extended_recording'
		});
	},

	// 4. RETENTION
	installPWA() {
		track('pwa_installed');
	},

	viewTranscriptHistory(transcriptCount) {
		track('transcript_history_viewed', {
			transcript_count: transcriptCount
		});
	},

	// 5. UNLOCK CODE USAGE (multi-device tracking)
	validateUnlockCode(success) {
		track('unlock_code_validated', {
			success,
			timestamp: new Date().toISOString()
		});
	}
};

// Auto-initialize if key is present
if (browser && POSTHOG_KEY) {
	initAnalytics();
}

export default analytics;
