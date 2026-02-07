/**
 * Shared Roblox runtime type declarations for roblox-ts packages.
 *
 * This file declares Lua/Roblox globals that roblox-ts provides at compile time
 * but need ambient declarations for editor support and vitest.
 * Individual packages should NOT redeclare these — import this file via tsconfig.
 *
 * For Roblox service-specific types (e.g., UserInputService, TweenService),
 * declare those locally in the file that uses them, or cast at the call site:
 *   const uis = game.GetService("UserInputService") as UserInputService;
 */

// ============================================================================
// Roblox Game Global
// ============================================================================

/** The global `game` object. Use `as` casts for service-specific APIs. */
declare const game: {
  GetService(name: string): unknown;
  /** The unique identifier for this game server instance. */
  JobId: string;
  /** The place ID of the current game. */
  PlaceId: number;
};

// ============================================================================
// Lua Built-in Functions
// ============================================================================

/** Lua protected call — catches errors and returns [success, result]. */
declare function pcall<T>(fn: () => T): LuaTuple<[boolean, T]>;

/** Lua type checking (roblox-ts `typeIs`). */
declare function typeIs(value: unknown, typeName: string): boolean;

/** Lua `select` — returns arguments after `index`, or count with "#". */
declare function select<T>(index: number | "#", ...args: T[]): T;

// ============================================================================
// Lua Standard Libraries
// ============================================================================

/** Lua `os` library (subset used by roblox-ts). */
declare const os: {
  time(): number;
  clock(): number;
};

/** Lua `math` library. */
declare const math: {
  floor(n: number): number;
  ceil(n: number): number;
  abs(n: number): number;
  min(a: number, b: number): number;
  max(a: number, b: number): number;
  pow(base: number, exp: number): number;
  random(): number;
  random(m: number): number;
  random(m: number, n: number): number;
  sin(x: number): number;
  cos(x: number): number;
  sqrt(x: number): number;
  log(x: number, base?: number): number;
  huge: number;
  pi: number;
};

/** Lua `string` library (called on string values). */
declare const string: {
  upper(s: string): string;
  lower(s: string): string;
  format(fmt: string, ...args: unknown[]): string;
  rep(s: string, n: number): string;
  len(s: string): number;
};

/** Lua `print` global. */
declare const print: (...args: unknown[]) => void;

// ============================================================================
// Roblox DataStore Interfaces
// ============================================================================

/** Roblox DataStore API. */
interface DataStore {
  GetAsync(key: string): unknown;
  SetAsync(key: string, value: unknown): void;
  UpdateAsync(key: string, callback: (old: unknown) => unknown): unknown;
}

/** Roblox DataStoreService API. */
interface DataStoreService {
  GetDataStore(name: string): DataStore;
}

/** Roblox HttpService API. */
interface HttpService {
  GenerateGUID(wrapInCurlyBraces?: boolean): string;
  JSONEncode(value: unknown): string;
  JSONDecode(input: string): unknown;
}

/** Roblox MessagingService API. */
interface MessagingService {
  PublishAsync(topic: string, message: unknown): void;
  SubscribeAsync(
    topic: string,
    callback: (message: { Data: unknown; Sent: number }) => void
  ): RBXScriptConnection;
}
