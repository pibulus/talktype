// ===================================================================
// Mic permission memory helpers
// ===================================================================
// iOS WebKit forgets mic grants between launches of an installed PWA —
// there is no persistent-grant path in a standalone web app, so the
// re-prompt cannot be prevented. What we CAN do is know it's coming
// (user granted before + permission back to 'prompt') and let the ghost
// set expectations instead of the prompt feeling like a bug.

import { browser } from '$app/environment';

const GRANTED_BEFORE_KEY = 'talktype-mic-granted-before';

function isIOS() {
	return (
		browser &&
		(/iPhone|iPad|iPod/.test(navigator.userAgent) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
	);
}

function isStandalonePWA() {
	return (
		browser &&
		(navigator.standalone === true ||
			window.matchMedia?.('(display-mode: standalone)').matches === true)
	);
}

/** Call after a successful getUserMedia grant. */
export function markMicGranted() {
	if (!browser) return;
	try {
		localStorage.setItem(GRANTED_BEFORE_KEY, '1');
	} catch {
		// No persistence in private mode — the warn just won't fire. Fine.
	}
}

/**
 * True when this launch will re-prompt a user who already granted the mic
 * on a previous visit — iOS standalone PWA only, where WebKit forgets.
 * Query failures (older Safari lacks 'microphone' in the Permissions API)
 * resolve to false: never warn on a guess.
 */
export async function shouldWarnMicReprompt() {
	if (!browser || !isIOS() || !isStandalonePWA()) return false;

	let grantedBefore = false;
	try {
		grantedBefore = localStorage.getItem(GRANTED_BEFORE_KEY) === '1';
	} catch {
		return false;
	}
	if (!grantedBefore) return false;

	try {
		const status = await navigator.permissions.query({ name: 'microphone' });
		return status.state === 'prompt';
	} catch {
		return false;
	}
}
