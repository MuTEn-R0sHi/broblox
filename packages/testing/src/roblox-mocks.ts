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
 *
 * This is the **single source of truth** for all Roblox/roblox-ts runtime
 * polyfills.  `test-setup.ts` simply calls `mockRobloxGlobals()` — do NOT
 * add polyfills there.
 */
export function mockRobloxGlobals(): void {
  const g = globalThis as any;

  // ── Array polyfills (roblox-ts) ────────────────────────────────────────

  const arrProto = Array.prototype as any;

  // .size() → .length
  if (!arrProto.size) {
    arrProto.size = function (this: unknown[]) {
      return this.length;
    };
  }

  // .remove(index) — removes element at index
  if (!arrProto.remove) {
    arrProto.remove = function (this: unknown[], index: number) {
      return this.splice(index, 1)[0];
    };
  }

  // .clear() — empties the array
  if (!arrProto.clear) {
    arrProto.clear = function (this: unknown[]) {
      this.length = 0;
    };
  }

  // .sort() — Lua table.sort comparators return boolean (true = a before b),
  // but JS Array.sort expects a numeric comparator.
  {
    const nativeSort = Array.prototype.sort;
    arrProto.sort = function (this: unknown[], compareFn?: (...args: unknown[]) => unknown) {
      if (!compareFn) return nativeSort.call(this);
      return nativeSort.call(this, (a: unknown, b: unknown) => {
        const r = compareFn(a, b);
        if (typeof r === "boolean") {
          if (r) return -1;
          const rev = compareFn(b, a);
          if (rev) return 1;
          return 0;
        }
        return r as number;
      });
    };
  }

  // ── String polyfills (roblox-ts method-call style: s.lower()) ─────────

  const strProto = String.prototype as any;

  if (!strProto.size) {
    strProto.size = function (this: string) {
      return this.length;
    };
  }

  if (!strProto.byte) {
    strProto.byte = function (this: string, i: number) {
      return [this.charCodeAt(i - 1)];
    };
  }

  // Must override — JS String.prototype.find() has different semantics
  strProto.find = function (this: string, pattern: string) {
    const idx = this.indexOf(pattern);
    if (idx === -1) return [undefined];
    return [idx + 1]; // 1-indexed
  };

  // Must override — JS has deprecated String.prototype.sub() that wraps in <sub>
  strProto.sub = function (this: string, i: number, j?: number) {
    const start = i - 1;
    if (j === undefined) return this.slice(start);
    return this.slice(start, j);
  };

  if (!strProto.lower) {
    strProto.lower = function (this: string) {
      return this.toLowerCase();
    };
  }

  if (!strProto.upper) {
    strProto.upper = function (this: string) {
      return this.toUpperCase();
    };
  }

  // ── Lua globals ────────────────────────────────────────────────────────

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

  // pairs() — iterates key/value pairs of a table (object)
  if (!g.pairs) {
    g.pairs = function* (obj: Record<string, unknown>) {
      for (const [k, v] of Object.entries(obj)) {
        yield [k, v];
      }
    };
  }

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
    JobId: "test-job-id",
    PlaceId: 0,
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
  delete g.pairs;
  delete g.task;
  delete g.game;
}
