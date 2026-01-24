/**
 * @rbx/shared-types
 * Core type definitions shared across the platform.
 * This package has NO dependencies and must remain pure.
 * Compatible with roblox-ts (noLib: true).
 */

// ============================================================================
// Core Modules
// ============================================================================

export * from "./error-codes";
export * from "./result";
export * from "./do-action";

// ============================================================================
// Branded Types
// ============================================================================

/**
 * Brand a primitive type for type-safe IDs.
 * Example: PlayerId is a number that can't be accidentally used as a MatchId.
 */
export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

/** Unique player identifier (Roblox UserId) */
export type PlayerId = Brand<number, "PlayerId">;

/** Unique match/game session identifier */
export type MatchId = Brand<string, "MatchId">;

/** Unique request identifier for idempotency */
export type RequestId = Brand<string, "RequestId">;

/** Server/job identifier */
export type ServerId = Brand<string, "ServerId">;

/** Session identifier */
export type SessionId = Brand<string, "SessionId">;

// Brand constructors (runtime no-op, compile-time safety)
export const createPlayerId = (id: number): PlayerId => id as PlayerId;
export const createMatchId = (id: string): MatchId => id as MatchId;
export const createRequestId = (id: string): RequestId => id as RequestId;
export const createServerId = (id: string): ServerId => id as ServerId;
export const createSessionId = (id: string): SessionId => id as SessionId;

// ============================================================================
// Protocol Version
// ============================================================================

/**
 * Protocol version for client-server compatibility.
 * Increment on breaking changes (see ADR-0002).
 */
export const PROTOCOL_VERSION = 1;

/**
 * Minimum supported protocol version.
 * Clients below this version will be rejected.
 */
export const MIN_PROTOCOL_VERSION = 1;

// ============================================================================
// Device Classes
// ============================================================================

export type DeviceClass = "kbm" | "gamepad" | "touch";

export interface HandshakePayload {
  protocolVersion: number;
  buildId: string;
  deviceClass: DeviceClass;
}

export interface HandshakeResponse {
  serverVersion: number;
  serverTime: number;
  minProtocolVersion?: number;
}

// ============================================================================
// Common DTOs
// ============================================================================

export interface BaseRequest {
  requestId?: string;
}

export interface BaseResponse {
  ok: boolean;
  code?: number;
  retryAfterMs?: number;
}

export interface Vector3DTO {
  x: number;
  y: number;
  z: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Make specific properties required.
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties optional.
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
