// Polyfill for Roblox types in Node environment
import { mockRobloxGlobals } from "@broblox/testing";

mockRobloxGlobals();

// @ts-expect-error - Polyfilling native prototype for tests
String.prototype.size = function () {
  return this.length;
};

// @ts-expect-error - Polyfilling native prototype for tests
Array.prototype.size = function () {
  return this.length;
};
