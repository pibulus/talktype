// ═══════════════════════════════════════════════════════════════════════════
// 🔑 syncPhrase — carry state to another device by typing four words
// ═══════════════════════════════════════════════════════════════════════════
// No accounts, no auth, no login. You read four words off one screen and type
// them into another, and the state follows. The phrase deterministically
// derives a live-room id, so both devices land in the same PartyKit room.

const ADJECTIVES = [
  "neon", "funky", "silent", "sneaky", "cosmic", "retro", "atomic", "chunky",
  "dapper", "spry", "loopy", "vibrant", "fuzzy", "gloomy", "slick", "brave",
  "wild", "gentle", "sleepy", "peppy", "glossy", "rowdy", "humble", "zesty",
  "mellow", "crispy", "plucky", "swanky", "jolly", "nimble", "quiet", "sunny",
  "bouncy", "velvet", "copper", "wobbly", "breezy", "toasty", "salty", "lucky"
];

const NOUNS = [
  "turtle", "lantern", "pickle", "comet", "walrus", "muffin", "cactus", "otter",
  "kettle", "puffin", "noodle", "badger", "pebble", "raccoon", "mango", "wombat",
  "satchel", "gecko", "pancake", "ferret", "thistle", "marble", "donkey", "waffle",
  "hedgehog", "biscuit", "lobster", "acorn", "penguin", "teapot", "magpie",
  "pumpkin", "anchor", "sparrow", "domino", "weasel", "kazoo", "parsnip", "yak",
  "bagel"
];

const VERBS = [
  "drifts", "hums", "naps", "wanders", "juggles", "tumbles", "skips", "hoards",
  "whistles", "shuffles", "ponders", "orbits", "gallops", "dozes", "giggles",
  "sneezes", "waltzes", "blooms", "rattles", "paddles", "wiggles", "salutes",
  "yodels", "sulks", "bounces", "grumbles", "twirls", "snoozes", "hoots",
  "scuttles", "flops", "sighs"
];

const PLACES = [
  "uptown", "sideways", "downstairs", "offshore", "backwards", "nearby",
  "overboard", "homeward", "onstage", "outback", "seaside", "midair",
  "underfoot", "roadside", "skyward", "indoors", "poolside", "upstream",
  "yonder", "aloft", "ashore", "afield", "abroad", "inland", "lakeside",
  "treetop", "rooftop", "streetwise", "campside", "harbourside", "trackside",
  "hillside"
];

const DEFAULT_BANKS = [ADJECTIVES, NOUNS, VERBS, PLACES];

export const SYNC_PHRASE_COMBINATIONS = DEFAULT_BANKS.reduce((t, b) => t * b.length, 1);

function pick(bank) {
  const max = Math.floor(0xffffffff / bank.length) * bank.length;
  const buf = new Uint32Array(1);
  let value;
  do {
    globalThis.crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= max);
  return bank[value % bank.length];
}

export function generateSyncPhrase(banks = DEFAULT_BANKS) {
  return banks.map(pick).join("-");
}

export function normalizeSyncPhrase(value) {
  return (value ?? "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join("-");
}

export function isValidSyncPhrase(value, numWords = 4) {
  const words = normalizeSyncPhrase(value).split("-").filter(Boolean);
  return words.length === numWords;
}

/**
 * Deterministic phrase -> room id. Same words on any device, same room.
 * Allows apps to pass a prefix so they don't collide (e.g. tt_p for TalkType).
 */
export async function deriveRoomIdFromPhrase(value, prefix = "sync_") {
  const normalized = normalizeSyncPhrase(value);
  if (!isValidSyncPhrase(normalized)) return "";

  const bytes = new TextEncoder().encode(`softstack:sync:v1:${prefix}:${normalized}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${prefix}${hex.slice(0, 32)}`;
}
