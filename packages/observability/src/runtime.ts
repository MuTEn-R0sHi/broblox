/**
 * Runtime helpers for bridging Roblox/Luau idioms and Node-based tests.
 */

/**
 * Returns a collection size for Roblox/Luau-style values.
 * - In roblox-ts/Luau, Arrays and strings expose `.size()`.
 * - In Node/JS, Arrays use `.length` and strings use `.length`.
 */
export function rbxSize(value: unknown): number {
  if (value === undefined) return 0;

  const v = value as unknown as Record<string, unknown>;

  // Call .size() as a method so `this` stays bound in both Luau and Node.
  // roblox-ts does not support Function.call().
  if (typeOf(v["size"]) === "function") {
    return (value as unknown as { size(): number }).size();
  }

  if (typeOf(v["length"]) === "number") {
    return v["length"] as number;
  }

  return 0;
}
