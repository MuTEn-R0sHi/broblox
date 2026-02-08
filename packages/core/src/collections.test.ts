/**
 * Tests for collection helpers — arraySize, arrayRemoveAt, arrayTake, setSize.
 */

import { describe, it, expect } from "vitest";
import { arraySize, arrayRemoveAt, arrayTake, setSize } from "./collections";

// ============================================================================
// arraySize
// ============================================================================

describe("arraySize", () => {
  it("returns length of non-empty array", () => {
    expect(arraySize([1, 2, 3])).toBe(3);
  });

  it("returns 0 for empty array", () => {
    expect(arraySize([])).toBe(0);
  });

  it("works with string arrays", () => {
    expect(arraySize(["a", "b"])).toBe(2);
  });
});

// ============================================================================
// arrayRemoveAt
// ============================================================================

describe("arrayRemoveAt", () => {
  it("removes element at given index (unordered)", () => {
    const arr = [10, 20, 30, 40];
    arrayRemoveAt(arr, 1);
    expect(arr).toHaveLength(3);
    // Unordered remove swaps with last: [10, 40, 30]
    expect(arr).not.toContain(20);
  });

  it("removes last element correctly", () => {
    const arr = [10, 20, 30];
    arrayRemoveAt(arr, 2);
    expect(arr).toEqual([10, 20]);
  });

  it("removes first element", () => {
    const arr = [10, 20, 30];
    arrayRemoveAt(arr, 0);
    expect(arr).toHaveLength(2);
    expect(arr).not.toContain(10);
  });

  it("does nothing for negative index", () => {
    const arr = [10, 20, 30];
    arrayRemoveAt(arr, -1);
    expect(arr).toEqual([10, 20, 30]);
  });

  it("does nothing for out-of-bounds index", () => {
    const arr = [10, 20, 30];
    arrayRemoveAt(arr, 5);
    expect(arr).toEqual([10, 20, 30]);
  });

  it("handles single-element array", () => {
    const arr = [42];
    arrayRemoveAt(arr, 0);
    expect(arr).toEqual([]);
  });

  it("does nothing on empty array", () => {
    const arr: number[] = [];
    arrayRemoveAt(arr, 0);
    expect(arr).toEqual([]);
  });
});

// ============================================================================
// arrayTake
// ============================================================================

describe("arrayTake", () => {
  it("takes first n elements", () => {
    expect(arrayTake([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3]);
  });

  it("returns all elements if n >= length", () => {
    expect(arrayTake([1, 2], 10)).toEqual([1, 2]);
  });

  it("returns empty array for n=0", () => {
    expect(arrayTake([1, 2, 3], 0)).toEqual([]);
  });

  it("returns empty array from empty source", () => {
    expect(arrayTake([], 5)).toEqual([]);
  });

  it("does not mutate original array", () => {
    const original = [1, 2, 3, 4];
    const taken = arrayTake(original, 2);
    expect(taken).toEqual([1, 2]);
    expect(original).toEqual([1, 2, 3, 4]);
  });
});

// ============================================================================
// setSize
// ============================================================================

describe("setSize", () => {
  it("returns size of non-empty set", () => {
    const s = new Set([1, 2, 3]);
    expect(setSize(s)).toBe(3);
  });

  it("returns 0 for empty set", () => {
    expect(setSize(new Set())).toBe(0);
  });

  it("handles string set", () => {
    expect(setSize(new Set(["a", "b", "c", "d"]))).toBe(4);
  });

  it("deduplicates as expected", () => {
    const s = new Set([1, 1, 2, 2, 3]);
    expect(setSize(s)).toBe(3);
  });
});
