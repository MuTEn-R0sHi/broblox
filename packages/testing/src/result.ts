/**
 * Result type utilities that mirror @rbx/shared-types.
 * For use in Node.js/Vitest tests.
 */

import { ErrorCode } from "./error-codes";

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
  throw new Error(`Unwrap failed: code ${result.code}`);
}

export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}
