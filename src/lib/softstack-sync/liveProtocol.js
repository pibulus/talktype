// ═══════════════════════════════════════════════════════════════════════════
// liveProtocol — shared constants and message types for softstack-sync
// ═══════════════════════════════════════════════════════════════════════════

export const LIVE_MESSAGE_TYPES = Object.freeze({
  INIT: "init",
  PRESENCE: "presence",
  STATE_UPDATE: "state_update",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  HEART: "heart", // Generic ping or 'like' interaction
  // Custom apps can still broadcast their own strings outside this freeze if needed
});

export const LIVE_CLOSE_CODES = Object.freeze({
  ROOM_NOT_FOUND: 4004,
  ROOM_EXPIRED: 4005,
  POLICY_VIOLATION: 1008,
});

export const LIVE_ROOM_TIERS = Object.freeze({
  FREE: "free",
  SUPPORTER: "supporter",
});

// Sync rooms are transient by default, expiring if not touched.
export const LIVE_ROOM_TTL_MS = Object.freeze({
  [LIVE_ROOM_TIERS.FREE]: 7 * 24 * 60 * 60 * 1000,
  [LIVE_ROOM_TIERS.SUPPORTER]: 365 * 24 * 60 * 60 * 1000,
});

function normalizeLiveRoomTier(value) {
  return value === LIVE_ROOM_TIERS.SUPPORTER
    ? LIVE_ROOM_TIERS.SUPPORTER
    : LIVE_ROOM_TIERS.FREE;
}

function getRoomTtlMs(tier) {
  return LIVE_ROOM_TTL_MS[normalizeLiveRoomTier(tier)];
}

function normalizeTimestamp(value, fallback = new Date().toISOString()) {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

export function createLiveRoomMetadata(input = {}) {
  const now = new Date().toISOString();
  const tier = normalizeLiveRoomTier(input.tier);
  const createdAt = normalizeTimestamp(input.createdAt, now);
  const lastActiveAt = normalizeTimestamp(input.lastActiveAt, now);
  const updatedAt = normalizeTimestamp(input.updatedAt, lastActiveAt);
  const fallbackExpiry = new Date(
    new Date(lastActiveAt).getTime() + getRoomTtlMs(tier),
  ).toISOString();
  const expiresAt = normalizeTimestamp(input.expiresAt, fallbackExpiry);

  return {
    createdAt,
    updatedAt,
    lastActiveAt,
    expiresAt,
    tier,
  };
}

export function touchLiveRoomMetadata(input = {}) {
  const now = new Date().toISOString();
  const tier = normalizeLiveRoomTier(input.tier);

  return createLiveRoomMetadata({
    ...input,
    tier,
    updatedAt: now,
    lastActiveAt: now,
    expiresAt: new Date(Date.now() + getRoomTtlMs(tier)).toISOString(),
  });
}

export function isLiveRoomExpired(metadata, now = Date.now()) {
  if (!metadata?.expiresAt) return false;

  const expiresAt = Date.parse(metadata.expiresAt);
  return !Number.isNaN(expiresAt) && expiresAt <= now;
}
