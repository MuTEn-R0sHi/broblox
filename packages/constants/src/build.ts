/**
 * Build and version information.
 * These should be updated by CI/CD or build scripts.
 */

// ============================================================================
// Version Information
// ============================================================================

/**
 * Current build ID.
 * Format: <game>-<semver>[-<commit>]
 * Examples: "test-park-1.0.0", "test-park-1.0.0-abc123"
 */
export const BUILD_ID = "test-park-0.0.0";

/**
 * Build timestamp (Unix seconds).
 * Set during build process, defaults to 0 for development.
 */
export const BUILD_TIMESTAMP = 0;

/**
 * Git commit hash (short).
 * Set during build process, empty in development.
 */
export const BUILD_COMMIT = "";

/**
 * Build environment.
 */
export type BuildEnvironment = "development" | "staging" | "production";

/**
 * Current build environment.
 * Determined by build configuration.
 */
export const BUILD_ENVIRONMENT: BuildEnvironment = "development";

// ============================================================================
// Environment Checks
// ============================================================================

/**
 * Check if running in development mode.
 */
export function isDevelopment(): boolean {
  return BUILD_ENVIRONMENT === "development";
}

/**
 * Check if running in staging mode.
 */
export function isStaging(): boolean {
  return BUILD_ENVIRONMENT === "staging";
}

/**
 * Check if running in production mode.
 */
export function isProduction(): boolean {
  return BUILD_ENVIRONMENT === "production";
}

// ============================================================================
// Feature Detection
// ============================================================================

/**
 * Whether debug features are enabled.
 * Only enabled in development/staging.
 */
export function isDebugEnabled(): boolean {
  return BUILD_ENVIRONMENT !== "production";
}

/**
 * Whether verbose logging is enabled.
 */
export function isVerboseLoggingEnabled(): boolean {
  return BUILD_ENVIRONMENT === "development";
}
