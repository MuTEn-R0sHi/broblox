/**
 * Timeout constants in seconds/milliseconds.
 * All timeouts should be defined here for consistency.
 */

// ============================================================================
// Client-Side Timeouts
// ============================================================================

/** How long to wait for remotes folder to appear (seconds) */
export const REMOTES_WAIT_TIMEOUT_SECONDS = 30;

/** Remote invocation timeout before giving up (milliseconds) */
export const REMOTE_INVOKE_TIMEOUT_MS = 10000;

/** Handshake retry delay on failure (milliseconds) */
export const HANDSHAKE_RETRY_DELAY_MS = 2000;

/** Maximum handshake retry attempts */
export const HANDSHAKE_MAX_RETRIES = 3;

// ============================================================================
// Server-Side Timeouts
// ============================================================================

/** Session expiry time when player disconnects (seconds) */
export const SESSION_EXPIRY_SECONDS = 300; // 5 minutes

/** Data save retry timeout (milliseconds) */
export const DATA_SAVE_TIMEOUT_MS = 5000;

/** How long BindToClose waits for saves (seconds) */
export const SHUTDOWN_TIMEOUT_SECONDS = 30;

// ============================================================================
// Cooldowns
// ============================================================================

/** Default action cooldown (milliseconds) */
export const DEFAULT_COOLDOWN_MS = 1000;

/** Minimum allowed cooldown (milliseconds) */
export const MIN_COOLDOWN_MS = 100;

/** Maximum allowed cooldown (milliseconds) */
export const MAX_COOLDOWN_MS = 60000;
