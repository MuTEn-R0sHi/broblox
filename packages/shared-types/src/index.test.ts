/**
 * Unit tests for shared-types package.
 */

import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  mapResult,
  ErrorCode,
  PROTOCOL_VERSION,
  createPlayerId,
  createMatchId,
  createSessionId,
} from "../src/index";

describe("Result type", () => {
  describe("ok()", () => {
    it("creates a success result", () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it("creates a success result with object value", () => {
      const result = ok({ name: "test" });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ name: "test" });
    });

    it("creates a success result with undefined value", () => {
      const result = ok(undefined);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(undefined);
    });
  });

  describe("err()", () => {
    it("creates an error result with code only", () => {
      const result = err(ErrorCode.InvalidPayload);
      expect(result.ok).toBe(false);
      expect(result.code).toBe(ErrorCode.InvalidPayload);
    });

    it("creates an error result with context", () => {
      const result = err(ErrorCode.RateLimited, { retryAfterMs: 1000 });
      expect(result.ok).toBe(false);
      expect(result.code).toBe(ErrorCode.RateLimited);
      expect(result.retryAfterMs).toBe(1000);
    });
  });

  describe("isOk()", () => {
    it("returns true for success result", () => {
      expect(isOk(ok(42))).toBe(true);
    });

    it("returns false for error result", () => {
      expect(isOk(err(ErrorCode.NotFound))).toBe(false);
    });
  });

  describe("isErr()", () => {
    it("returns true for error result", () => {
      expect(isErr(err(ErrorCode.NotFound))).toBe(true);
    });

    it("returns false for success result", () => {
      expect(isErr(ok(42))).toBe(false);
    });
  });

  describe("unwrap()", () => {
    it("returns value for success result", () => {
      expect(unwrap(ok(42))).toBe(42);
    });

    it("throws for error result", () => {
      expect(() => unwrap(err(ErrorCode.NotFound))).toThrow();
    });
  });

  describe("unwrapOr()", () => {
    it("returns value for success result", () => {
      expect(unwrapOr(ok(42), 0)).toBe(42);
    });

    it("returns default for error result", () => {
      expect(unwrapOr(err(ErrorCode.NotFound), 0)).toBe(0);
    });
  });

  describe("mapResult()", () => {
    it("maps success value", () => {
      const result = mapResult(ok(2), (x) => x * 2);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(4);
      }
    });

    it("passes through error", () => {
      const result = mapResult(err(ErrorCode.NotFound), (x: number) => x * 2);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.NotFound);
      }
    });
  });
});

describe("ErrorCode", () => {
  it("has validation errors in 1xxx range", () => {
    expect(ErrorCode.InvalidPayload).toBeGreaterThanOrEqual(1000);
    expect(ErrorCode.InvalidPayload).toBeLessThan(2000);
  });

  it("has business logic errors in 2xxx range", () => {
    expect(ErrorCode.RateLimited).toBeGreaterThanOrEqual(2000);
    expect(ErrorCode.RateLimited).toBeLessThan(3000);
  });

  it("has protocol errors in 3xxx range", () => {
    expect(ErrorCode.ProtocolMismatch).toBeGreaterThanOrEqual(3000);
    expect(ErrorCode.ProtocolMismatch).toBeLessThan(4000);
  });

  it("has auth errors in 4xxx range", () => {
    expect(ErrorCode.Unauthorized).toBeGreaterThanOrEqual(4000);
    expect(ErrorCode.Unauthorized).toBeLessThan(5000);
  });

  it("has internal errors in 5xxx range", () => {
    expect(ErrorCode.InternalError).toBeGreaterThanOrEqual(5000);
    expect(ErrorCode.InternalError).toBeLessThan(6000);
  });
});

describe("Branded IDs", () => {
  it("creates valid PlayerId", () => {
    const id = createPlayerId(12345);
    expect(id).toBe(12345);
  });

  it("creates valid MatchId", () => {
    const id = createMatchId("match-123");
    expect(id).toBe("match-123");
  });

  it("creates valid SessionId", () => {
    const id = createSessionId("session-abc");
    expect(id).toBe("session-abc");
  });
});

describe("Protocol Version", () => {
  it("is defined and positive", () => {
    expect(PROTOCOL_VERSION).toBeDefined();
    expect(PROTOCOL_VERSION).toBeGreaterThan(0);
  });
});
