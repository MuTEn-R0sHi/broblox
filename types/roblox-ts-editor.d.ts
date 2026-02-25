/**
 * Ambient type augmentations for roblox-ts compatibility in VS Code.
 *
 * roblox-ts replaces standard JS APIs with Lua equivalents:
 * - Array/String `.length` → `.size()`
 * - String `.indexOf()` → `.find()` (1-indexed, returns tuple)
 * - String `.slice()` → `.sub()` (1-indexed, inclusive end)
 * - `pairs()` global for object iteration
 *
 * These declarations let VS Code understand the roblox-ts API surface
 * without needing `noLib: true` + `@rbxts/types`.
 * The actual compilation is handled by `rbxtsc` using `tsconfig.roblox.json`.
 */

interface Array<T> {
  /** Returns the number of elements (roblox-ts: replaces `.length`). */
  size(): number;
  /** Removes and returns the element at the given index (roblox-ts). */
  remove(index: number): T | undefined;
  /** Removes all elements from the array (roblox-ts). */
  clear(): void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ReadonlyArray<T> {
  /** Returns the number of elements (roblox-ts: replaces `.length`). */
  size(): number;
}

interface String {
  /** Returns the length of the string (roblox-ts: replaces `.length`). */
  size(): number;
  /** Finds the first occurrence of pattern. Returns [start] (1-indexed) or [undefined]. */
  find(pattern: string): [number | undefined];
  /** Returns a substring (1-indexed, inclusive end — Lua `string.sub` semantics). */
  sub(i: number, j?: number): string;
  /** Returns the byte (char code) at position i (1-indexed). */
  byte(i: number): [number];
  /** Converts the string to uppercase (Lua `string.upper`). */
  upper(): string;
  /** Converts the string to lowercase (Lua `string.lower`). */
  lower(): string;
}

/**
 * Iterates over key-value pairs of a table/object (Lua `pairs()`).
 * Used in roblox-ts instead of `Object.entries()`.
 */
declare function pairs<T extends object>(obj: T): IterableIterator<[keyof T, T[keyof T]]>;

/** Lua `tostring()` global. */
declare function tostring(value: unknown): string;

/** Lua `tonumber()` global. */
declare function tonumber(value: unknown): number | undefined;

/** Lua `type()` replacement — roblox-ts `typeOf()`. */
declare function typeOf(value: unknown): string;
