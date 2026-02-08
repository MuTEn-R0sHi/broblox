import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mockRobloxGlobals,
  unmockRobloxGlobals,
  osClock,
  osTime,
  resetMockClock,
  setMockClock,
  typeOf,
  tostring,
  tonumber,
  math,
  luaString,
} from "./roblox-mocks";
import {
  MockRateLimiter,
  createDoActionPayload,
  createHandshakePayload,
  createHandshakeResponse,
  createMockPlayer,
  resetPlayerIdCounter,
  createActionResult,
  createErrorResult,
} from "./factories";
import { t } from "./t-mock";
import { ErrorCode, isOk, isErr } from "@rbx/shared-types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================================================
// roblox-mocks.ts — standalone functions
// ============================================================================

describe("osClock", () => {
  it("returns a positive number", () => {
    expect(osClock()).toBeGreaterThan(0);
  });

  it("returns roughly 60s offset by default", () => {
    const c = osClock();
    // Default CLOCK_OFFSET is 60 — allow 1s tolerance
    expect(c).toBeGreaterThanOrEqual(59);
    expect(c).toBeLessThan(62);
  });

  it("resetMockClock sets clock near zero", () => {
    resetMockClock();
    expect(osClock()).toBeLessThan(1);
  });

  it("setMockClock pins the clock value", () => {
    setMockClock(120);
    const c = osClock();
    expect(c).toBeGreaterThanOrEqual(119);
    expect(c).toBeLessThan(122);
  });
});

describe("osTime", () => {
  it("returns current unix timestamp (seconds)", () => {
    const now = Math.floor(Date.now() / 1000);
    const t = osTime();
    expect(t).toBeGreaterThanOrEqual(now - 1);
    expect(t).toBeLessThanOrEqual(now + 1);
  });
});

describe("typeOf", () => {
  it("returns 'nil' for null and undefined", () => {
    expect(typeOf(null)).toBe("nil");
    expect(typeOf(undefined)).toBe("nil");
  });

  it("returns 'table' for arrays", () => {
    expect(typeOf([])).toBe("table");
    expect(typeOf([1, 2])).toBe("table");
  });

  it("returns 'table' for objects", () => {
    expect(typeOf({})).toBe("table");
    expect(typeOf({ a: 1 })).toBe("table");
  });

  it("returns 'number' for numbers", () => {
    expect(typeOf(42)).toBe("number");
    expect(typeOf(0)).toBe("number");
  });

  it("returns 'string' for strings", () => {
    expect(typeOf("hello")).toBe("string");
    expect(typeOf("")).toBe("string");
  });

  it("returns 'boolean' for booleans", () => {
    expect(typeOf(true)).toBe("boolean");
    expect(typeOf(false)).toBe("boolean");
  });

  it("returns 'function' for functions", () => {
    expect(typeOf(() => {})).toBe("function");
  });
});

describe("tostring", () => {
  it("converts various types to strings", () => {
    expect(tostring(42)).toBe("42");
    expect(tostring(true)).toBe("true");
    expect(tostring(null)).toBe("null");
    expect(tostring(undefined)).toBe("undefined");
    expect(tostring("hi")).toBe("hi");
  });
});

describe("tonumber", () => {
  it("converts strings to numbers", () => {
    expect(tonumber("42")).toBe(42);
    expect(tonumber("3.14")).toBeCloseTo(3.14);
  });

  it("returns undefined for non-numeric strings", () => {
    expect(tonumber("abc")).toBeUndefined();
  });

  it("supports base parameter", () => {
    expect(tonumber("FF", 16)).toBe(255);
    expect(tonumber("77", 8)).toBe(63);
    expect(tonumber("1010", 2)).toBe(10);
  });

  it("returns undefined for invalid values with base", () => {
    expect(tonumber("ZZ", 16)).toBeUndefined();
  });
});

describe("math mock", () => {
  it("delegates basic math to JS Math", () => {
    expect(math.min(1, 2, 3)).toBe(1);
    expect(math.max(1, 2, 3)).toBe(3);
    expect(math.floor(2.7)).toBe(2);
    expect(math.ceil(2.3)).toBe(3);
    expect(math.abs(-5)).toBe(5);
    expect(math.sqrt(9)).toBe(3);
  });

  it("exposes huge and pi", () => {
    expect(math.huge).toBe(Infinity);
    expect(math.pi).toBe(Math.PI);
  });

  it("math.clamp constrains values", () => {
    expect(math.clamp(5, 0, 10)).toBe(5);
    expect(math.clamp(-1, 0, 10)).toBe(0);
    expect(math.clamp(15, 0, 10)).toBe(10);
  });

  it("math.random() returns a number in [0,1) with no args", () => {
    const r = math.random();
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(1);
  });

  it("math.random(n) returns integer in [1,n]", () => {
    const r = math.random(1);
    expect(r).toBe(1);
  });

  it("math.random(a,b) returns integer in [a,b]", () => {
    const r = math.random(5, 5);
    expect(r).toBe(5);
  });
});

describe("luaString mock", () => {
  it("format handles %d", () => {
    expect(luaString.format("score: %d", 100)).toBe("score: 100");
  });

  it("format handles %s", () => {
    expect(luaString.format("hello %s", "world")).toBe("hello world");
  });

  it("format handles %f with precision", () => {
    expect(luaString.format("%.2f", 3.14159)).toBe("3.14");
  });

  it("format handles %x hex", () => {
    expect(luaString.format("%x", 255)).toBe("ff");
  });

  it("format handles %%", () => {
    expect(luaString.format("100%%")).toBe("100%");
  });

  it("lower / upper", () => {
    expect(luaString.lower("Hello")).toBe("hello");
    expect(luaString.upper("Hello")).toBe("HELLO");
  });

  it("len", () => {
    expect(luaString.len("hello")).toBe(5);
  });

  it("rep", () => {
    expect(luaString.rep("ab", 3)).toBe("ababab");
  });

  it("sub (1-indexed)", () => {
    expect(luaString.sub("abcdef", 2, 4)).toBe("bcd");
    expect(luaString.sub("abcdef", 3)).toBe("cdef");
  });

  it("byte (1-indexed)", () => {
    expect(luaString.byte("A")).toBe(65);
  });

  it("char", () => {
    expect(luaString.char(65, 66)).toBe("AB");
  });

  it("find returns 1-indexed position", () => {
    expect(luaString.find("hello world", "world")).toEqual([7]);
    expect(luaString.find("hello", "xyz")).toEqual([undefined]);
  });

  it("match returns first match or undefined", () => {
    expect(luaString.match("hello123", "\\d+")).toBe("123");
    expect(luaString.match("hello", "\\d+")).toBeUndefined();
  });
});

// ============================================================================
// roblox-mocks.ts — mockRobloxGlobals / unmockRobloxGlobals
// ============================================================================

describe("mockRobloxGlobals / unmockRobloxGlobals", () => {
  beforeEach(() => {
    // Globals are already set by test-setup, but we re-apply to be explicit
    mockRobloxGlobals();
  });

  afterEach(() => {
    // Re-apply so other tests are not affected
    mockRobloxGlobals();
  });

  it("installs os.clock and os.time", () => {
    const g = globalThis as any;
    expect(typeof g.os.clock).toBe("function");
    expect(typeof g.os.time).toBe("function");
    expect(g.os.clock()).toBeGreaterThan(0);
  });

  it("installs typeOf, tostring, tonumber", () => {
    const g = globalThis as any;
    expect(g.typeOf(42)).toBe("number");
    expect(g.tostring(42)).toBe("42");
    expect(g.tonumber("42")).toBe(42);
  });

  it("installs typeIs", () => {
    const g = globalThis as any;
    expect(g.typeIs("hi", "string")).toBe(true);
    expect(g.typeIs({}, "table")).toBe(true);
    expect(g.typeIs(null, "nil")).toBe(true);
    expect(g.typeIs(5, "string")).toBe(false);
  });

  it("installs pcall that wraps success", () => {
    const g = globalThis as any;
    const [success, value] = g.pcall(() => 42);
    expect(success).toBe(true);
    expect(value).toBe(42);
  });

  it("installs pcall that wraps errors", () => {
    const g = globalThis as any;
    const [success, message] = g.pcall(() => {
      throw new Error("boom");
    });
    expect(success).toBe(false);
    expect(message).toContain("boom");
  });

  it("installs pcall that passes extra arguments", () => {
    const g = globalThis as any;
    const [success, value] = g.pcall((a: number, b: number) => a + b, 3, 4);
    expect(success).toBe(true);
    expect(value).toBe(7);
  });

  it("installs task.spawn (synchronous for tests)", () => {
    const g = globalThis as any;
    let called = false;
    g.task.spawn(() => {
      called = true;
    });
    expect(called).toBe(true);
  });

  it("installs task.delay (synchronous for tests)", () => {
    const g = globalThis as any;
    let called = false;
    g.task.delay(5, () => {
      called = true;
    });
    expect(called).toBe(true);
  });

  it("installs task.defer (synchronous for tests)", () => {
    const g = globalThis as any;
    let called = false;
    g.task.defer(() => {
      called = true;
    });
    expect(called).toBe(true);
  });

  it("installs game.GetService stub", () => {
    const g = globalThis as any;
    const svc = g.game.GetService("Players");
    expect(svc).toEqual({ _service: "Players" });
  });

  it("installs game.JobId and PlaceId", () => {
    const g = globalThis as any;
    expect(g.game.JobId).toBe("test-job-id");
    expect(g.game.PlaceId).toBe(0);
  });

  it("installs error() that throws", () => {
    const g = globalThis as any;
    expect(() => g.error("test error")).toThrow("test error");
  });

  it("installs print and warn", () => {
    const g = globalThis as any;
    expect(typeof g.print).toBe("function");
    expect(typeof g.warn).toBe("function");
  });

  it("installs Array polyfills: size, remove, clear", () => {
    const arr = [1, 2, 3] as any;
    expect(arr.size()).toBe(3);

    const removed = arr.remove(1);
    expect(removed).toBe(2);
    expect(arr).toEqual([1, 3]);

    arr.clear();
    expect(arr).toEqual([]);
  });

  it("installs Array sort with boolean comparator (Lua-style)", () => {
    const arr = [3, 1, 2];
    (arr as any).sort((a: number, b: number) => a < b);
    expect(arr).toEqual([1, 2, 3]);
  });

  it("installs String polyfills: size, lower, upper", () => {
    const s = "Hello" as any;
    expect(s.size()).toBe(5);
    expect(s.lower()).toBe("hello");
    expect(s.upper()).toBe("HELLO");
  });

  it("installs String.find (1-indexed)", () => {
    const result = ("hello world" as any).find("world");
    expect(result).toEqual([7]);
  });

  it("installs String.sub (1-indexed)", () => {
    const result = ("abcdef" as any).sub(2, 4);
    expect(result).toBe("bcd");
  });

  it("unmockRobloxGlobals removes all globals", () => {
    unmockRobloxGlobals();
    const g = globalThis as any;
    expect(g.typeOf).toBeUndefined();
    expect(g.tostring).toBeUndefined();
    expect(g.tonumber).toBeUndefined();
    expect(g.pcall).toBeUndefined();
    expect(g.task).toBeUndefined();
    expect(g.game).toBeUndefined();
    expect(g.os).toBeUndefined();
    expect(g.math).toBeUndefined();
    expect(g.string).toBeUndefined();
    expect(g.print).toBeUndefined();
    expect(g.warn).toBeUndefined();
    expect(g.error).toBeUndefined();
    expect(g.typeIs).toBeUndefined();
    expect(g.pairs).toBeUndefined();
  });
});

// ============================================================================
// factories.ts — MockRateLimiter
// ============================================================================

describe("MockRateLimiter", () => {
  let limiter: MockRateLimiter;

  beforeEach(() => {
    limiter = new MockRateLimiter({
      windowMs: 1000,
      maxRequests: 5,
    });
    limiter.setMockTime(0);
  });

  it("allows requests up to maxRequests", () => {
    for (let i = 0; i < 5; i++) {
      const result = limiter.check("player1");
      expect(isOk(result)).toBe(true);
    }
  });

  it("rejects requests beyond maxRequests", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("player1");
    }
    const result = limiter.check("player1");
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.code).toBe(ErrorCode.RateLimited);
    }
  });

  it("returns remaining token count", () => {
    const result = limiter.check("player1");
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.remaining).toBe(4);
    }
  });

  it("refills tokens after enough time passes", () => {
    // Use all tokens
    for (let i = 0; i < 5; i++) {
      limiter.check("player1");
    }
    expect(isErr(limiter.check("player1"))).toBe(true);

    // Advance full window
    limiter.advanceTime(1000);
    const result = limiter.check("player1");
    expect(isOk(result)).toBe(true);
  });

  it("partial refill after partial time", () => {
    // Use all tokens
    for (let i = 0; i < 5; i++) {
      limiter.check("player1");
    }

    // Advance half the window → refill 2.5 → 2 usable whole tokens
    limiter.advanceTime(500);
    const r1 = limiter.check("player1");
    expect(isOk(r1)).toBe(true);

    const r2 = limiter.check("player1");
    expect(isOk(r2)).toBe(true);
  });

  it("supports burstAllowance", () => {
    const bursty = new MockRateLimiter({
      windowMs: 1000,
      maxRequests: 3,
      burstAllowance: 2,
    });
    bursty.setMockTime(0);

    // 3 + 2 = 5 requests allowed
    for (let i = 0; i < 5; i++) {
      expect(isOk(bursty.check("p1"))).toBe(true);
    }
    expect(isErr(bursty.check("p1"))).toBe(true);
  });

  it("tracks players independently", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("player1");
    }
    // player2 should have fresh tokens
    const result = limiter.check("player2");
    expect(isOk(result)).toBe(true);
  });

  it("reset clears a specific player's bucket", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("player1");
    }
    expect(isErr(limiter.check("player1"))).toBe(true);

    limiter.reset("player1");
    expect(isOk(limiter.check("player1"))).toBe(true);
  });

  it("clear removes all buckets", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("player1");
    }
    limiter.clear();
    expect(isOk(limiter.check("player1"))).toBe(true);
  });

  it("error result includes retryAfterMs", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("player1");
    }
    const result = limiter.check("player1");
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// factories.ts — Payload & Mock factories
// ============================================================================

describe("createDoActionPayload", () => {
  it("creates a valid default payload", () => {
    const payload = createDoActionPayload();
    expect(payload.actionId).toBe("test-action");
    expect(payload.timestamp).toBeGreaterThan(0);
  });

  it("applies overrides", () => {
    const payload = createDoActionPayload({ actionId: "attack" });
    expect(payload.actionId).toBe("attack");
  });
});

describe("createHandshakePayload", () => {
  it("creates a valid default payload", () => {
    const payload = createHandshakePayload();
    expect(payload.protocolVersion).toBe(1);
    expect(payload.buildId).toBe("test-build-0.0.0");
    expect(payload.deviceClass).toBe("kbm");
  });

  it("applies overrides", () => {
    const payload = createHandshakePayload({ deviceClass: "touch" });
    expect(payload.deviceClass).toBe("touch");
  });
});

describe("createHandshakeResponse", () => {
  it("creates a valid default response", () => {
    const response = createHandshakeResponse();
    expect(response.serverVersion).toBe(1);
    expect(response.serverTime).toBeGreaterThan(0);
  });

  it("applies overrides", () => {
    const response = createHandshakeResponse({ serverTime: 12345 });
    expect(response.serverTime).toBe(12345);
  });
});

describe("createMockPlayer", () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  it("creates a player with incrementing IDs", () => {
    const p1 = createMockPlayer();
    const p2 = createMockPlayer();
    expect(p1.UserId).toBe(1);
    expect(p2.UserId).toBe(2);
    expect(p1.Name).toBe("Player1");
    expect(p2.Name).toBe("Player2");
  });

  it("applies overrides", () => {
    const p = createMockPlayer({ Name: "Bob", DisplayName: "Bobby" });
    expect(p.Name).toBe("Bob");
    expect(p.DisplayName).toBe("Bobby");
  });

  it("resetPlayerIdCounter resets to 1", () => {
    createMockPlayer();
    createMockPlayer();
    resetPlayerIdCounter();
    const p = createMockPlayer();
    expect(p.UserId).toBe(1);
  });
});

describe("createActionResult", () => {
  it("creates a success result", () => {
    const result = createActionResult();
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value.effectApplied).toBe(true);
      expect(result.value.serverTime).toBeGreaterThan(0);
    }
  });

  it("applies partial overrides", () => {
    const result = createActionResult({ effectApplied: false });
    if (result.ok) {
      expect(result.value.effectApplied).toBe(false);
    }
  });
});

describe("createErrorResult", () => {
  it("creates an error result with code", () => {
    const result = createErrorResult(ErrorCode.InvalidPayload);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.code).toBe(ErrorCode.InvalidPayload);
    }
  });

  it("includes message and retryAfterMs", () => {
    const result = createErrorResult(ErrorCode.RateLimited, "slow down", {
      retryAfterMs: 5000,
    });
    if (!result.ok) {
      expect(result.message).toBe("slow down");
      expect(result.retryAfterMs).toBe(5000);
    }
  });
});

// ============================================================================
// t-mock.ts — Schema validator mock
// ============================================================================

describe("t-mock", () => {
  it("t.string validates strings", () => {
    expect(t.string("hello")).toBe(true);
    expect(t.string(42)).toBe(false);
  });

  it("t.number validates numbers", () => {
    expect(t.number(42)).toBe(true);
    expect(t.number("42")).toBe(false);
  });

  it("t.literal matches exact values", () => {
    const isA = t.literal("a");
    expect(isA("a")).toBe(true);
    expect(isA("b")).toBe(false);
  });

  it("t.union matches any validator", () => {
    const isStringOrNumber = t.union(t.string, t.number);
    expect(isStringOrNumber("hi")).toBe(true);
    expect(isStringOrNumber(42)).toBe(true);
    expect(isStringOrNumber(true)).toBe(false);
  });

  it("t.strictInterface validates object shapes", () => {
    const validator = t.strictInterface({
      name: t.string,
      age: t.number,
    });

    expect(validator({ name: "Alice", age: 30 })).toBe(true);
    expect(validator({ name: "Alice", age: "thirty" })).toBe(false);
    expect(validator(null)).toBe(false);
    expect(validator(42)).toBe(false);
  });
});
