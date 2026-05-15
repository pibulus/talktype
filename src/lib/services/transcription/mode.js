import { get } from 'svelte/store';
import { liveMode, privacyMode } from '$lib';

function isEnabled(value) {
	return value === true || value === 'true';
}

export function resolveTranscriptionMode({ liveModeValue, privacyModeValue }) {
	const privacyModeEnabled = isEnabled(privacyModeValue);
	const liveModeEnabled = isEnabled(liveModeValue) && !privacyModeEnabled;

	return {
		liveModeEnabled,
		privacyModeEnabled,
		useLiveDeepgram: liveModeEnabled,
		useOfflineWhisper: privacyModeEnabled,
		useBatchCloud: !privacyModeEnabled
	};
}

export function getTranscriptionMode() {
	return resolveTranscriptionMode({
		liveModeValue: get(liveMode),
		privacyModeValue: get(privacyMode)
	});
}
