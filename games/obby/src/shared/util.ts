/**
 * Shared utility helpers for the obby game.
 *
 * These helpers bridge roblox-ts and Node.js differences (e.g. Map.size()
 * is a method in roblox-ts but a getter in JS).
 */

/**
 * Count entries in a Map.  Works in both roblox-ts (Lua table) and Node.js.
 */
export function mapLen<K, V>(m: ReadonlyMap<K, V>): number {
  let n = 0;
  m.forEach(() => n++);
  return n;
}

/**
 * Count entries in a Set.  Works in both roblox-ts and Node.js.
 */
export function setLen<T>(s: ReadonlySet<T>): number {
  let n = 0;
  s.forEach(() => n++);
  return n;
}

/**
 * Count elements in an array-like.  roblox-ts `.size()` vs JS `.length`.
 */
export function arrLen<T>(a: readonly T[]): number {
  let n = 0;
  for (const _ of a) {
    n++;
    void _;
  }
  return n;
}
