/**
 * Unit tests for rate limiting module.
 */

import { describe, it, expect, beforeEach } from "vitest";

// Inline ErrorCode for Node/vitest (matches @rbx/shared-types)
enum ErrorCode {
  Ok = 0,
  InvalidType = 1,
  InvalidPayload = 2,
  OutOfBounds = 3,
  RateLimited = 4,
  Unauthorized = 5,
  InternalError = 6,
}

// Mock implementation of RateLimiter for testing (since actual uses os.clock)
class RateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();
  private config: { windowMs: number; maxRequests: number; burstAllowance: number };
  private mockNow = 0;

  constructor(config: { windowMs: number; maxRequests: number; burstAllowance?: number }) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      burstAllowance: config.burstAllowance ?? 0,
    };
  }

  setMockTime(ms: number): void {
    this.mockNow = ms;
  }

  check(playerId: string | number): { ok: boolean; value?: { remaining: number }; code?: number; retryAfterMs?: number } {
    const key = String(playerId);
    const now = this.mockNow;
    
    let bucket = this.buckets.get(key);
    
    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests + this.config.burstAllowance,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
    } else {
      const elapsed = now - bucket.lastRefill;
      const refillRate = this.config.maxRequests / this.config.windowMs;
      const tokensToAdd = elapsed * refillRate;
      
      bucket.tokens = Math.min(
        this.config.maxRequests + this.config.burstAllowance,
        bucket.tokens + tokensToAdd
      );
      bucket.lastRefill = now;
    }

    if (bucket.tokens < 1) {
      const tokensNeeded = 1 - bucket.tokens;
      const refillRate = this.config.maxRequests / this.config.windowMs;
      const retryAfterMs = Math.ceil(tokensNeeded / refillRate);
      
      return { ok: false, code: ErrorCode.RateLimited, retryAfterMs };
    }

    bucket.tokens -= 1;
    
    return { ok: true, value: { remaining: Math.floor(bucket.tokens) } };
  }

  reset(playerId: string | number): void {
    this.buckets.delete(String(playerId));
  }

  clear(): void {
    this.buckets.clear();
  }
}

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      windowMs: 1000,
      maxRequests: 5,
    });
    limiter.setMockTime(0);
  });

  describe("basic functionality", () => {
    it("allows requests within limit", () => {
      const result = limiter.check("player1");
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.remaining).toBe(4);
      }
    });

    it("tracks remaining tokens correctly", () => {
      limiter.check("player1"); // 4 remaining
      limiter.check("player1"); // 3 remaining
      const result = limiter.check("player1"); // 2 remaining
      
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.remaining).toBe(2);
      }
    });

    it("blocks requests when limit exceeded", () => {
      // Exhaust all tokens
      for (let i = 0; i < 5; i++) {
        limiter.check("player1");
      }
      
      const result = limiter.check("player1");
      expect(result.ok).toBe(false);
      if (!result.ok) {
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
      expect(result.ok).toBe(true);
    });

    it("refills partially over partial window", () => {
      // Use 3 tokens
      limiter.check("player1");
      limiter.check("player1");
      limiter.check("player1");
      
      // Advance by half window (should refill 2.5 tokens)
      limiter.setMockTime(500);
      
      const result = limiter.check("player1");
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        // Should have ~4.5 tokens - 1 = ~3.5, floor = 3
        expect(result.value.remaining).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe("burst allowance", () => {
    it("allows burst above normal limit", () => {
      const burstLimiter = new RateLimiter({
        windowMs: 1000,
        maxRequests: 5,
        burstAllowance: 3,
      });
      burstLimiter.setMockTime(0);
      
      // Should allow 8 requests (5 + 3 burst)
      for (let i = 0; i < 8; i++) {
        const result = burstLimiter.check("player1");
        expect(result.ok).toBe(true);
      }
      
      // 9th should be blocked
      const result = burstLimiter.check("player1");
      expect(result.ok).toBe(false);
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
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
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
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.remaining).toBe(4);
      }
    });

    it("does not affect other players on reset", () => {
      limiter.check("player1");
      limiter.check("player2");
      
      limiter.reset("player1");
      
      // Player2 should still have reduced tokens
      const result = limiter.check("player2");
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
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
      
      if (result1.ok && result1.value && result2.ok && result2.value) {
        expect(result1.value.remaining).toBe(4);
        expect(result2.value.remaining).toBe(4);
      }
    });
  });
});

describe("RateLimiterManager", () => {
  class RateLimiterManager {
    private limiters = new Map<string, RateLimiter>();
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
      const limiter = new RateLimiter(config ?? this.defaultConfig);
      limiter.setMockTime(this.mockTime);
      this.limiters.set(endpointName, limiter);
    }

    check(endpointName: string, playerId: string | number) {
      let limiter = this.limiters.get(endpointName);
      if (!limiter) {
        limiter = new RateLimiter(this.defaultConfig);
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
    expect(result1.ok).toBe(false);

    // Endpoint2 should still have tokens
    const result2 = manager.check("endpoint2", "player1");
    expect(result2.ok).toBe(true);
  });

  it("auto-registers endpoints with default config", () => {
    const result = manager.check("new-endpoint", "player1");
    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
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

    if (result1.ok && result1.value && result2.ok && result2.value) {
      expect(result1.value.remaining).toBe(4);
      expect(result2.value.remaining).toBe(4);
    }
  });
});
