/**
 * Roblox API mocks for Node.js/Vitest testing.
 * These simulate Roblox globals that don't exist in Node.js.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Mock for Roblox's os.clock() - returns seconds since script start.
 */
let mockClockStart = Date.now();

export function osClock(): number {
  return (Date.now() - mockClockStart) / 1000;
}

/**
 * Reset the mock clock to simulate script restart.
 */
export function resetMockClock(): void {
  mockClockStart = Date.now();
}

/**
 * Set mock clock to a specific value (in seconds).
 */
export function setMockClock(seconds: number): void {
  mockClockStart = Date.now() - seconds * 1000;
}

/**
 * Mock for Roblox's os.time() - returns Unix timestamp.
 */
export function osTime(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Mock for Roblox's typeOf() function.
 */
export function typeOf(value: unknown): string {
  if (value === null || value === undefined) {
    return "nil";
  }
  if (Array.isArray(value)) {
    return "table";
  }
  const t = typeof value;
  if (t === "object") {
    return "table";
  }
  return t;
}

/**
 * Mock for Roblox's tostring() function.
 */
export function tostring(value: unknown): string {
  return String(value);
}

/**
 * Mock for Roblox's tonumber() function.
 */
export function tonumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Mock math module matching Roblox's math API.
 */
export const math = {
  min: Math.min,
  max: Math.max,
  floor: Math.floor,
  ceil: Math.ceil,
  abs: Math.abs,
  sqrt: Math.sqrt,
  random: Math.random,
  clamp: (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
  },
};

/**
 * Install Roblox globals on the global object for tests.
 * Call this in beforeAll() or at the top of test files.
 */
export function mockRobloxGlobals(): void {
  const g = globalThis as any;

  // Polyfill roblox-ts array .size() → .length
  if (!Array.prototype.size) {
    (Array.prototype as any).size = function (this: unknown[]) {
      return this.length;
    };
  }

  g.os = {
    clock: osClock,
    time: osTime,
  };

  g.typeOf = typeOf;
  g.tostring = tostring;
  g.tonumber = tonumber;
  g.math = math;

  // Mock print/warn
  g.print = console.log;
  g.warn = console.warn;

  // Mock pcall
  g.pcall = <T>(fn: () => T): [true, T] | [false, string] => {
    try {
      return [true, fn()];
    } catch (e) {
      return [false, String(e)];
    }
  };

  // Mock error
  g.error = (message: string): never => {
    throw new Error(message);
  };
}

/**
 * Remove Roblox globals from the global object.
 * Call this in afterAll() if needed.
 */
export function unmockRobloxGlobals(): void {
  const g = globalThis as any;
  delete g.os;
  delete g.typeOf;
  delete g.tostring;
  delete g.tonumber;
  delete g.math;
  delete g.print;
  delete g.warn;
  delete g.pcall;
  delete g.error;
}
