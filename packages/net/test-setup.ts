// Polyfill for Roblox types in Node environment
// @ts-expect-error - Polyfilling native prototype for tests
String.prototype.size = function () {
  return this.length;
};
