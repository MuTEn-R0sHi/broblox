/**
 * Tests for shared-types error-codes and result utilities.
 *
 * Covers the functions not exercised by the existing index.test.ts:
 * - getErrorCodeDescription (all branches)
 * - isRetryableError, isClientError, isServerError
 * - unwrapOrElse, flatMapResult, mapErr, toTuple
 */

import { describe, it, expect } from "vitest";
import {
  ErrorCode,
  getErrorCodeDescription,
  isRetryableError,
  isClientError,
  isServerError,
  ok,
  err,
  isOk,
  isErr,
  unwrapOrElse,
  flatMapResult,
  mapErr,
  toTuple,
} from "./index";

// ============================================================================
// getErrorCodeDescription
// ============================================================================

describe("getErrorCodeDescription", () => {
  it("returns description for every known error code", () => {
    const codes: ErrorCode[] = [
      ErrorCode.Unknown,
      ErrorCode.InvalidPayload,
      ErrorCode.PayloadTooLarge,
      ErrorCode.MissingField,
      ErrorCode.InvalidType,
      ErrorCode.OutOfBounds,
      ErrorCode.RateLimited,
      ErrorCode.Cooldown,
      ErrorCode.InvalidState,
      ErrorCode.NotFound,
      ErrorCode.AlreadyExists,
      ErrorCode.InsufficientResources,
      ErrorCode.FeatureDisabled,
      ErrorCode.ProtocolMismatch,
      ErrorCode.ClientOutdated,
      ErrorCode.ServerOutdated,
      ErrorCode.Unauthorized,
      ErrorCode.Forbidden,
      ErrorCode.SessionExpired,
      ErrorCode.InternalError,
      ErrorCode.ServiceUnavailable,
      ErrorCode.Timeout,
      ErrorCode.DataStoreFailed,
    ];

    for (const code of codes) {
      const desc = getErrorCodeDescription(code);
      expect(desc).toBeTruthy();
      expect(typeof desc).toBe("string");
    }
  });

  it("returns fallback for an unrecognized code", () => {
    const desc = getErrorCodeDescription(99999 as ErrorCode);
    expect(desc).toBe("An error occurred");
  });
});

// ============================================================================
// isRetryableError
// ============================================================================

describe("isRetryableError", () => {
  it("returns true for retryable codes", () => {
    expect(isRetryableError(ErrorCode.RateLimited)).toBe(true);
    expect(isRetryableError(ErrorCode.Cooldown)).toBe(true);
    expect(isRetryableError(ErrorCode.ServiceUnavailable)).toBe(true);
    expect(isRetryableError(ErrorCode.Timeout)).toBe(true);
    expect(isRetryableError(ErrorCode.DataStoreFailed)).toBe(true);
  });

  it("returns false for non-retryable codes", () => {
    expect(isRetryableError(ErrorCode.InvalidPayload)).toBe(false);
    expect(isRetryableError(ErrorCode.NotFound)).toBe(false);
    expect(isRetryableError(ErrorCode.Unauthorized)).toBe(false);
    expect(isRetryableError(ErrorCode.InternalError)).toBe(false);
  });
});

// ============================================================================
// isClientError / isServerError
// ============================================================================

describe("isClientError", () => {
  it("returns true for 1xxx–4xxx codes", () => {
    expect(isClientError(ErrorCode.InvalidPayload)).toBe(true);
    expect(isClientError(ErrorCode.RateLimited)).toBe(true);
    expect(isClientError(ErrorCode.ProtocolMismatch)).toBe(true);
    expect(isClientError(ErrorCode.Unauthorized)).toBe(true);
  });

  it("returns false for 5xxx codes", () => {
    expect(isClientError(ErrorCode.InternalError)).toBe(false);
  });

  it("returns false for Unknown (0)", () => {
    expect(isClientError(ErrorCode.Unknown)).toBe(false);
  });
});

describe("isServerError", () => {
  it("returns true for 5xxx codes", () => {
    expect(isServerError(ErrorCode.InternalError)).toBe(true);
    expect(isServerError(ErrorCode.ServiceUnavailable)).toBe(true);
    expect(isServerError(ErrorCode.Timeout)).toBe(true);
    expect(isServerError(ErrorCode.DataStoreFailed)).toBe(true);
  });

  it("returns false for client codes", () => {
    expect(isServerError(ErrorCode.InvalidPayload)).toBe(false);
    expect(isServerError(ErrorCode.Unauthorized)).toBe(false);
  });
});

// ============================================================================
// Result utilities not yet covered
// ============================================================================

describe("unwrapOrElse", () => {
  it("returns value for ok result", () => {
    expect(unwrapOrElse(ok(42), () => 0)).toBe(42);
  });

  it("computes default from error for err result", () => {
    const result = err(ErrorCode.NotFound, { message: "missing" });
    const value = unwrapOrElse(result, (e) => e.code);
    expect(value).toBe(ErrorCode.NotFound);
  });
});

describe("flatMapResult", () => {
  it("chains ok results", () => {
    const result = flatMapResult(ok(2), (x) => ok(x * 3));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value).toBe(6);
  });

  it("short-circuits on first error", () => {
    const result = flatMapResult(err(ErrorCode.NotFound), (_x: number) => ok(99));
    expect(isErr(result)).toBe(true);
  });

  it("propagates error from inner fn", () => {
    const result = flatMapResult(ok(1), () => err(ErrorCode.Cooldown));
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.code).toBe(ErrorCode.Cooldown);
  });
});

describe("mapErr", () => {
  it("transforms error result", () => {
    const result = mapErr(err(ErrorCode.Unknown), (e) => ({
      ...e,
      code: ErrorCode.InternalError,
    }));
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.code).toBe(ErrorCode.InternalError);
  });

  it("passes ok result through unchanged", () => {
    const result = mapErr(ok(42), (e) => e);
    expect(isOk(result)).toBe(true);
  });
});

describe("toTuple", () => {
  it("returns [value, undefined] for ok", () => {
    const [v, e] = toTuple(ok("hello"));
    expect(v).toBe("hello");
    expect(e).toBeUndefined();
  });

  it("returns [undefined, err] for error", () => {
    const [v, e] = toTuple(err(ErrorCode.Timeout));
    expect(v).toBeUndefined();
    expect(e).toBeDefined();
    expect(e!.code).toBe(ErrorCode.Timeout);
  });
});
