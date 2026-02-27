/**
 * Anticheat and security constants.
 *
 * Centralises magic numbers that were previously scattered across
 * @broblox/security so they can be overridden or referenced from one place.
 */

/** Maximum player movement speed in studs/second before flagging. */
export const ANTICHEAT_MAX_SPEED_STUDS_PER_SEC = 100;

/** Minimum interval between speed checks (seconds). */
export const ANTICHEAT_SPEED_CHECK_INTERVAL_SEC = 0.5;

/** Maximum position delta in a single frame before flagging as teleport (studs). */
export const ANTICHEAT_MAX_TELEPORT_DISTANCE_STUDS = 200;

/** How long to cache a player's trust score before recalculating (seconds). */
export const TRUST_SCORE_CACHE_TTL_SEC = 60;

/** Default temporary ban duration when enforcer issues a temp-ban (hours). */
export const DEFAULT_TEMP_BAN_DURATION_HOURS = 24;
