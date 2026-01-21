/**
 * Local type definitions for @rbx/net
 * These are inlined to avoid cross-package dependencies for roblox-ts compilation.
 * The canonical definitions live in @rbx/shared-types.
 */

// ============================================================================
// Error Codes (subset needed by net)
// ============================================================================

export enum ErrorCode {
  InvalidPayload = 1001,
  InvalidType = 1004,
  OutOfBounds = 1005,
  RateLimited = 2001,
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
}

export type Result<T> = Ok<T> | Err;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

export const err = (code: ErrorCode, message?: string): Err => ({
  ok: false,
  code,
  message,
});
