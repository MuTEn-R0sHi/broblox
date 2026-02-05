/**
 * Runtime helpers for bridging Roblox/Luau idioms and Node-based tests.
 */

/**
 * Returns a collection size for Roblox/Luau-style values.
 * - In roblox-ts/Luau, Arrays and strings expose `.size()`.
 * - In Node/JS, Arrays use `.length` and strings use `.length`.
 */
export function rbxSize(value: unknown): number {
  const v = value as { size?: () => number; length?: number } | undefined | null;
  if (v === undefined || v === null) return 0;

  if (typeof v.size === "function") {
    return v.size();
  }

  if (typeof v.length === "number") {
    return v.length;
  }

  return 0;
}
