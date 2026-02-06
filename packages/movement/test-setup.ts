/**
 * Test setup for @rbx/movement
 *
 * Roblox globals like `typeOf` must be available before any module-level
 * code runs (e.g. `@rbx/observability` eagerly creates CommonMetrics).
 * Vitest `setupFiles` execute before module imports, so this is the right
 * place to install them.
 */

import { mockRobloxGlobals } from "@rbx/testing";

mockRobloxGlobals();

// Roblox-TS .size() for Array and String
// @ts-expect-error - Polyfilling native prototype for tests
Array.prototype.size = function () {
  return this.length;
};
// @ts-expect-error - Polyfilling native prototype for tests
String.prototype.size = function () {
  return this.length;
};
