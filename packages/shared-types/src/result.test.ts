/**
 * Comprehensive tests for result.ts — the canonical Result<T> type.
 *
 * Imports directly from ./result so coverage maps to the source file.
 */

import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  mapResult,
  flatMapResult,
  mapErr,
  toTuple,
} from "./result";
import type { Result } from "./result";
import { ErrorCode } from "./error-codes";

// ============================================================================
// Constructors
// ============================================================================

describe("ok()", () => {
  it("creates a success result with a primitive", () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(42);
  });

  it("creates a success result with a string", () => {
    const r = ok("hello");
    expect(r.ok).toBe(true);
    expect(r.value).toBe("hello");
  });

  it("creates a success result with an object", () => {
    const r = ok({ x: 1 });
    expect(r.value).toEqual({ x: 1 });
  });

  it("creates a success result with undefined", () => {
    const r = ok(undefined);
    expect(r.ok).toBe(true);
    expect(r.value).toBeUndefined();
  });

  it("creates a success result with null", () => {
    const r = ok(null);
    expect(r.ok).toBe(true);
    expect(r.value).toBeNull();
  });

  it("creates a success result with false", () => {
    const r = ok(false);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(false);
  });

  it("creates a success result with 0", () => {
    const r = ok(0);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(0);
  });
});

describe("err()", () => {
  it("creates an error with code only", () => {
    const r = err(ErrorCode.InvalidPayload);
    expect(r.ok).toBe(false);
    expect(r.code).toBe(ErrorCode.InvalidPayload);
    expect(r.message).toBeUndefined();
  });

  it("creates an error with message", () => {
    const r = err(ErrorCode.NotFound, { message: "item missing" });
    expect(r.code).toBe(ErrorCode.NotFound);
    expect(r.message).toBe("item missing");
  });

  it("creates an error with retryAfterMs", () => {
    const r = err(ErrorCode.RateLimited, { retryAfterMs: 5000 });
    expect(r.retryAfterMs).toBe(5000);
  });

  it("creates an error with field", () => {
    const r = err(ErrorCode.MissingField, { field: "username" });
    expect(r.field).toBe("username");
  });

  it("creates an error with context", () => {
    const r = err(ErrorCode.ProtocolMismatch, {
      context: { expected: 3, received: 2 },
    });
    expect(r.context).toEqual({ expected: 3, received: 2 });
  });

  it("creates an error with all optional fields", () => {
    const r = err(ErrorCode.InternalError, {
      message: "boom",
      retryAfterMs: 1000,
      field: "data",
      context: { trace: "abc" },
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(ErrorCode.InternalError);
    expect(r.message).toBe("boom");
    expect(r.retryAfterMs).toBe(1000);
    expect(r.field).toBe("data");
    expect(r.context).toEqual({ trace: "abc" });
  });
});

// ============================================================================
// Type Guards
// ============================================================================

describe("isOk()", () => {
  it("returns true for ok result", () => {
    expect(isOk(ok(1))).toBe(true);
  });

  it("returns false for err result", () => {
    expect(isOk(err(ErrorCode.Unknown))).toBe(false);
  });

  it("returns true for ok with falsy value", () => {
    expect(isOk(ok(0))).toBe(true);
    expect(isOk(ok(false))).toBe(true);
    expect(isOk(ok(""))).toBe(true);
    expect(isOk(ok(undefined))).toBe(true);
    expect(isOk(ok(null))).toBe(true);
  });
});

describe("isErr()", () => {
  it("returns true for err result", () => {
    expect(isErr(err(ErrorCode.NotFound))).toBe(true);
  });

  it("returns false for ok result", () => {
    expect(isErr(ok(1))).toBe(false);
  });
});

// ============================================================================
// Unwrap Variants
// ============================================================================

describe("unwrap()", () => {
  it("returns value from ok result", () => {
    expect(unwrap(ok(42))).toBe(42);
  });

  it("returns falsy values from ok result", () => {
    expect(unwrap(ok(0))).toBe(0);
    expect(unwrap(ok(false))).toBe(false);
    expect(unwrap(ok(""))).toBe("");
    expect(unwrap(ok(null))).toBeNull();
  });

  it("throws for err result", () => {
    expect(() => unwrap(err(ErrorCode.NotFound))).toThrow();
  });

  it("error message includes the error code", () => {
    expect(() => unwrap(err(ErrorCode.InvalidPayload))).toThrow(`${ErrorCode.InvalidPayload}`);
  });
});

describe("unwrapOr()", () => {
  it("returns value for ok result", () => {
    expect(unwrapOr(ok(42), 0)).toBe(42);
  });

  it("returns default for err result", () => {
    expect(unwrapOr(err(ErrorCode.NotFound), -1)).toBe(-1);
  });

  it("returns value even when it matches the default", () => {
    expect(unwrapOr(ok(0), 0)).toBe(0);
  });

  it("returns string default for err result", () => {
    expect(unwrapOr(err(ErrorCode.NotFound), "fallback")).toBe("fallback");
  });
});

describe("unwrapOrElse()", () => {
  it("returns value for ok result without calling fn", () => {
    let called = false;
    const result = unwrapOrElse(ok(42), () => {
      called = true;
      return 0;
    });
    expect(result).toBe(42);
    expect(called).toBe(false);
  });

  it("calls fn with error for err result", () => {
    const result = unwrapOrElse(err(ErrorCode.NotFound, { message: "missing" }), (e) => e.code);
    expect(result).toBe(ErrorCode.NotFound);
  });

  it("fn receives the full error object", () => {
    const result = unwrapOrElse(
      err(ErrorCode.RateLimited, { retryAfterMs: 3000 }),
      (e) => e.retryAfterMs ?? 0
    );
    expect(result).toBe(3000);
  });
});

// ============================================================================
// Mapping
// ============================================================================

describe("mapResult()", () => {
  it("maps ok value", () => {
    const r = mapResult(ok(2), (x) => x * 3);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(6);
  });

  it("maps ok value to a different type", () => {
    const r = mapResult(ok(42), (x) => `value=${x}`);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe("value=42");
  });

  it("passes through error unchanged", () => {
    const original = err(ErrorCode.Timeout, { message: "slow" });
    const r = mapResult(original, (x: number) => x * 2);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.code).toBe(ErrorCode.Timeout);
      expect(r.message).toBe("slow");
    }
  });

  it("does not call fn for error", () => {
    let called = false;
    mapResult(err(ErrorCode.Unknown), () => {
      called = true;
      return 0;
    });
    expect(called).toBe(false);
  });
});

describe("flatMapResult()", () => {
  it("chains ok → ok", () => {
    const r = flatMapResult(ok(2), (x) => ok(x * 5));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(10);
  });

  it("chains ok → err", () => {
    const r = flatMapResult(ok(2), () => err(ErrorCode.Cooldown));
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.code).toBe(ErrorCode.Cooldown);
  });

  it("short-circuits on initial err", () => {
    let called = false;
    const r = flatMapResult(err(ErrorCode.NotFound), (_x: number) => {
      called = true;
      return ok(99);
    });
    expect(isErr(r)).toBe(true);
    expect(called).toBe(false);
  });

  it("supports multi-step chaining", () => {
    const step1 = ok(10);
    const step2 = flatMapResult(step1, (x) => ok(x + 5));
    const step3 = flatMapResult(step2, (x) => ok(x * 2));
    expect(isOk(step3)).toBe(true);
    if (isOk(step3)) expect(step3.value).toBe(30);
  });

  it("stops at first error in chain", () => {
    const step1 = ok(10);
    const step2: Result<number> = flatMapResult(step1, () => err(ErrorCode.InvalidState));
    const step3 = flatMapResult(step2, (x: number) => ok(x * 2));
    expect(isErr(step3)).toBe(true);
    if (isErr(step3)) expect(step3.code).toBe(ErrorCode.InvalidState);
  });
});

describe("mapErr()", () => {
  it("transforms the error", () => {
    const r = mapErr(err(ErrorCode.Unknown), (e) => ({
      ...e,
      code: ErrorCode.InternalError,
      message: "upgraded",
    }));
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.code).toBe(ErrorCode.InternalError);
      expect(r.message).toBe("upgraded");
    }
  });

  it("passes ok result through unchanged", () => {
    const r = mapErr(ok(42), (e) => ({ ...e, code: ErrorCode.InternalError }));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(42);
  });

  it("does not call fn for ok result", () => {
    let called = false;
    mapErr(ok("hi"), () => {
      called = true;
      return err(ErrorCode.Unknown);
    });
    expect(called).toBe(false);
  });

  it("can add context to an error", () => {
    const r = mapErr(err(ErrorCode.Timeout), (e) => ({
      ...e,
      context: { retry: 3 },
    }));
    if (isErr(r)) {
      expect(r.context).toEqual({ retry: 3 });
    }
  });
});

// ============================================================================
// Tuple Conversion
// ============================================================================

describe("toTuple()", () => {
  it("returns [value, undefined] for ok", () => {
    const [v, e] = toTuple(ok(42));
    expect(v).toBe(42);
    expect(e).toBeUndefined();
  });

  it("returns [undefined, err] for error", () => {
    const [v, e] = toTuple(err(ErrorCode.NotFound));
    expect(v).toBeUndefined();
    expect(e).toBeDefined();
    expect(e!.code).toBe(ErrorCode.NotFound);
  });

  it("preserves error metadata in tuple", () => {
    const [, e] = toTuple(err(ErrorCode.RateLimited, { retryAfterMs: 2000, message: "slow" }));
    expect(e!.retryAfterMs).toBe(2000);
    expect(e!.message).toBe("slow");
  });

  it("handles ok with falsy values", () => {
    const [v1, e1] = toTuple(ok(0));
    expect(v1).toBe(0);
    expect(e1).toBeUndefined();

    const [v2, e2] = toTuple(ok(false));
    expect(v2).toBe(false);
    expect(e2).toBeUndefined();

    const [v3, e3] = toTuple(ok(""));
    expect(v3).toBe("");
    expect(e3).toBeUndefined();
  });
});
