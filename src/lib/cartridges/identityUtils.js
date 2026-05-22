/**
 * Membership identity generation.
 * Deterministically turns a vault hash into a unique 'Club Member' identity.
 */

const ADJECTIVES = ['Speedy', 'Sleepy', 'Radiant', 'Cosmic', 'Pixel', 'Neon', 'Velvet', 'Lunar', 'Disco', 'Glitch'];
const ANIMALS = ['Goanna', 'Panda', 'Ghost', 'Axolotl', 'Capybara', 'Corgi', 'Koala', 'Falcon', 'Shark', 'Otter'];

const BG_COLORS = [
    'ffb3c6', 'ffd1dc', 'ffdfba', 'ffd6a5', 'fce4ec',
    'fff1a8', 'fde68a', 'ff9baa', 'ffcad4', 'ffddd2', 'ffc8dd', 'ffe5b4',
];
const SHAPE_COLORS = [
    'f4a261', 'e9c46a', 'ffb347', 'ff9a8b', 'ffa07a', 'e8a0bf', 'c9b1d0', 'ffcc99',
];

function hashToIndex(hash, array) {
    // Simple hash reduction to an index
    let total = 0;
    for (let i = 0; i < hash.length; i++) total += hash.charCodeAt(i);
    return total % array.length;
}

export function generateMemberIdentity(vaultHash) {
    const adj = ADJECTIVES[hashToIndex(vaultHash, ADJECTIVES)];
    const animal = ANIMALS[hashToIndex(vaultHash.slice(1), ANIMALS)];
    
    const bg = BG_COLORS[hashToIndex(vaultHash, BG_COLORS)];
    const shape = SHAPE_COLORS[hashToIndex(vaultHash.slice(2), SHAPE_COLORS)];
    
    const avatarUrl = `https://api.dicebear.com/9.x/thumbs/png?seed=${vaultHash}&backgroundColor=${bg}&shapeColor=${shape}&backgroundType=gradientLinear&size=256`;
    
    return {
        name: `${adj} ${animal}`,
        memberId: `TT-${vaultHash.slice(0, 6).toUpperCase()}`,
        avatarUrl
    };
}
