/**
 * charmMemory.js — the show-once brain shared by every charm.
 *
 * Attention charms that never quit are nagging, not charming. Each charm
 * remembers, per id, whether the user has already interacted with it and
 * quiets down forever after. Backed by localStorage; SSR-safe; a blocked/
 * private-mode localStorage degrades to "seen nothing this session" instead
 * of throwing (the charm still works, it just re-wiggles next reload).
 *
 * Zero dependencies. Copy this file verbatim alongside any charm.
 */

const PREFIX = 'softstack-charm:';

const hasWindow = typeof window !== 'undefined';

function store() {
	if (!hasWindow) return null;
	try {
		return window.localStorage;
	} catch {
		// Safari private mode / disabled storage throws on access.
		return null;
	}
}

/**
 * Has this charm already been dismissed/used?
 * @param {string} id  stable key, e.g. "copy-ghost" or "hint:first-record"
 * @returns {boolean}
 */
export function charmSeen(id) {
	const s = store();
	if (!s) return false;
	try {
		return s.getItem(PREFIX + id) === '1';
	} catch {
		return false;
	}
}

/**
 * Mark a charm as seen — it goes quiet forever (until the key is cleared).
 * @param {string} id
 */
export function markCharmSeen(id) {
	const s = store();
	if (!s) return;
	try {
		s.setItem(PREFIX + id, '1');
	} catch {
		/* out of quota / blocked — no-op, charm just re-shows later */
	}
}

/**
 * Wipe a charm's memory so it shows again. Handy for demos / settings resets.
 * @param {string} id
 */
export function resetCharm(id) {
	const s = store();
	if (!s) return;
	try {
		s.removeItem(PREFIX + id);
	} catch {
		/* no-op */
	}
}

/** True when the user asked the OS to cut motion. Static fallbacks kick in. */
export function prefersReducedMotion() {
	if (!hasWindow || !window.matchMedia) return false;
	try {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	} catch {
		return false;
	}
}
