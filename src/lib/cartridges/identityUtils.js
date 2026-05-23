/**
 * Membership identity generation.
 * Deterministically turns a vault hash into a TalkType supporter identity.
 */

const FALLBACK_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const ADJECTIVES = [
	'Speedy',
	'Sleepy',
	'Radiant',
	'Cosmic',
	'Pixel',
	'Neon',
	'Velvet',
	'Lunar',
	'Disco',
	'Glitch',
	'Breezy',
	'Mossy',
	'Golden',
	'Dreamy',
	'Fizzy',
	'Lucky',
	'Plucky',
	'Sunny',
	'Wavy',
	'Zippy'
];

const ANIMALS = [
	'Goanna',
	'Panda',
	'Ghost',
	'Axolotl',
	'Capybara',
	'Corgi',
	'Koala',
	'Falcon',
	'Shark',
	'Otter',
	'Quokka',
	'Wombat',
	'Kookaburra',
	'Numbat',
	'Platypus',
	'Gecko',
	'Possum',
	'Rosella',
	'Bilby',
	'Wallaby'
];

const BG_COLORS = [
	'ffb3c6',
	'ffd1dc',
	'ffdfba',
	'ffd6a5',
	'fce4ec',
	'fff1a8',
	'fde68a',
	'ff9baa',
	'ffcad4',
	'ffddd2',
	'ffc8dd',
	'ffe5b4'
];

const SHAPE_COLORS = [
	'f4a261',
	'e9c46a',
	'ffb347',
	'ff9a8b',
	'ffa07a',
	'e8a0bf',
	'c9b1d0',
	'ffcc99'
];

function normalizeHash(vaultHash) {
	const hash = typeof vaultHash === 'string' ? vaultHash.trim() : '';
	return {
		hash: hash || FALLBACK_HASH,
		isFallback: !hash
	};
}

function hashToIndex(hash, array, offset = 0) {
	const segment = hash.slice(offset, offset + 8) || hash;
	const parsed = Number.parseInt(segment, 16);

	if (Number.isFinite(parsed)) {
		return parsed % array.length;
	}

	let total = 0;
	for (let index = 0; index < segment.length; index += 1) {
		total += segment.charCodeAt(index) * (index + 1);
	}
	return total % array.length;
}

export function generateMemberIdentity(vaultHash) {
	const { hash, isFallback } = normalizeHash(vaultHash);
	if (isFallback) {
		return {
			name: 'Passport Pending',
			memberId: 'TT-PENDING',
			initials: 'TT',
			bg: 'fff1f2',
			shape: 'f9a8d4',
			isFallback: true
		};
	}

	const adj = ADJECTIVES[hashToIndex(hash, ADJECTIVES, 0)];
	const animal = ANIMALS[hashToIndex(hash, ANIMALS, 8)];
	const bg = BG_COLORS[hashToIndex(hash, BG_COLORS, 16)];
	const shape = SHAPE_COLORS[hashToIndex(hash, SHAPE_COLORS, 24)];
	const memberId = `TT-${hash.slice(0, 4).toUpperCase()}-${hash.slice(4, 8).toUpperCase()}`;

	return {
		name: `${adj} ${animal}`,
		memberId,
		initials: `${adj[0]}${animal[0]}`,
		bg,
		shape,
		isFallback: false
	};
}
