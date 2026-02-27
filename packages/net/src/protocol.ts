/**
 * Protocol versioning utilities.
 *
 * Manages client-server protocol compatibility following ADR-0002.
 * Supports N and N-1 versions for safe rollouts.
 */

import { PROTOCOL_VERSION, MIN_PROTOCOL_VERSION } from "@broblox/shared-types";

// ============================================================================
// Types
// ============================================================================

export interface ProtocolValidationResult {
  /** Whether the client version is compatible */
  compatible: boolean;
  /** Current server protocol version */
  serverVersion: number;
  /** Minimum supported client version */
  minVersion: number;
  /** Maximum supported client version (same as serverVersion) */
  maxVersion: number;
  /** Human-readable reason if incompatible */
  reason?: string;
}

export interface ProtocolConfig {
  /** Current protocol version (defaults to PROTOCOL_VERSION) */
  currentVersion?: number;
  /** Minimum supported version (defaults to MIN_PROTOCOL_VERSION) */
  minVersion?: number;
  /** Whether to allow N-1 compatibility (defaults to true) */
  allowLegacy?: boolean;
}

// ============================================================================
// Helpers (Roblox-compatible)
// ============================================================================

/**
 * Check if a value is an integer (Roblox-compatible).
 */
function isInteger(value: number): boolean {
  return value === math.floor(value);
}

/**
 * Get the maximum of two numbers (Roblox-compatible).
 */
function max(a: number, b: number): number {
  return math.max(a, b);
}

// ============================================================================
// Protocol Validation
// ============================================================================

/**
 * Validate a client's protocol version against server requirements.
 *
 * Follows N-1 compatibility rule from ADR-0002:
 * - Current version (N) is always supported
 * - Previous version (N-1) is supported if allowLegacy is true
 * - Older versions are rejected with clear error
 *
 * @param clientVersion - The protocol version reported by the client
 * @param config - Optional configuration overrides
 * @returns Validation result with compatibility status and version info
 */
export function validateProtocolVersion(
  clientVersion: number,
  config?: ProtocolConfig
): ProtocolValidationResult {
  const currentVersion = config?.currentVersion ?? PROTOCOL_VERSION;
  const minVersion = config?.minVersion ?? MIN_PROTOCOL_VERSION;
  const allowLegacy = config?.allowLegacy ?? true;

  // Calculate effective minimum based on N-1 rule
  const effectiveMin = allowLegacy ? max(minVersion, currentVersion - 1) : currentVersion;

  const result: ProtocolValidationResult = {
    compatible: false,
    serverVersion: currentVersion,
    minVersion: effectiveMin,
    maxVersion: currentVersion,
  };

  // Check if version is a valid number
  if (
    typeOf(clientVersion) !== "number" ||
    clientVersion !== clientVersion || // NaN check
    clientVersion === math.huge ||
    clientVersion === -math.huge ||
    !isInteger(clientVersion) ||
    clientVersion < 0
  ) {
    result.reason = "Invalid protocol version format";
    return result;
  }

  // Client version is too old
  if (clientVersion < effectiveMin) {
    result.reason = `Client version ${clientVersion} is too old. Minimum required: ${effectiveMin}`;
    return result;
  }

  // Client version is too new (server needs update)
  if (clientVersion > currentVersion) {
    result.reason = `Client version ${clientVersion} is newer than server (${currentVersion}). Server update may be pending.`;
    return result;
  }

  // Compatible!
  result.compatible = true;
  return result;
}

/**
 * Check if a client version is exactly the current version.
 * Use this for strict matching (e.g., ranked matchmaking).
 */
export function isExactVersion(clientVersion: number): boolean {
  return clientVersion === PROTOCOL_VERSION;
}

/**
 * Check if a client version is the previous version (N-1).
 * Useful for metrics and deprecation tracking.
 */
export function isLegacyVersion(clientVersion: number): boolean {
  return clientVersion === PROTOCOL_VERSION - 1 && clientVersion >= MIN_PROTOCOL_VERSION;
}

/**
 * Get the current protocol version.
 */
export function getCurrentProtocolVersion(): number {
  return PROTOCOL_VERSION;
}

/**
 * Get the minimum supported protocol version.
 */
export function getMinProtocolVersion(): number {
  return MIN_PROTOCOL_VERSION;
}
