/**
 * @rbx/net
 * Networking utilities for the platform.
 * Compatible with roblox-ts.
 */

// Re-export shared types so consumers (game) don't need direct dependency on @rbx/shared-types
export * from "@rbx/shared-types";

// Export Internal Modules
export * from "./ratelimit";
export * from "./remotes";
export * from "./validation";

// Client utilities (timeout, retry)
export * from "./client";

// Remote Registry (type-safe remote definitions)
export * from "./registry";
