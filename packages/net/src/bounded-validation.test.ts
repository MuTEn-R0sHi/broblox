/**
 * Tests for net/validation.ts — bounded validators and validate().
 *
 * The existing validation.test.ts covers payload-level validation.
 * This file adds coverage for bounded.number, bounded.string,
 * bounded.array, bounded.vector3, and the raw validate() function.
 */

import { describe, it, expect } from "vitest";
import { ErrorCode, isOk, isErr } from "@rbx/shared-types";
import { validate, bounded } from "./validation";
import { t } from "@rbxts/t";

// ============================================================================
// validate()
// ============================================================================

describe("validate", () => {
  it("returns ok for valid value", () => {
    const result = validate(t.number, 42);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value).toBe(42);
  });

  it("returns err with InvalidPayload for invalid value", () => {
    const result = validate(t.number, "not a number");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.code).toBe(ErrorCode.InvalidPayload);
  });
});

// ============================================================================
// bounded.number
// ============================================================================

describe("bounded.number", () => {
  const check = bounded.number(0, 100);

  it("accepts number within range", () => {
    expect(check(50)).toBe(true);
  });

  it("accepts min boundary", () => {
    expect(check(0)).toBe(true);
  });

  it("accepts max boundary", () => {
    expect(check(100)).toBe(true);
  });

  it("rejects number below min", () => {
    expect(check(-1)).toBe(false);
  });

  it("rejects number above max", () => {
    expect(check(101)).toBe(false);
  });

  it("rejects non-number", () => {
    expect(check("50")).toBe(false);
  });
});

// ============================================================================
// bounded.string
// ============================================================================

describe("bounded.string", () => {
  const check = bounded.string(10, 2);

  it("accepts string within bounds", () => {
    expect(check("hello")).toBe(true);
  });

  it("accepts string at min length", () => {
    expect(check("ab")).toBe(true);
  });

  it("accepts string at max length", () => {
    expect(check("abcdefghij")).toBe(true);
  });

  it("rejects string below min length", () => {
    expect(check("a")).toBe(false);
  });

  it("rejects string above max length", () => {
    expect(check("abcdefghijk")).toBe(false);
  });

  it("rejects non-string", () => {
    expect(check(42)).toBe(false);
  });

  it("defaults minLength to 0", () => {
    const noMin = bounded.string(5);
    expect(noMin("")).toBe(true);
    expect(noMin("hi")).toBe(true);
    expect(noMin("toolong")).toBe(false);
  });
});

// ============================================================================
// bounded.array
// ============================================================================

describe("bounded.array", () => {
  const check = bounded.array(t.number, 3);

  it("accepts valid array within max length", () => {
    expect(check([1, 2, 3])).toBe(true);
  });

  it("accepts empty array", () => {
    expect(check([])).toBe(true);
  });

  it("rejects array exceeding max length", () => {
    expect(check([1, 2, 3, 4])).toBe(false);
  });

  it("rejects array with wrong item types", () => {
    expect(check([1, "two", 3])).toBe(false);
  });

  it("rejects non-table value", () => {
    expect(check("not an array")).toBe(false);
    expect(check(42)).toBe(false);
  });
});

// ============================================================================
// bounded.vector3
// ============================================================================

describe("bounded.vector3", () => {
  const check = bounded.vector3(100);

  it("rejects non-Vector3 values", () => {
    // Vector3 is a Roblox-only type — no mock available in test env
    // typeOf(v) === "Vector3" check catches these
    expect(check({ X: 1, Y: 2, Z: 3, Magnitude: 3.7 })).toBe(false);
    expect(check(42)).toBe(false);
    expect(check("vector")).toBe(false);
  });
});
