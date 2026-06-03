import { browser } from '$app/environment';

const MAX_PENDING_EVENTS = 20;
const TRACK_RETRY_DELAYS = [250, 1000, 3000];

let pendingEvents = [];
let retryTimer = null;
let retryAttempt = 0;

function getUmami() {
	if (!browser) return null;
	return typeof window?.umami?.track === 'function' ? window.umami : null;
}

function isAnalyticsExpected() {
	if (!browser) return false;
	return Boolean(window?.__talktypeUmamiExpected || getUmami());
}

function normalizeToken(value, fallback = 'unknown') {
	if (value === true) return 'true';
	if (value === false) return 'false';
	if (value === null || value === undefined) return fallback;

	const normalized = String(value)
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_.:-]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 80);

	return normalized || fallback;
}

function sanitizeProperties(properties = {}) {
	return Object.fromEntries(
		Object.entries(properties)
			.filter(([, value]) => value !== null && value !== undefined && value !== '')
			.map(([key, value]) => [normalizeToken(key), normalizeToken(value)])
	);
}

function flushPendingEvents() {
	const umami = getUmami();
	if (!umami || pendingEvents.length === 0) return false;

	const events = pendingEvents;
	pendingEvents = [];
	events.forEach(({ name, properties }) => {
		umami.track(name, properties);
	});
	return true;
}

function scheduleFlush() {
	if (!browser || retryTimer || retryAttempt >= TRACK_RETRY_DELAYS.length) return;

	const delay = TRACK_RETRY_DELAYS[retryAttempt];
	retryAttempt += 1;
	retryTimer = window.setTimeout(() => {
		retryTimer = null;
		if (!flushPendingEvents() && pendingEvents.length > 0) {
			scheduleFlush();
		}
	}, delay);
}

export function trackAnalyticsEvent(eventName, properties = {}) {
	if (!browser || !isAnalyticsExpected()) return false;

	const name = normalizeToken(eventName, '');
	if (!name) return false;

	const payload = sanitizeProperties(properties);
	const umami = getUmami();

	if (umami) {
		try {
			flushPendingEvents();
			umami.track(name, payload);
			return true;
		} catch (error) {
			console.warn('[Analytics] Event failed:', error?.message || error);
			return false;
		}
	}

	pendingEvents = [
		...pendingEvents.slice(-(MAX_PENDING_EVENTS - 1)),
		{ name, properties: payload }
	];
	scheduleFlush();
	return false;
}

export function durationBucket(seconds) {
	const value = Number(seconds);
	if (!Number.isFinite(value) || value < 0) return 'unknown';
	if (value < 2) return 'under_2s';
	if (value < 10) return '2_10s';
	if (value < 30) return '10_30s';
	if (value < 60) return '30_60s';
	if (value < 180) return '1_3m';
	if (value < 300) return '3_5m';
	if (value < 900) return '5_15m';
	return '15m_plus';
}

export function classifyAnalyticsError(error) {
	const name = error?.name?.toString().toLowerCase() || '';
	const message = (error?.message || error || '').toString().toLowerCase();
	const text = `${name} ${message}`;

	if (text.includes('permission') || text.includes('notallowed') || text.includes('denied')) {
		return 'permission';
	}
	if (text.includes('timeout') || text.includes('timed out') || text.includes('abort')) {
		return 'timeout';
	}
	if (text.includes('quota') || text.includes('limit') || text.includes('rate')) return 'limit';
	if (text.includes('fetch') || text.includes('network') || text.includes('connection')) {
		return 'network';
	}
	if (text.includes('offline') || text.includes('whisper') || text.includes('model')) {
		return 'offline_model';
	}
	if (text.includes('short') || text.includes('speech')) return 'audio_too_short';
	if (text.includes('unsupported')) return 'unsupported';
	return 'unknown';
}

export function normalizeTranscriptionMode(mode) {
	if (mode?.useOfflineWhisper) return 'offline';
	if (mode?.useLiveDeepgram) return 'live';

	const value = normalizeToken(mode, 'after_stop');
	if (['standard', 'after_stop', 'after-stop'].includes(value)) return 'after_stop';
	if (value === 'privacy') return 'offline';
	return value;
}

function normalizeMethod(method) {
	const value = normalizeToken(method, 'unknown');
	if (value === 'cloud') return 'cloud_batch';
	return value.replace(/-/g, '_');
}

export const analytics = {
	recordingStarted({ mode, source = 'manual' } = {}) {
		trackAnalyticsEvent('record_start', {
			mode: normalizeTranscriptionMode(mode),
			source
		});
	},

	recordingStopped({ mode, durationSeconds, reason = 'manual' } = {}) {
		trackAnalyticsEvent('record_stop', {
			mode: normalizeTranscriptionMode(mode),
			duration: durationBucket(durationSeconds),
			reason
		});
	},

	recordingStartFailed({ mode, source = 'manual', error } = {}) {
		trackAnalyticsEvent('record_start_error', {
			mode: normalizeTranscriptionMode(mode),
			source,
			category: classifyAnalyticsError(error)
		});
	},

	recordingLimitHit({ mode } = {}) {
		trackAnalyticsEvent('recording_limit_hit', {
			mode: normalizeTranscriptionMode(mode)
		});
	},

	transcriptionSucceeded({ mode, method, durationSeconds } = {}) {
		trackAnalyticsEvent('transcribe_success', {
			mode: normalizeTranscriptionMode(mode),
			method: normalizeMethod(method),
			duration: durationBucket(durationSeconds)
		});
	},

	transcriptionFailed({ mode, error } = {}) {
		trackAnalyticsEvent('transcribe_error', {
			mode: normalizeTranscriptionMode(mode),
			category: classifyAnalyticsError(error)
		});
	},

	copySucceeded({ trigger = 'manual' } = {}) {
		trackAnalyticsEvent('copy_success', { trigger });
	},

	copyNeedsTap({ trigger = 'auto' } = {}) {
		trackAnalyticsEvent('copy_needs_tap', { trigger });
	},

	transcriptShared({ method = 'native' } = {}) {
		trackAnalyticsEvent('transcript_share', { method });
	},

	appShared({ method = 'native' } = {}) {
		trackAnalyticsEvent('app_share', { method });
	},

	modeChanged(mode) {
		trackAnalyticsEvent('mode_change', {
			mode: normalizeTranscriptionMode(mode)
		});
	},

	offlineModelLoadStarted({ source = 'settings' } = {}) {
		trackAnalyticsEvent('offline_model_download_start', { source });
	},

	offlineModelReady({ alreadyLoaded = false } = {}) {
		trackAnalyticsEvent('offline_model_ready', { already_loaded: alreadyLoaded });
	},

	offlineModelFailed({ error } = {}) {
		trackAnalyticsEvent('offline_model_error', {
			category: classifyAnalyticsError(error)
		});
	},

	supporterModalOpened({ source = 'manual' } = {}) {
		trackAnalyticsEvent('supporter_modal_open', { source });
	},

	checkoutStarted() {
		trackAnalyticsEvent('checkout_start');
	},

	checkoutFailed({ error } = {}) {
		trackAnalyticsEvent('checkout_error', {
			category: classifyAnalyticsError(error)
		});
	},

	supporterUnlockSucceeded({ method = 'code' } = {}) {
		trackAnalyticsEvent('supporter_unlock_success', { method });
	},

	supporterUnlockFailed({ method = 'code', error } = {}) {
		trackAnalyticsEvent('supporter_unlock_error', {
			method,
			category: classifyAnalyticsError(error)
		});
	},

	pwaPromptShown() {
		trackAnalyticsEvent('pwa_prompt_shown');
	},

	pwaInstalled() {
		trackAnalyticsEvent('pwa_installed');
	},

	extensionModalOpened() {
		trackAnalyticsEvent('extension_modal_open');
	}
};

export default analytics;
