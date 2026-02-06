/**
 * @rbx/constants
 * Centralized configuration constants for the platform.
 * This package has NO dependencies and must remain pure.
 * Compatible with roblox-ts.
 */

// Pure constants (safe for both Roblox and Node.js)
export * from "./timeouts";
export * from "./limits";
export * from "./build";

// Roblox-specific validation helpers (uses typeOf, math.*)
// Safe to import everywhere — functions are compiled to Luau for Roblox
// and also work in Node.js tests with @rbx/testing mocks.
export * from "./validation";
