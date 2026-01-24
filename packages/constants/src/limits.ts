/**
 * Numeric limits and bounds for validation.
 * These constants define acceptable ranges for various values.
 */

// ============================================================================
// Payload Size Limits
// ============================================================================

/** Maximum string length for action IDs */
export const ACTION_ID_MAX_LENGTH = 50;

/** Minimum string length for action IDs */
export const ACTION_ID_MIN_LENGTH = 1;

/** Maximum string length for build IDs */
export const BUILD_ID_MAX_LENGTH = 100;

/** Maximum payload size in bytes (rough estimate) */
export const MAX_PAYLOAD_SIZE_BYTES = 1024; // 1KB

// ============================================================================
// Timestamp Validation
// ============================================================================

/**
 * Maximum allowed timestamp drift from server time (milliseconds).
 * Requests with timestamps outside this window are rejected.
 */
export const TIMESTAMP_TOLERANCE_MS = 5000;

/**
 * Maximum age of a timestamp in the past (milliseconds).
 * Prevents replay attacks with old timestamps.
 */
export const TIMESTAMP_MAX_AGE_MS = 30000; // 30 seconds

// ============================================================================
// Vector Limits
// ============================================================================

/** Maximum Vector3 magnitude for position updates */
export const MAX_POSITION_MAGNITUDE = 10000;

/** Maximum Vector3 magnitude for velocity */
export const MAX_VELOCITY_MAGNITUDE = 1000;

/** Maximum Vector3 magnitude for look direction (normalized = 1) */
export const MAX_LOOK_DIRECTION_MAGNITUDE = 2;

// ============================================================================
// Rate Limits
// ============================================================================

/** Maximum concurrent connections per player */
export const MAX_CONCURRENT_REQUESTS = 10;

/** Maximum events per second per player (global) */
export const MAX_EVENTS_PER_SECOND = 30;

// ============================================================================
// Array/Collection Limits
// ============================================================================

/** Maximum items in a batch request */
export const MAX_BATCH_SIZE = 100;

/** Maximum inventory items per player */
export const MAX_INVENTORY_SIZE = 1000;

/** Maximum friends in a request */
export const MAX_FRIENDS_PER_REQUEST = 50;
