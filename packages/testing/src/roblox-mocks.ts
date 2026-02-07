/**
 * Roblox API mocks for Node.js/Vitest testing.
 * These simulate Roblox globals that don't exist in Node.js.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Mock for Roblox's os.clock() - returns seconds since script start.
 * Starts at 60s offset to simulate a server that has been running for a while,
 * avoiding false negatives on cooldown-based anti-spam checks.
 */
const CLOCK_OFFSET = 60; // seconds
let mockClockStart = Date.now() - CLOCK_OFFSET * 1000;

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
 * Supports optional base parameter (e.g. tonumber("FF", 16)).
 */
export function tonumber(value: unknown, base?: number): number | undefined {
  if (base !== undefined) {
    const n = parseInt(String(value), base);
    return Number.isNaN(n) ? undefined : n;
  }
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
  huge: Infinity,
  pi: Math.PI,
  log: Math.log,
  exp: Math.exp,
  pow: Math.pow,
  sin: Math.sin,
  cos: Math.cos,
  clamp: (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
  },
};

/**
 * Minimal Roblox `string` library mock.
 * Covers string.format / string.lower / string.upper etc.
 */
export const luaString = {
  format: (fmt: string, ...args: unknown[]): string => {
    // Very simplified sprintf — handles %d, %f, %s, %x, and %.Nf
    let i = 0;
    return fmt.replace(/%([+-]?\d*\.?\d*[dfsxXeEgGqo%])/g, (match) => {
      if (match === "%%") return "%";
      const arg = args[i++];
      const spec = match.slice(-1);
      if (spec === "d" || spec === "x" || spec === "X" || spec === "o") {
        const n = Number(arg);
        if (spec === "x") return Math.floor(n).toString(16);
        if (spec === "X") return Math.floor(n).toString(16).toUpperCase();
        if (spec === "o") return Math.floor(n).toString(8);
        return String(Math.floor(n));
      }
      if (spec === "f" || spec === "e" || spec === "E" || spec === "g" || spec === "G") {
        const n = Number(arg);
        const precMatch = match.match(/\.(\d+)/);
        const prec = precMatch ? Number(precMatch[1]) : 6;
        return n.toFixed(prec);
      }
      return String(arg);
    });
  },
  lower: (s: string) => s.toLowerCase(),
  upper: (s: string) => s.toUpperCase(),
  len: (s: string) => s.length,
  rep: (s: string, n: number) => s.repeat(n),
  sub: (s: string, i: number, j?: number) => {
    const start = i - 1;
    if (j === undefined) return s.slice(start);
    return s.slice(start, j);
  },
  byte: (s: string, i = 1) => s.charCodeAt(i - 1),
  char: (...codes: number[]) => String.fromCharCode(...codes),
  find: (s: string, pattern: string) => {
    const idx = s.indexOf(pattern);
    if (idx === -1) return [undefined];
    return [idx + 1];
  },
  match: (s: string, pattern: string) => {
    const m = s.match(pattern);
    return m ? m[0] : undefined;
  },
};

/**
 * Install Roblox globals on the global object for tests.
 * Call this in beforeAll() or at the top of test files.
 */
export function mockRobloxGlobals(): void {
  const g = globalThis as any;

  // Polyfill roblox-ts array .size() → .length
  const proto = Array.prototype as any;
  if (!proto.size) {
    proto.size = function (this: unknown[]) {
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
  g.string = luaString;

  // roblox-ts intrinsic: typeIs(value, typeName) → typeof value === typeName
  g.typeIs = (value: unknown, typeName: string): boolean => {
    if (typeName === "table") return typeof value === "object" && value !== null;
    if (typeName === "nil") return value === undefined || value === null;
    return typeof value === typeName;
  };

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

  // Mock Roblox task library
  g.task = {
    spawn: (fn: () => void) => {
      fn();
    },
    delay: (_seconds: number, fn: () => void) => {
      fn();
    },
    wait: (_seconds?: number) => {
      // No-op in tests
    },
    defer: (fn: () => void) => {
      fn();
    },
    cancel: () => {
      // No-op
    },
  };

  // Mock Roblox `game` global
  g.game = {
    GetService: (name: string) => {
      // Return a stub; tests that need real services should vi.doMock
      return { _service: name };
    },
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
  delete g.typeIs;
  delete g.tostring;
  delete g.tonumber;
  delete g.math;
  delete g.string;
  delete g.print;
  delete g.warn;
  delete g.pcall;
  delete g.error;
  delete g.task;
  delete g.game;
}
