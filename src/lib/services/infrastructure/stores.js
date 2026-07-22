import { writable, derived, get } from 'svelte/store';
import { AudioStates } from '../audio/audioStates';
import { ANIMATION, LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '$lib/constants';
import { browser } from '$app/environment';
import { PRICING } from '$lib/config/pricing.js';
import {
	readStorageValue,
	removeStorageValue,
	writeStorageValue
} from '$lib/services/storage/localStorageMigration.js';

const forceSupporterMode = import.meta.env.PUBLIC_FORCE_SUPPORTER_MODE === 'true';
const SUPPORTER_TERM_MS = (PRICING.termDays || 365) * 24 * 60 * 60 * 1000;

// Supporter is valid if there's a token AND it hasn't expired. The expiry stamp is
// soft (client-side localStorage) — honest "lasts a year" framing for a $9 app, not
// DRM. A missing expiry stamp is treated as still-valid (legacy unlocks pre-expiry).
function supporterExpiryOk() {
	const raw = readStorageValue(STORAGE_KEYS.SUPPORTER_EXPIRES);
	if (!raw) return true; // legacy/no-stamp → don't lock out existing supporters
	const expires = Number(raw);
	return !Number.isFinite(expires) || Date.now() < expires;
}

function hasStoredSupporterToken() {
	const hasToken = Boolean(
		readStorageValue(STORAGE_KEYS.SUPPORTER_TOKEN, {
			legacyKeys: LEGACY_STORAGE_KEYS.SUPPORTER_TOKEN
		})
	);
	return hasToken && supporterExpiryOk();
}

// Core audio state store
export const audioState = writable({
	state: AudioStates.IDLE,
	error: null,
	previousState: null,
	timestamp: Date.now(),
	mimeType: null,
	waveformData: [],
	timeLimit: false
});

// Recording state
export const recordingState = writable({
	isRecording: false,
	duration: 0,
	audioBlob: null,
	audioURL: null
});

// Transcription state
export const transcriptionState = writable({
	inProgress: false,
	progress: 0,
	text: '',
	error: null,
	timestamp: null,
	pendingRecording: null
});

// UI state
export const uiState = writable({
	clipboardSuccess: false,
	copyNeedsGesture: false,
	errorMessage: '',
	showPermissionError: false,
	transcriptionCopied: false,
	screenReaderMessage: ''
});

// User options - initialize promptStyle from localStorage
function createUserPreferences() {
	const initialPromptStyle = browser
		? readStorageValue(STORAGE_KEYS.PROMPT_STYLE, {
				legacyKeys: LEGACY_STORAGE_KEYS.PROMPT_STYLE,
				defaultValue: 'standard'
			})
		: 'standard';
	const initialSupporterStatus = browser
		? forceSupporterMode || hasStoredSupporterToken()
		: forceSupporterMode;
	// Sticky: if a WebGPU model load failed before, stay on tiny+WASM across reloads.
	const initialWebgpuDisabled = browser
		? readStorageValue(STORAGE_KEYS.WEBGPU_DISABLED, { defaultValue: '' }) === 'true'
		: false;

	return writable({
		isSupporter: initialSupporterStatus,
		promptStyle: initialPromptStyle,
		webgpuDisabled: initialWebgpuDisabled
	});
}

export const userPreferences = createUserPreferences();

// Persistently mark this device as WebGPU-incapable for offline models (called
// from the WebGPU→WASM fallback in whisperService). Survives reloads so we don't
// re-attempt the expensive distil-small download every session.
export function markWebgpuDisabled() {
	userPreferences.update((current) => ({ ...current, webgpuDisabled: true }));
	if (browser) {
		writeStorageValue(STORAGE_KEYS.WEBGPU_DISABLED, 'true');
	}
}

export function setSupporterStatus(isSupporter, token = null) {
	const resolvedSupporterStatus = forceSupporterMode
		? true
		: Boolean(isSupporter && (token || hasStoredSupporterToken()));

	userPreferences.update((current) => ({
		...current,
		isSupporter: resolvedSupporterStatus
	}));

	if (browser) {
		writeStorageValue(STORAGE_KEYS.SUPPORTER, resolvedSupporterStatus ? 'true' : 'false', {
			legacyKeys: LEGACY_STORAGE_KEYS.SUPPORTER
		});
		if (token) {
			writeStorageValue(STORAGE_KEYS.SUPPORTER_TOKEN, token, {
				legacyKeys: LEGACY_STORAGE_KEYS.SUPPORTER_TOKEN
			});
			// Stamp a 1-year expiry from now (the supporter pass lasts a year).
			writeStorageValue(STORAGE_KEYS.SUPPORTER_EXPIRES, String(Date.now() + SUPPORTER_TERM_MS));
		} else if (!resolvedSupporterStatus) {
			removeStorageValue(STORAGE_KEYS.SUPPORTER_TOKEN, {
				legacyKeys: LEGACY_STORAGE_KEYS.SUPPORTER_TOKEN
			});
			removeStorageValue(STORAGE_KEYS.SUPPORTER_EXPIRES);
		}
	}
}

// Derived stores for easier consumption
export const isRecording = derived(
	audioState,
	($audioState) => $audioState.state === AudioStates.RECORDING
);

export const isTranscribing = derived(transcriptionState, ($state) => $state.inProgress);

export const transcriptionProgress = derived(transcriptionState, ($state) => $state.progress);

export const transcriptionText = derived(transcriptionState, ($state) => $state.text);

export const hasPermissionError = derived(
	audioState,
	($state) => $state.state === AudioStates.PERMISSION_DENIED
);

export const recordingDuration = derived(recordingState, ($state) => $state.duration);

export const errorMessage = derived(uiState, ($state) => $state.errorMessage);

// null is a meaningful value here: the analyser is blind (suspended
// AudioContext) but recording is live. Only coerce undefined to [].
export const waveformData = derived(audioState, ($state) =>
	$state.waveformData === null ? null : $state.waveformData || []
);

// Action functions to update the stores
export const audioActions = {
	updateState(state, error = null) {
		audioState.update((current) => ({
			...current,
			previousState: current.state,
			state,
			error,
			timestamp: Date.now(),
			timeLimit: false
		}));

		// Update recording state when audio state changes
		if (state === AudioStates.RECORDING) {
			recordingState.update((current) => ({ ...current, isRecording: true }));
			this.startRecordingTimer();
		} else if (state !== AudioStates.RECORDING) {
			recordingState.update((current) => ({ ...current, isRecording: false }));
			this.stopRecordingTimer();
		}
	},

	setWaveformData(dataArray) {
		audioState.update((current) => ({
			...current,
			waveformData: dataArray
		}));
	},

	setAudioBlob(blob, mimeType) {
		recordingState.update((current) => ({
			...current,
			audioBlob: blob
		}));

		if (mimeType) {
			audioState.update((current) => ({
				...current,
				mimeType
			}));
		}
	},

	// Timer management for recording duration
	recordingTimer: null,
	startTime: null,

	startRecordingTimer() {
		this.stopRecordingTimer();
		this.startTime = Date.now();
		recordingState.update((current) => ({ ...current, duration: 0 }));

		this.recordingTimer = setInterval(() => {
			const elapsed = Date.now() - this.startTime;
			// Use float for more precise duration - will appear smoother in UI
			const duration = elapsed / 1000;

			recordingState.update((current) => ({
				...current,
				duration
			}));

			// Check if we've reached the time limit (still use integer for the limit check)
			const isSupporter = get(userPreferences).isSupporter;
			const timeLimit = isSupporter
				? ANIMATION.RECORDING.SUPPORTER_LIMIT
				: ANIMATION.RECORDING.FREE_LIMIT;

			if (Math.floor(duration) >= timeLimit) {
				// Signal that recording should stop due to time limit
				this.recordingTimeLimitReached();
			}
		}, 50); // Update 20 times per second for ultra-smooth animation
	},

	stopRecordingTimer() {
		if (this.recordingTimer) {
			clearInterval(this.recordingTimer);
			this.recordingTimer = null;
		}
	},

	// Immediate cap re-check for when the tab returns to the foreground —
	// background throttling can delay the interval-based check by seconds.
	checkRecordingTimeLimit() {
		if (!this.recordingTimer || !this.startTime) return;

		const duration = (Date.now() - this.startTime) / 1000;
		const isSupporter = get(userPreferences).isSupporter;
		const timeLimit = isSupporter
			? ANIMATION.RECORDING.SUPPORTER_LIMIT
			: ANIMATION.RECORDING.FREE_LIMIT;

		if (Math.floor(duration) >= timeLimit) {
			this.recordingTimeLimitReached();
		}
	},

	recordingTimeLimitReached() {
		// This function can be subscribed to for stopping recording
		audioState.update((current) => {
			if (current.timeLimit) return current;
			return {
				...current,
				timeLimit: true
			};
		});

		// For reliable auto-stop, subscribers react to the timeLimit flag.
	}
};

export const transcriptionActions = {
	startTranscribing() {
		transcriptionState.update((current) => ({
			...current,
			inProgress: true,
			progress: 0,
			error: null,
			timestamp: Date.now()
		}));
	},

	updateProgress(progress) {
		transcriptionState.update((current) => ({
			...current,
			progress: Math.min(progress, 100)
		}));
	},

	cancelTranscribing() {
		transcriptionState.update((current) => ({
			...current,
			inProgress: false,
			progress: 0,
			timestamp: Date.now()
		}));
	},

	updateText(text) {
		transcriptionState.update((current) => ({
			...current,
			text
		}));
	},

	completeTranscription(text) {
		transcriptionState.update((current) => ({
			...current,
			inProgress: false,
			progress: 100,
			text,
			error: null,
			timestamp: Date.now()
		}));

		// Reset progress after a short delay
		setTimeout(() => {
			transcriptionState.update((current) => ({
				...current,
				progress: 0
			}));
		}, 500);
	},

	setTranscriptionError(error) {
		transcriptionState.update((current) => ({
			...current,
			inProgress: false,
			progress: 0,
			error
		}));

		uiState.update((current) => ({
			...current,
			errorMessage: error || 'That one got tangled. Try again?'
		}));
	},

	setPendingRecording(pending) {
		transcriptionState.update((current) => ({
			...current,
			pendingRecording: pending
		}));
	},

	clearPendingRecording() {
		transcriptionState.update((current) => ({
			...current,
			pendingRecording: null
		}));
	}
};

export const uiActions = {
	setErrorMessage(message) {
		uiState.update((current) => ({
			...current,
			errorMessage: message
		}));
	},

	clearErrorMessage() {
		uiState.update((current) => ({
			...current,
			errorMessage: ''
		}));
	},

	setPermissionError(show) {
		uiState.update((current) => ({
			...current,
			showPermissionError: show
		}));
	},

	setClipboardSuccess(success) {
		uiState.update((current) => ({
			...current,
			clipboardSuccess: success,
			copyNeedsGesture: success ? false : current.copyNeedsGesture
		}));
	},

	setCopyNeedsGesture(needsGesture) {
		uiState.update((current) => ({
			...current,
			copyNeedsGesture: needsGesture
		}));
	},

	showClipboardSuccess(duration = ANIMATION.COPY.SUCCESS_TIMER) {
		uiState.update((current) => ({
			...current,
			clipboardSuccess: true,
			copyNeedsGesture: false,
			transcriptionCopied: true
		}));

		setTimeout(() => {
			uiState.update((current) => ({
				...current,
				clipboardSuccess: false
			}));
		}, duration);
	},

	setScreenReaderMessage(message) {
		uiState.update((current) => ({
			...current,
			screenReaderMessage: message
		}));
	}
};

// Reset function for when component unmounts
export function resetStores() {
	audioState.set({
		state: AudioStates.IDLE,
		error: null,
		previousState: null,
		timestamp: Date.now(),
		mimeType: null,
		waveformData: [],
		timeLimit: false
	});

	recordingState.set({
		isRecording: false,
		duration: 0,
		audioBlob: null,
		audioURL: null
	});

	transcriptionState.set({
		inProgress: false,
		progress: 0,
		text: '',
		error: null,
		timestamp: null,
		pendingRecording: null
	});

	uiState.set({
		clipboardSuccess: false,
		copyNeedsGesture: false,
		errorMessage: '',
		showPermissionError: false,
		transcriptionCopied: false,
		screenReaderMessage: ''
	});

	audioActions.stopRecordingTimer();
}

// New event store for transcription completion
export const transcriptionCompletedEvent = (() => {
	const { subscribe, set } = writable(null); // Event store, emits text on completion then null
	let _previousInProgress = get(transcriptionState).inProgress; // Initialize with current state

	transcriptionState.subscribe((currentState) => {
		if (
			_previousInProgress === true &&
			currentState.inProgress === false &&
			currentState.text &&
			currentState.text.trim() !== ''
		) {
			set(currentState.text); // Emit the text value
			// Reset to null in a microtask to ensure current subscribers process the text value first
			// and to make it a true "event" store for the next completion.
			Promise.resolve().then(() => set(null));
		}
		_previousInProgress = currentState.inProgress;
	});

	return { subscribe };
})();
