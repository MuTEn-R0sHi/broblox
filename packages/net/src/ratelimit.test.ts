/**
 * Unit tests for rate limiting module.
 * Uses @broblox/testing for consistent types and mocks.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ErrorCode, MockRateLimiter, isOk, isErr } from "@broblox/testing";

describe("RateLimiter", () => {
  let limiter: MockRateLimiter;

  beforeEach(() => {
    limiter = new MockRateLimiter({
      windowMs: 1000,
      maxRequests: 5,
    });
    limiter.setMockTime(0);
  });

  describe("constructor validation", () => {
    it("throws on zero windowMs", () => {
      expect(() => new MockRateLimiter({ windowMs: 0, maxRequests: 5 })).toThrow();
    });

    it("throws on negative windowMs", () => {
      expect(() => new MockRateLimiter({ windowMs: -100, maxRequests: 5 })).toThrow();
    });

    it("throws on zero maxRequests", () => {
      expect(() => new MockRateLimiter({ windowMs: 1000, maxRequests: 0 })).toThrow();
    });

    it("throws on negative maxRequests", () => {
      expect(() => new MockRateLimiter({ windowMs: 1000, maxRequests: -1 })).toThrow();
    });
  });

  describe("basic functionality", () => {
    it("allows requests within limit", () => {
      const result = limiter.check("player1");
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.remaining).toBe(4);
      }
    });

    it("tracks remaining tokens correctly", () => {
      limiter.check("player1"); // 4 remaining
      limiter.check("player1"); // 3 remaining
      const result = limiter.check("player1"); // 2 remaining

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.remaining).toBe(2);
      }
    });

    it("blocks requests when limit exceeded", () => {
      // Exhaust all tokens
      for (let i = 0; i < 5; i++) {
        limiter.check("player1");
      }

      const result = limiter.check("player1");
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.code).toBe(ErrorCode.RateLimited);
        expect(result.retryAfterMs).toBeGreaterThan(0);
      }
    });
  });

  describe("token refill", () => {
    it("refills tokens over time", () => {
      // Exhaust all tokens
      for (let i = 0; i < 5; i++) {
        limiter.check("player1");
      }

      // Advance time by full window
      limiter.setMockTime(1000);

      const result = limiter.check("player1");
      expect(isOk(result)).toBe(true);
    });

    it("refills partially over partial window", () => {
      // Use 3 tokens
      limiter.check("player1");
      limiter.check("player1");
      limiter.check("player1");

      // Advance by half window (should refill 2.5 tokens)
      limiter.setMockTime(500);

      const result = limiter.check("player1");
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Should have ~4.5 tokens - 1 = ~3.5, floor = 3
        expect(result.value.remaining).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe("burst allowance", () => {
    it("allows burst above normal limit", () => {
      const burstLimiter = new MockRateLimiter({
        windowMs: 1000,
        maxRequests: 5,
        burstAllowance: 3,
      });
      burstLimiter.setMockTime(0);

      // Should allow 8 requests (5 + 3 burst)
      for (let i = 0; i < 8; i++) {
        const result = burstLimiter.check("player1");
        expect(isOk(result)).toBe(true);
      }

      // 9th should be blocked
      const result = burstLimiter.check("player1");
      expect(isErr(result)).toBe(true);
    });
  });

  describe("per-player isolation", () => {
    it("tracks limits separately per player", () => {
      // Exhaust player1's tokens
      for (let i = 0; i < 5; i++) {
        limiter.check("player1");
      }

      // Player2 should still have tokens
      const result = limiter.check("player2");
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.remaining).toBe(4);
      }
    });
  });

  describe("reset", () => {
    it("resets rate limit for specific player", () => {
      // Use some tokens
      limiter.check("player1");
      limiter.check("player1");

      // Reset
      limiter.reset("player1");

      // Should have full tokens again
      const result = limiter.check("player1");
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.remaining).toBe(4);
      }
    });

    it("does not affect other players on reset", () => {
      limiter.check("player1");
      limiter.check("player2");

      limiter.reset("player1");

      // Player2 should still have reduced tokens
      const result = limiter.check("player2");
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.remaining).toBe(3);
      }
    });
  });

  describe("clear", () => {
    it("clears all rate limits", () => {
      limiter.check("player1");
      limiter.check("player2");

      limiter.clear();

      // Both should have full tokens
      const result1 = limiter.check("player1");
      const result2 = limiter.check("player2");

      if (isOk(result1) && isOk(result2)) {
        expect(result1.value.remaining).toBe(4);
        expect(result2.value.remaining).toBe(4);
      }
    });
  });
});

describe("RateLimiterManager", () => {
  class RateLimiterManager {
    private limiters = new Map<string, MockRateLimiter>();
    private defaultConfig: { windowMs: number; maxRequests: number };
    private mockTime = 0;

    constructor(defaultConfig?: { windowMs: number; maxRequests: number }) {
      this.defaultConfig = defaultConfig ?? { windowMs: 1000, maxRequests: 10 };
    }

    setMockTime(ms: number): void {
      this.mockTime = ms;
      for (const limiter of this.limiters.values()) {
        limiter.setMockTime(ms);
      }
    }

    register(endpointName: string, config?: { windowMs: number; maxRequests: number }): void {
      const limiter = new MockRateLimiter(config ?? this.defaultConfig);
      limiter.setMockTime(this.mockTime);
      this.limiters.set(endpointName, limiter);
    }

    check(endpointName: string, playerId: string | number) {
      let limiter = this.limiters.get(endpointName);
      if (!limiter) {
        limiter = new MockRateLimiter(this.defaultConfig);
        limiter.setMockTime(this.mockTime);
        this.limiters.set(endpointName, limiter);
      }
      return limiter.check(playerId);
    }

    resetPlayer(playerId: string | number): void {
      for (const limiter of this.limiters.values()) {
        limiter.reset(playerId);
      }
    }
  }

  let manager: RateLimiterManager;

  beforeEach(() => {
    manager = new RateLimiterManager();
    manager.setMockTime(0);
  });

  it("tracks limits per endpoint", () => {
    manager.register("endpoint1", { windowMs: 1000, maxRequests: 2 });
    manager.register("endpoint2", { windowMs: 1000, maxRequests: 3 });

    // Exhaust endpoint1
    manager.check("endpoint1", "player1");
    manager.check("endpoint1", "player1");
    const result1 = manager.check("endpoint1", "player1");
    expect(isErr(result1)).toBe(true);

    // Endpoint2 should still have tokens
    const result2 = manager.check("endpoint2", "player1");
    expect(isOk(result2)).toBe(true);
  });

  it("auto-registers endpoints with default config", () => {
    const result = manager.check("new-endpoint", "player1");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.remaining).toBe(9); // default is 10
    }
  });

  it("resets all endpoints for a player", () => {
    manager.register("endpoint1", { windowMs: 1000, maxRequests: 5 });
    manager.register("endpoint2", { windowMs: 1000, maxRequests: 5 });

    manager.check("endpoint1", "player1");
    manager.check("endpoint2", "player1");

    manager.resetPlayer("player1");

    const result1 = manager.check("endpoint1", "player1");
    const result2 = manager.check("endpoint2", "player1");

    if (isOk(result1) && isOk(result2)) {
      expect(result1.value.remaining).toBe(4);
      expect(result2.value.remaining).toBe(4);
    }
  });
});
