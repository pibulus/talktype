import { describe, expect, it } from 'vitest';
import { getInAppBrowserName, getUnsupportedBrowserMessage } from './inAppBrowser.js';

// Real user agent strings. Note that the Messenger and Instagram ones BOTH
// contain the Facebook FBAN/FBAV tokens — that overlap is the whole reason
// IN_APP_BROWSERS is ordered most-specific-first, and it is what these tests
// are really guarding.
const UA = {
	messenger:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) [FBAN/MessengerForiOS;FBAV/449.0.0.44.109;FB_IAB/MESSENGER;]',
	instagram:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Instagram 331.0.0.37.90 (iPhone14,3; iOS 17_5)',
	facebook:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) [FBAN/FBIOS;FBAV/468.0.0.47.108;FB_IAB/FB4A;]',
	safari:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
	chrome:
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
};

describe('getInAppBrowserName', () => {
	it('names Messenger rather than Facebook, despite the shared FBAN token', () => {
		expect(getInAppBrowserName(UA.messenger)).toBe('Messenger');
	});

	it('names Instagram rather than Facebook, despite the shared tokens', () => {
		expect(getInAppBrowserName(UA.instagram)).toBe('Instagram');
	});

	it('still names plain Facebook', () => {
		expect(getInAppBrowserName(UA.facebook)).toBe('Facebook');
	});

	it('returns null for real browsers', () => {
		expect(getInAppBrowserName(UA.safari)).toBeNull();
		expect(getInAppBrowserName(UA.chrome)).toBeNull();
		expect(getInAppBrowserName('')).toBeNull();
	});
});

describe('getUnsupportedBrowserMessage', () => {
	it('names the offending app so "open in browser" is actionable', () => {
		const message = getUnsupportedBrowserMessage(UA.messenger);
		expect(message).toContain('Messenger');
		expect(message).toContain('Open in browser');
	});

	it('falls back to generic-but-still-actionable copy when unrecognised', () => {
		const message = getUnsupportedBrowserMessage(UA.safari);
		expect(message).toContain('Safari or Chrome');
	});

	it('never tells the user to just try again — that can never work here', () => {
		for (const ua of Object.values(UA)) {
			expect(getUnsupportedBrowserMessage(ua).toLowerCase()).not.toContain('try again');
			expect(getUnsupportedBrowserMessage(ua).toLowerCase()).not.toContain('one more try');
		}
	});
});
