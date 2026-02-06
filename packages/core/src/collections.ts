/**
 * Roblox-TS compatible collection helpers.
 *
 * These exist because roblox-ts arrays/sets use Lua tables under the hood,
 * so standard JS .length / .size getters aren't available in the compiled output.
 * All packages should import from here instead of inlining these helpers.
 */

// ============================================================================
// Array Helpers
// ============================================================================

/**
 * Get array length in a roblox-ts compatible way.
 * In compiled Luau, `arr.length` isn't available; iterate instead.
 */
export function arraySize<T extends defined>(arr: T[]): number {
  let count = 0;
  for (const _ of arr) {
    count++;
  }
  return count;
}

/**
 * Remove element at index from array (mutates array).
 * Uses unordered remove for O(1) performance — swaps with last element and pops.
 */
export function arrayRemoveAt<T extends defined>(arr: T[], index: number): void {
  const len = arraySize(arr);
  if (index < 0 || index >= len) return;

  // Swap with last element and pop
  if (index < len - 1) {
    arr[index] = arr[len - 1];
  }
  arr.pop();
}

/**
 * Take first n elements from array (returns new array).
 */
export function arrayTake<T extends defined>(arr: T[], n: number): T[] {
  const result: T[] = [];
  let count = 0;
  for (const item of arr) {
    if (count >= n) break;
    result.push(item);
    count++;
  }
  return result;
}

// ============================================================================
// Set Helpers
// ============================================================================

/**
 * Get Set size in a roblox-ts compatible way.
 * In compiled Luau, `set.size` isn't a simple property; iterate instead.
 */
export function setSize<T>(s: Set<T>): number {
  let count = 0;
  s.forEach(() => {
    count++;
  });
  return count;
}
