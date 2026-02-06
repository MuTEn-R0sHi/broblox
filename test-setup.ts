/**
 * Global test setup for the monorepo.
 *
 * Installs Roblox globals (`typeOf`, `os.clock`, etc.) before any module-level
 * code runs.  Packages like `@rbx/observability` eagerly initialise metrics at
 * import time, which requires these globals to exist.
 */

import { mockRobloxGlobals } from "@rbx/testing";

mockRobloxGlobals();

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
