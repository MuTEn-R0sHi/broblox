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
