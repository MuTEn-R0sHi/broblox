/**
 * Shared code between client and server.
 */

// Re-export platform types from @rbx packages
export * from "@rbx/shared-types";
export * from "@rbx/net";
export * from "@rbx/core";
export * from "@rbx/config-featureflags";

// Game-specific constants
export const GAME_NAME = "Starter";
export const GAME_VERSION = "0.0.0";
