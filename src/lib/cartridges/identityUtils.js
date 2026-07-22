/**
 * Membership identity generation.
 * Deterministically turns a vault hash into a TalkType supporter identity.
 */

const FALLBACK_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const VERBS = [
	'drifts',
	'hums',
	'glows',
	'floats',
	'sings',
	'sparks',
	'roams',
	'blooms',
	'echoes',
	'whispers',
	'flickers',
	'wanders',
	'pulses',
	'shines',
	'orbits',
	'dances',
	'haunts',
	'buzzes',
	'ripples',
	'dreams'
];

const PLACES = [
	'at midnight',
	'in the static',
	'through the void',
	'at dawn',
	'in the mist',
	'between stars',
	'in the dark',
	'at the edge',
	'through waves',
	'beyond the map',
	'in deep space',
	'at low tide',
	'through fog',
	'in the signal',
	'under neon',
	'past the reef',
	'in the loop',
	'at the horizon',
	'through rain',
	'in the noise'
];

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
	'f7b89c',
	'f0c080',
	'f5c86b',
	'f4afa3',
	'f5b08e',
	'e6adc5',
	'd0bfd8',
	'f3caa7'
];

function normalizeHash(vaultHash) {
	const hash = typeof vaultHash === 'string' ? vaultHash.trim() : '';
	return {
		hash: hash || FALLBACK_HASH,
		isFallback: !hash
	};
}

function hashToIndex(hash, array, offset = 0) {
	// hash is always a hex SHA-256 string here (normalizeHash guards the empty case)
	const segment = hash.slice(offset, offset + 8) || hash;
	return Number.parseInt(segment, 16) % array.length;
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
	const verb = VERBS[hashToIndex(hash, VERBS, 32)];
	const place = PLACES[hashToIndex(hash, PLACES, 40)];
	const memberId = `TT-${hash.slice(0, 4).toUpperCase()}-${hash.slice(4, 8).toUpperCase()}`;

	return {
		name: `${adj} ${animal}`,
		phrase: `${adj.toLowerCase()} ${animal.toLowerCase()} ${verb} ${place}`,
		memberId,
		initials: `${adj[0]}${animal[0]}`,
		bg,
		shape,
		isFallback: false
	};
}
