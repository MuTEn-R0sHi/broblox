/**
 * Global test setup for the monorepo.
 *
 * Installs Roblox globals (`typeOf`, `os.clock`, etc.) before any module-level
 * code runs.  Packages like `@rbx/observability` eagerly initialise metrics at
 * import time, which requires these globals to exist.
 */

import { mockRobloxGlobals } from "@rbx/testing";

mockRobloxGlobals();

// Roblox `pairs()` — iterates key/value pairs of a table (object)
const g = globalThis as Record<string, unknown>;
if (!g.pairs) {
  g.pairs = function* (obj: Record<string, unknown>) {
    for (const [k, v] of Object.entries(obj)) {
      yield [k, v];
    }
  };
}

// Roblox-TS .size() polyfills (Array/String)
// @ts-expect-error - Polyfilling native prototype for tests
if (!Array.prototype.size) {
  // @ts-expect-error - Polyfilling native prototype for tests
  Array.prototype.size = function () {
    return this.length;
  };
}
// @ts-expect-error - Polyfilling native prototype for tests
if (!String.prototype.size) {
  // @ts-expect-error - Polyfilling native prototype for tests
  String.prototype.size = function () {
    return this.length;
  };
}

// Roblox-TS String.byte() polyfill (1-indexed, returns array of char codes)
// @ts-expect-error - Polyfilling native prototype for tests
if (!String.prototype.byte) {
  // @ts-expect-error - Polyfilling native prototype for tests
  String.prototype.byte = function (i: number) {
    return [this.charCodeAt(i - 1)];
  };
}

// Roblox-TS String.find() polyfill (1-indexed, returns [start] or [undefined])
// @ts-expect-error - Polyfilling native prototype for tests
if (!String.prototype.find) {
  // @ts-expect-error - Polyfilling native prototype for tests
  String.prototype.find = function (pattern: string) {
    const idx = this.indexOf(pattern);
    if (idx === -1) return [undefined];
    return [idx + 1]; // 1-indexed
  };
}

// Roblox-TS String.sub() polyfill (1-indexed, inclusive end)
// NOTE: Must override because JS has a deprecated String.prototype.sub() that
// wraps text in <sub> tags, which is NOT what roblox-ts expects.
{
  // @ts-expect-error - Overriding native sub for roblox-ts compat
  String.prototype.sub = function (i: number, j?: number) {
    const start = i - 1;
    if (j === undefined) return this.slice(start);
    return this.slice(start, j);
  };
}

// Roblox-TS String.lower() / String.upper() polyfill
// @ts-expect-error - Polyfilling native prototype for tests
if (!String.prototype.lower) {
  // @ts-expect-error - Polyfilling native prototype for tests
  String.prototype.lower = function () {
    return this.toLowerCase();
  };
}
// @ts-expect-error - Polyfilling native prototype for tests
if (!String.prototype.upper) {
  // @ts-expect-error - Polyfilling native prototype for tests
  String.prototype.upper = function () {
    return this.toUpperCase();
  };
}

// Roblox-TS Array.remove() polyfill (removes element at index)
// @ts-expect-error - Polyfilling native prototype for tests
if (!Array.prototype.remove) {
  // @ts-expect-error - Polyfilling native prototype for tests
  Array.prototype.remove = function (index: number) {
    return this.splice(index, 1)[0];
  };
}

// Roblox-TS Array.clear() polyfill (empties the array)
// @ts-expect-error - Polyfilling native prototype for tests
if (!Array.prototype.clear) {
  // @ts-expect-error - Polyfilling native prototype for tests
  Array.prototype.clear = function () {
    this.length = 0;
  };
}

// Note: Map.size and Set.size are getters in JS but called as methods in
// roblox-ts (`.size()`).  Game code uses `mapLen()` / `setLen()` helpers
// (from shared/util) that work in both environments — no polyfill needed.

// Roblox-TS Array.sort() polyfill — Lua table.sort comparators return boolean
// (true = a before b), but JS Array.sort expects a numeric comparator.  Wrap
// the native sort so that boolean-returning comparators work correctly in tests.
{
  const nativeSort = Array.prototype.sort;
  // @ts-expect-error - Overriding native sort for roblox-ts compat
  Array.prototype.sort = function (compareFn?: (...args: unknown[]) => unknown) {
    if (!compareFn) return nativeSort.call(this);
    return nativeSort.call(this, (a: unknown, b: unknown) => {
      const r = compareFn(a, b);
      if (typeof r === "boolean") {
        // Lua semantics: true => a before b, false => check reverse
        if (r) return -1;
        const rev = compareFn(b, a);
        if (rev) return 1;
        return 0;
      }
      return r as number;
    });
  };
}
