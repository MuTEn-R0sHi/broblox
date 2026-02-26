/**
 * @broblox/net
 * Networking utilities for the platform.
 * Compatible with roblox-ts.
 */

// Re-export Result types and error codes that are part of the net API contract
export {
  ok,
  err,
  isOk,
  isErr,
  ErrorCode,
  PROTOCOL_VERSION,
  MIN_PROTOCOL_VERSION,
} from "@broblox/shared-types";

// Export Internal Modules
export * from "./ratelimit";
export * from "./remotes";
export * from "./validation";
export * from "./protocol";

// Client utilities (timeout, retry)
export * from "./client";

// Remote Registry (type-safe remote definitions)
export * from "./registry";

// Factory
export { createRemoteService } from "./create-remote-service";
export type { RemoteServiceConfig, RemoteServiceHandle } from "./create-remote-service";
