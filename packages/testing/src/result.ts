/**
 * Result type utilities for Node.js/Vitest tests.
 * Mirrors the API of @broblox/shared-types/result.ts
 *
 * Note: This is a Node.js-compatible version that throws Error
 * instead of calling Roblox's error() function.
 */

import { ErrorCode } from "./error-codes";

// ============================================================================
// Result Types
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
  /** Additional context for debugging (e.g., version info) */
  readonly context?: Record<string, unknown>;
}

export type Result<T> = Ok<T> | Err;

// ============================================================================
// Result Constructors
// ============================================================================

/**
 * Create a successful result.
 */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

/**
 * Create an error result.
 */
export const err = (code: ErrorCode, options?: Omit<Err, "ok" | "code">): Err => ({
  ok: false,
  code,
  ...options,
});

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a result is successful.
 */
export function isOk<T>(result: Result<T>): result is Ok<T> {
  return result.ok === true;
}

/**
 * Check if a result is an error.
 */
export function isErr<T>(result: Result<T>): result is Err {
  return result.ok === false;
}

// ============================================================================
// Result Utilities
// ============================================================================

/**
 * Unwrap a result, throwing if it's an error.
 * Use sparingly - prefer pattern matching with isOk/isErr.
 */
export function unwrap<T>(result: Result<T>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw new Error(`Unwrap failed: code ${result.code}`);
}

/**
 * Unwrap a result, returning a default value if it's an error.
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Unwrap a result, computing a default value if it's an error.
 */
export function unwrapOrElse<T>(result: Result<T>, fn: (err: Err) => T): T {
  if (isOk(result)) {
    return result.value;
  }
  return fn(result);
}

/**
 * Map a successful result to a new value.
 */
export function mapResult<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * Map and flatten a successful result.
 */
export function flatMapResult<T, U>(result: Result<T>, fn: (value: T) => Result<U>): Result<U> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}

/**
 * Map an error result to a new error.
 */
export function mapErr(result: Result<unknown>, fn: (err: Err) => Err): Result<unknown> {
  if (isErr(result)) {
    return fn(result);
  }
  return result;
}

/**
 * Convert a Result to a tuple [value, error] for destructuring.
 */
export function toTuple<T>(result: Result<T>): [T | undefined, Err | undefined] {
  if (isOk(result)) {
    return [result.value, undefined];
  }
  return [undefined, result];
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract the value type from a Result.
 */
export type ResultValue<R> = R extends Result<infer T> ? T : never;

/**
 * Extract the error type from a Result (always Err).
 */
export type ResultError<R> = R extends Result<unknown> ? Err : never;
