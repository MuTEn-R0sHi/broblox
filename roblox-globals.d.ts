/**
 * Roblox / Lua globals — ambient type declarations for the vitest / Node
 * test-runner context.  The implementations live in test-setup.ts.
 *
 * These declarations are NOT included by rbxtsc (tsconfig.roblox.json limits
 * `include` to games/ and packages/ src directories), so they will never
 * conflict with the canonical @rbxts/types definitions used during Roblox
 * compilation.
 */

/** Lua `pairs()` — iterate key/value pairs of a table (plain object). */
declare function pairs(obj: Record<string, unknown>): Generator<[string, unknown]>;
