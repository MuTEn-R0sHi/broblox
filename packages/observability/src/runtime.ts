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

  const v = value as unknown as {
    size?: () => number;
    length?: number;
  };

  const maybeSize = (v as unknown as Record<string, unknown>)["size"];
  if (typeOf(maybeSize) === "function") {
    return (maybeSize as (this: unknown) => number).call(v);
  }

  const maybeLength = (v as unknown as Record<string, unknown>)["length"];
  if (typeOf(maybeLength) === "number") {
    return maybeLength as number;
  }

  return 0;
}
