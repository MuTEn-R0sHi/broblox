/**
 * @rbx/shared-types
 * Core type definitions shared across the platform.
 * This package has NO dependencies and must remain pure.
 * Compatible with roblox-ts (noLib: true).
 */

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

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Stable error codes for remote responses.
 * Never change existing codes; only add new ones.
 */
export enum ErrorCode {
  Unknown = 0,
  InvalidPayload = 1001,
  PayloadTooLarge = 1002,
  MissingField = 1003,
  InvalidType = 1004,
  OutOfBounds = 1005,
  RateLimited = 2001,
  Cooldown = 2002,
  InvalidState = 2003,
  NotFound = 2004,
  AlreadyExists = 2005,
  InsufficientResources = 2006,
  FeatureDisabled = 2007,
  ProtocolMismatch = 3001,
  ClientOutdated = 3002,
  ServerOutdated = 3003,
  Unauthorized = 4001,
  Forbidden = 4002,
  SessionExpired = 4003,
  InternalError = 5001,
  ServiceUnavailable = 5002,
  Timeout = 5003,
}

// ============================================================================
// Result Type
// ============================================================================

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err {
  readonly ok: false;
  readonly code: ErrorCode;
  readonly message?: string;
  readonly retryAfterMs?: number;
  readonly field?: string;
}

export type Result<T> = Ok<T> | Err;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = (code: ErrorCode, options?: Omit<Err, "ok" | "code">): Err => ({
  ok: false,
  code,
  ...options,
});

export function isOk<T>(result: Result<T>): result is Ok<T> {
  return result.ok === true;
}

export function isErr<T>(result: Result<T>): result is Err {
  return result.ok === false;
}

export function unwrap<T>(result: Result<T>): T {
  if (isOk(result)) {
    return result.value;
  }
  error(`Unwrap failed: code ${result.code}`);
}

export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}

export function mapResult<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
}

export function flatMapResult<T, U>(result: Result<T>, fn: (value: T) => Result<U>): Result<U> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}

// ============================================================================
// Device Classes
// ============================================================================

export type DeviceClass = "kbm" | "gamepad" | "touch";

// ============================================================================
// Common DTOs
// ============================================================================

export interface BaseRequest {
  requestId?: string;
}

export interface BaseResponse {
  ok: boolean;
  code?: ErrorCode;
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

export type ResultValue<R> = R extends Result<infer T> ? T : never;
