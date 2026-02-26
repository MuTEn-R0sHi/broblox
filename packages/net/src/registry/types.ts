/**
 * Remote Registry Type Definitions
 *
 * This module defines the type system for type-safe remotes.
 */

import { Result } from "@broblox/shared-types";
import { RateLimitConfig } from "../ratelimit";

// Re-export for convenience
export type { RateLimitConfig };

// ============================================================================
// Remote Direction
// ============================================================================

/** Direction of the remote call */
export type RemoteDirection = "client-to-server" | "server-to-client" | "bidirectional";

/** Remote type: function (request/response) or event (fire and forget) */
export type RemoteType = "function" | "event";

// ============================================================================
// Remote Definition
// ============================================================================

/**
 * Definition for a single remote endpoint.
 * This is the schema used to define remotes in the registry.
 */
export interface RemoteDefinition<
  TRequest = unknown,
  TResponse = unknown,
  TDir extends RemoteDirection = RemoteDirection,
  TType extends RemoteType = RemoteType,
> {
  /** Unique name for the remote (used as Instance name) */
  readonly name: string;

  /** Direction of the call */
  readonly direction: TDir;

  /** Type of remote */
  readonly type: TType;

  /** Rate limit configuration */
  readonly rateLimit?: RateLimitConfig;

  /** Description for documentation */
  readonly description?: string;

  /**
   * Schema validator function.
   * Should return true if the payload is valid.
   * This is called at runtime on the receiving end.
   */
  readonly validate?: (payload: unknown) => payload is TRequest;

  // Phantom types for TypeScript inference
  readonly __request?: TRequest;
  readonly __response?: TResponse;
}

// ============================================================================
// Remote Registry Type
// ============================================================================

/**
 * A registry of remote definitions.
 * Keys are the logical names, values are RemoteDefinition objects.
 */
export type RemoteRegistry = Record<string, RemoteDefinition>;

// ============================================================================
// Infer Request/Response Types
// ============================================================================

/** Extract the request type from a remote definition */
export type InferRequest<T extends RemoteDefinition> =
  T extends RemoteDefinition<infer R, unknown> ? R : never;

/** Extract the response type from a remote definition */
export type InferResponse<T extends RemoteDefinition> =
  T extends RemoteDefinition<unknown, infer R> ? R : never;

// ============================================================================
// Server Handler Types
// ============================================================================

/** Server handler for a RemoteFunction (client-to-server) */
export type ServerFunctionHandler<TRequest, TResponse> = (
  player: Player,
  request: TRequest
) => TResponse;

/** Server handler for a RemoteEvent (client-to-server) */
export type ServerEventHandler<TRequest> = (player: Player, request: TRequest) => void;

// ============================================================================
// Client Handler Types
// ============================================================================

/** Client handler for a RemoteEvent (server-to-client) */
export type ClientEventHandler<TRequest> = (request: TRequest) => void;

// ============================================================================
// Helper to create type-safe remote definitions
// ============================================================================

/**
 * Creates a type-safe remote definition.
 * Use this helper to get proper type inference.
 */
export function defineRemote<
  TRequest,
  TResponse = void,
  TDir extends RemoteDirection = "client-to-server",
  TType extends RemoteType = "function",
>(
  config: Omit<RemoteDefinition<TRequest, TResponse, TDir, TType>, "__request" | "__response">
): RemoteDefinition<TRequest, TResponse, TDir, TType> {
  return config as RemoteDefinition<TRequest, TResponse, TDir, TType>;
}

/**
 * Creates a client-to-server RemoteFunction definition.
 */
export function defineServerFunction<TRequest, TResponse>(
  name: string,
  options?: {
    rateLimit?: RateLimitConfig;
    description?: string;
    validate?: (payload: unknown) => payload is TRequest;
  }
): RemoteDefinition<TRequest, Result<TResponse>, "client-to-server", "function"> {
  return {
    name,
    direction: "client-to-server",
    type: "function",
    ...options,
  } as RemoteDefinition<TRequest, Result<TResponse>, "client-to-server", "function">;
}

/**
 * Creates a client-to-server RemoteEvent definition.
 */
export function defineServerEvent<TRequest>(
  name: string,
  options?: {
    rateLimit?: RateLimitConfig;
    description?: string;
    validate?: (payload: unknown) => payload is TRequest;
  }
): RemoteDefinition<TRequest, void, "client-to-server", "event"> {
  return {
    name,
    direction: "client-to-server",
    type: "event",
    ...options,
  } as RemoteDefinition<TRequest, void, "client-to-server", "event">;
}

/**
 * Creates a server-to-client RemoteEvent definition.
 */
export function defineClientEvent<TRequest>(
  name: string,
  options?: {
    description?: string;
  }
): RemoteDefinition<TRequest, void, "server-to-client", "event"> {
  return {
    name,
    direction: "server-to-client",
    type: "event",
    ...options,
  } as RemoteDefinition<TRequest, void, "server-to-client", "event">;
}
