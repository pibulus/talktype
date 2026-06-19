/**
 * TalkType Constants
 *
 * Central configuration for app-wide constants to maintain DRY principles
 * and make future adjustments easier.
 */

// Theme/Vibe Configuration
export const THEMES = {
	PEACH: 'peach',
	MINT: 'mint',
	BUBBLEGUM: 'bubblegum',
	RAINBOW: 'rainbow'
};

export const DEFAULT_THEME = THEMES.PEACH;

// Local Storage Keys
export const APP_STORAGE_PREFIX = 'pibulus:talktype';

export const STORAGE_KEYS = {
	// Application Settings
	THEME: 'talktype-vibe',
	FIRST_VISIT: 'hasSeenTalkTypeIntro',
	AUTO_RECORD: 'talktype_auto_record',
	PROMPT_STYLE: 'talktype-prompt-style',
	CUSTOM_PROMPT: 'talktype_custom_prompt',
	SUPPORTER: `${APP_STORAGE_PREFIX}:supporter`,
	SUPPORTER_TOKEN: `${APP_STORAGE_PREFIX}:supporter_token`,
	SUPPORTER_EXPIRES: `${APP_STORAGE_PREFIX}:supporter_expires`,
	SUPPORTER_PASSPORT_CODE: `${APP_STORAGE_PREFIX}:passport_code`,
	VAULT_SERVER_URL: `${APP_STORAGE_PREFIX}:vault_url`,
	HISTORY_CHANGED_AT: `${APP_STORAGE_PREFIX}:history_changed_at`,
	PRIVACY_MODE: 'talktype_privacy_mode', // Offline Whisper mode
	LIVE_MODE: 'talktype_live_mode',
	WEBGPU_DISABLED: 'talktype_webgpu_disabled', // sticky: WebGPU model load failed on this device

	TEXT_TIMING_DEFAULT_MIGRATED: `${APP_STORAGE_PREFIX}:text_timing_default_after_stop_v1`,
	LAST_TRANSCRIPTION_METHOD: 'last_transcription_method', // Track which service was used

	// PWA Related
	TRANSCRIPTION_COUNT: 'talktype-transcription-count',
	PWA_PROMPT_SHOWN: 'talktype-pwa-prompt-shown',
	PWA_PROMPT_COUNT: 'talktype-pwa-prompt-count',
	PWA_LAST_PROMPT_DATE: 'talktype-pwa-last-prompt-date',
	PWA_LAST_PROMPT_TRANSCRIPTION_COUNT: 'talktype-pwa-last-prompt-transcription-count',
	PWA_INSTALLED: 'talktype-pwa-installed'
};

export const LEGACY_STORAGE_KEYS = {
	SUPPORTER: ['talktype_supporter'],
	SUPPORTER_TOKEN: ['talktype_supporter_token'],
	SUPPORTER_PASSPORT_CODE: ['talktype_supporter_passport_code'],
	VAULT_SERVER_URL: ['talktype_vault_server_url'],
	PROMPT_STYLE: ['talktype_prompt_style'],
	CUSTOM_PROMPT: ['talktype-custom-prompt']
};

export const SUPPORTER_CHECKOUT = {
	CLAIM_HEADER: 'x-talktype-checkout-claim',
	CLAIM_STORAGE_PREFIX: 'talktype_checkout_claim_',
	CLAIM_TOKEN_TTL_MS: 2 * 60 * 60 * 1000,
	MAX_POLLS: 20,
	POLL_INTERVAL_MS: 2500
};

export const SUPPORTER_VAULT = {
	MAX_AUDIO_BLOB_BYTES: 96 * 1024 * 1024
};

// Prompt Styles
export const PROMPT_STYLES = {
	STANDARD: 'standard',
	SURLY_PIRATE: 'surlyPirate',
	LEET_SPEAK: 'leetSpeak',
	SPARKLE_POP: 'sparklePop',
	CODE_WHISPERER: 'codeWhisperer',
	QUILL_AND_INK: 'quillAndInk',
	CUSTOM: 'custom'
};

export const DEFAULT_PROMPT_STYLE = PROMPT_STYLES.STANDARD;

// App Configuration
export const APP_CONFIG = {
	NAME: 'TalkType',
	VERSION: '0.1.1',
	DESCRIPTION: 'Fast voice-to-text with offline mode, live transcription, and saved history',
	AUTHORS: 'Pablo Alvarado'
};

// Transcript history access model:
// Every finished transcript (offline or cloud) is ALWAYS saved locally and is
// always readable — the user's own words are never held hostage. Free tier keeps
// the most recent FREE_HISTORY_LIMIT; supporters get unlimited + encrypted vault.
export const HISTORY = {
	FREE_HISTORY_LIMIT: 15
};

// Animation Timing (in ms)
export const ANIMATION = {
	// Button animations
	BUTTON: {
		PRESS_DURATION: 400, // Duration of button press animation
		HOVER_TRANSITION: 300, // Transition time for button hover effects
		NOTIFICATION_TIMER: 2500 // Time to display notification in button
	},

	// Toast notifications
	TOAST: {
		DISPLAY_DURATION: 3000, // How long toasts stay visible
		ERROR_DURATION: 5000 // How long error toasts stay visible
	},

	// Modal timing
	MODAL: {
		CLOSE_DELAY: 50, // Delay before running closeModal function
		CLOSE_DURATION: 210,
		PERMISSION_ERROR_DURATION: 8000 // How long the permission error shows
	},

	// Recording time limits
	RECORDING: {
		FREE_LIMIT: 300, // Free recordings are capped at 5 minutes
		SUPPORTER_LIMIT: 7200, // Effectively unlimited for supporter mode
		PREMIUM_LIMIT: 7200, // Legacy alias kept aligned with supporter limit
		WARNING_THRESHOLD: 15, // Seconds remaining when to start showing warning
		DANGER_THRESHOLD: 8, // Seconds remaining when to start showing danger state
		ALMOST_DONE_THRESHOLD: 3, // Seconds remaining for final warning flash
		SCROLL_DELAY: 100, // Delay before scrolling during recording
		POST_RECORDING_SCROLL_DELAY: 650 // Delay after transcription to scroll
	},

	// Copy functionality
	COPY: {
		TOOLTIP_MAX_COUNT: 3, // Maximum number of times to show the copy tooltip
		SUCCESS_TIMER: 2500, // How long to show the success message
		FOCUS_RETURN_DELAY: 100 // Delay before returning focus after copy
	},

	// Confetti animation
	CONFETTI: {
		PIECE_COUNT: 48, // Reward burst without covering the transcript
		MIN_SIZE: 6, // Minimum confetti size in px
		MAX_SIZE: 14, // Maximum confetti size in px
		ANIMATION_DURATION: 1800, // Duration of entire confetti animation
		COLORS: [
			'#ff9cef',
			'#fde68a',
			'#a78bfa',
			'#f472b6',
			'#60a5fa',
			'#ec4899',
			'#8b5cf6',
			'#f59e0b',
			'#10b981'
		], // Default vibrant colors

		// Theme-specific color palettes
		THEME_COLORS: {
			peach: ['#f472b6', '#ec4899', '#f59e0b', '#ff9cef', '#fde68a', '#ff9cb8'],
			mint: ['#10b981', '#34d399', '#a78bfa', '#60a5fa', '#00dfa7', '#8af9ff'],
			bubblegum: ['#ff9cef', '#f472b6', '#ec4899', '#8b5cf6', '#e879f9', '#ff99d6'],
			rainbow: [
				'#ff9cef',
				'#fde68a',
				'#a78bfa',
				'#f472b6',
				'#60a5fa',
				'#f59e0b',
				'#10b981',
				'#8b5cf6',
				'#e879f9'
			]
		}
	},

	// Model Download & Loading
	MODEL: {
		DOWNLOAD_RETRY_DELAY: 2000, // Initial retry delay (exponential backoff)
		MAX_RETRIES: 4 // Maximum number of download retries
	}
};

// Service Events - shared event types for services
export const SERVICE_EVENTS = {
	// Audio Service Events
	AUDIO: {
		RECORDING_STARTED: 'audio:recordingStarted',
		RECORDING_STOPPED: 'audio:recordingStopped',
		RECORDING_ERROR: 'audio:recordingError',
		STATE_CHANGED: 'audio:stateChanged',
		WAVEFORM_DATA: 'audio:waveformData'
	},

	// Transcription Service Events
	TRANSCRIPTION: {
		STARTED: 'transcription:started',
		PROGRESS: 'transcription:progress',
		COMPLETED: 'transcription:completed',
		ERROR: 'transcription:error',
		COPIED: 'transcription:copied',
		SHARED: 'transcription:shared'
	},

	// Model/Whisper Service Events
	MODEL: {
		DOWNLOAD_STARTED: 'model:downloadStarted',
		DOWNLOAD_PROGRESS: 'model:downloadProgress',
		DOWNLOAD_COMPLETED: 'model:downloadCompleted',
		DOWNLOAD_ERROR: 'model:downloadError',
		LOAD_STARTED: 'model:loadStarted',
		LOAD_COMPLETED: 'model:loadCompleted',
		LOAD_ERROR: 'model:loadError'
	},

	// Settings Events
	SETTINGS: {
		CHANGED: 'talktype-setting-changed', // Custom event dispatched when settings change
		PRIVACY_MODE_CHANGED: 'settings:privacyModeChanged',
		THEME_CHANGED: 'settings:themeChanged'
	},

	// UI Component Events
	UI: {
		BUTTON_CLICKED: 'ui:buttonClicked',
		TRANSCRIPT_EDITED: 'ui:transcriptEdited',
		COPY_REQUESTED: 'ui:copyRequested',
		SHARE_REQUESTED: 'ui:shareRequested'
	}
};

// CTA Button Phrases
export const CTA_PHRASES = [
	'Say hi', // Always first
	'Tell me',
	'Go on',
	'Spill it',
	'Say more',
	'Word time'
];

// Button State Labels
export const BUTTON_LABELS = {
	DOWNLOADING: 'Offline',
	PROCESSING: 'Processing',
	RECORDING: 'All done',
	DEFAULT: 'Say hi'
};

// Clipboard Success Messages
export const COPY_MESSAGES = ['Copied'];

// Offline Haikus
export const OFFLINE_HAIKUS = [
	`Signal drifts softly
Words wait in the quiet light
Try again, speak soon`,

	`Microphone resting
Words wait close to the shoreline
Signals drift back soon`,

	`Ghostly transcription
Voice notes wait patiently
Signals drift back soon`,

	`Voice rides gentle waves
Digital quiet settles
Connect and try again`,

	`Whispers unheard now
The ghost waits patiently
Until connection returns`
];

// Random haiku picker
export function getRandomHaiku() {
	return OFFLINE_HAIKUS[Math.floor(Math.random() * OFFLINE_HAIKUS.length)];
}

// Get a random element from any array
export function getRandomFromArray(array) {
	return array[Math.floor(Math.random() * array.length)];
}

// Vibration Patterns
export const VIBRATION = {
	SELECT: 18,
	START_RECORDING: [40, 60, 40],
	STOP_RECORDING: 50,
	COPY_SUCCESS: 25,
	ERROR: [20, 150, 20],
	PERMISSION_ERROR: [20, 100, 20, 100, 20]
};
