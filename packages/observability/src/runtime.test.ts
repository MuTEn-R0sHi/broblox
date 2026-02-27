/**
 * Tests for runtime helpers.
 */
import { describe, it, expect } from "vitest";
import { rbxSize } from "./runtime";

describe("rbxSize", () => {
  it("returns 0 for undefined", () => {
    expect(rbxSize(undefined)).toBe(0);
  });

  it("returns length for arrays", () => {
    expect(rbxSize([1, 2, 3])).toBe(3);
  });

  it("returns length for strings", () => {
    expect(rbxSize("hello")).toBe(5);
  });

  it("returns 0 for objects without size or length", () => {
    expect(rbxSize({})).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(rbxSize([])).toBe(0);
  });

  it("calls size() if available", () => {
    const obj = { size: () => 42 };
    expect(rbxSize(obj)).toBe(42);
  });
});
