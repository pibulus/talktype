/**
 * Passport avatar — deterministic cute avatar from the vault hash.
 *
 * Uses DiceBear (offline SVG, no network → no CSP concerns). Each supporter
 * gets a unique face seeded from their hash, themed to their palette's avatar
 * style. Renders to a data-URI so it drops straight into an <img src>.
 */

import { createAvatar } from '@dicebear/core';
import { funEmoji, thumbs, adventurer, bottts } from '@dicebear/collection';

const COLLECTIONS = { funEmoji, thumbs, adventurer, bottts };

/**
 * Build a DiceBear avatar data-URI.
 * @param {string} seed - stable seed (vault hash or member id)
 * @param {string} style - collection key from the palette (funEmoji|thumbs|adventurer|bottts)
 * @returns {string} data:image/svg+xml URI, or '' if generation fails
 */
export function buildPassportAvatar(seed, style = 'funEmoji') {
	const collection = COLLECTIONS[style] || funEmoji;
	try {
		return createAvatar(collection, {
			seed: seed || 'talktype',
			radius: 50,
			scale: 92,
			backgroundType: ['solid'],
			backgroundColor: ['transparent']
		}).toDataUri();
	} catch (error) {
		console.warn('Passport avatar generation failed:', error);
		return '';
	}
}
