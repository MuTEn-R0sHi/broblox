/**
 * @rbx/constants
 * Centralized configuration constants for the platform.
 * This package has NO dependencies and must remain pure.
 * Compatible with roblox-ts.
 *
 * Note: validation.ts contains Roblox-specific helpers (typeOf, math.*)
 * and is only available in Roblox runtime. The numeric constants
 * (timeouts, limits, build) are safe for Node.js testing.
 */

// Pure constants (safe for both Roblox and Node.js)
export * from "./timeouts";
export * from "./limits";
export * from "./build";
