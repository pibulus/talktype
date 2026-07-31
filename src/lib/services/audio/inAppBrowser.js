/**
 * In-app browser detection.
 *
 * Written 2026-07-31 after real user feedback: someone opened a TalkType link
 * straight from Messenger, pressed the record button, and nothing happened.
 * They assumed the button was broken and went looking for instructions. It
 * wasn't broken — Messenger's embedded webview does not grant getUserMedia, so
 * audioService threw `Error('MediaDevices API not available')`, which has no
 * .name and so fell through getMicErrorMessage's switch to the generic
 * "Recording needs one more try." That is advice which can never work.
 *
 * UA sniffing is normally a smell, but here it is the only signal available:
 * the embedded browser reports no mic and there is no API that says "you are
 * inside an app". We use it ONLY to make an error message more specific, never
 * to gate functionality — if detection misses, the user still gets the generic
 * unsupported-browser copy, which is already actionable.
 */

// Ordered most-specific first: Messenger and Instagram UAs also contain the
// Facebook FBAN/FBAV tokens, so a naive FBAN check would call everything
// "Facebook" and send people hunting through the wrong app's menu.
const IN_APP_BROWSERS = [
	{ pattern: /FB_IAB\/MESSENGER|Messenger/i, name: 'Messenger' },
	{ pattern: /Instagram/i, name: 'Instagram' },
	{ pattern: /FBAN|FBAV|FB_IAB/i, name: 'Facebook' },
	{ pattern: /TikTok|musical_ly|BytedanceWebview/i, name: 'TikTok' },
	{ pattern: /LinkedInApp/i, name: 'LinkedIn' },
	{ pattern: /Snapchat/i, name: 'Snapchat' },
	{ pattern: /\bLine\//i, name: 'LINE' },
	{ pattern: /Twitter|TwitterAndroid/i, name: 'X' },
	{ pattern: /Pinterest/i, name: 'Pinterest' },
	{ pattern: /Reddit/i, name: 'Reddit' }
];

/**
 * Name the in-app browser we appear to be running inside, if any.
 * @param {string} [userAgent] - override, for tests
 * @returns {string|null} e.g. "Messenger", or null when not detected
 */
export function getInAppBrowserName(userAgent) {
	const ua =
		userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent || '');
	if (!ua) return null;

	for (const { pattern, name } of IN_APP_BROWSERS) {
		if (pattern.test(ua)) return name;
	}
	return null;
}

/**
 * True when this environment cannot record, whatever the reason.
 * Checked before the UA list because it is the only *authoritative* signal —
 * an in-app browser we've never heard of still fails this test.
 * @returns {boolean}
 */
export function isRecordingUnsupported() {
	if (typeof navigator === 'undefined') return false;
	return !navigator.mediaDevices?.getUserMedia;
}

/**
 * Actionable copy for an environment that cannot reach the microphone.
 * Names the offending app when we can, because "open in your browser" is much
 * easier to act on when you know which app you are escaping.
 * @param {string} [userAgent] - override, for tests
 * @returns {string}
 */
export function getUnsupportedBrowserMessage(userAgent) {
	const app = getInAppBrowserName(userAgent);
	return app
		? `${app}'s built-in browser blocks the mic. Tap the ••• menu and choose "Open in browser".`
		: 'This browser blocks mic access. Open the page in Safari or Chrome to record.';
}
