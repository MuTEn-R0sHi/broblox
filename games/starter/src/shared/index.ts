/**
 * Shared code between client and server.
 */

// Re-export platform types from @rbx packages
// Note: We selectively export to avoid conflicts (net inlines some shared-types)
// export * from "@rbx/shared-types"; // Removed to avoid direct node_modules import error
export * from "@rbx/net";
export * from "@rbx/core";
export * from "@rbx/config-featureflags";

// Export net types explicitly (excluding duplicated Result/ok/err/ErrorCode)
export type { RateLimitConfig, DoActionPayload, HandshakePayload } from "@rbx/net";
export { validateDoActionPayload, validateHandshakePayload, RateLimiter } from "@rbx/net";

// Game-specific constants
export const GAME_NAME = "Starter";
export const GAME_VERSION = "0.0.0";
