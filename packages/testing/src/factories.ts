/**
 * Test data factories for creating consistent test fixtures.
 */

import { ErrorCode, PROTOCOL_VERSION } from "./error-codes";
import { ok, err, type Result } from "./result";

// ============================================================================
// Branded ID Types (Mirrors @rbx/shared-types for Node.js testing)
// ============================================================================

/** Branded type for Player IDs */
export type PlayerId = number & { readonly __brand: "PlayerId" };

/** Branded type for Match IDs */
export type MatchId = string & { readonly __brand: "MatchId" };

/** Branded type for Session IDs */
export type SessionId = string & { readonly __brand: "SessionId" };

/**
 * Create a branded PlayerId from a number.
 */
export function createPlayerId(id: number): PlayerId {
  return id as PlayerId;
}

/**
 * Create a branded MatchId from a string.
 */
export function createMatchId(id: string): MatchId {
  return id as MatchId;
}

/**
 * Create a branded SessionId from a string.
 */
export function createSessionId(id: string): SessionId {
  return id as SessionId;
}

// ============================================================================
// Rate Limiter Mock
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  burstAllowance?: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Mock RateLimiter that uses controllable time for testing.
 * Mirrors the API of @rbx/net RateLimiter.
 */
export class MockRateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private config: Required<RateLimitConfig>;
  private mockNow = 0;

  constructor(config: RateLimitConfig) {
    if (config.windowMs <= 0) {
      throw new Error("RateLimiter: windowMs must be > 0");
    }
    if (config.maxRequests <= 0) {
      throw new Error("RateLimiter: maxRequests must be > 0");
    }
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      burstAllowance: config.burstAllowance ?? 0,
    };
  }

  /**
   * Set the mock time in milliseconds.
   */
  setMockTime(ms: number): void {
    this.mockNow = ms;
  }

  /**
   * Advance mock time by specified milliseconds.
   */
  advanceTime(ms: number): void {
    this.mockNow += ms;
  }

  /**
   * Check if a request is allowed for the given player.
   */
  check(playerId: string | number): Result<{ remaining: number }> {
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

      return err(ErrorCode.RateLimited, { retryAfterMs });
    }

    bucket.tokens -= 1;

    return ok({ remaining: Math.floor(bucket.tokens) });
  }

  /**
   * Reset rate limit for a specific player.
   */
  reset(playerId: string | number): void {
    this.buckets.delete(String(playerId));
  }

  /**
   * Clear all rate limit buckets.
   */
  clear(): void {
    this.buckets.clear();
  }
}

// ============================================================================
// Payload Factories
// ============================================================================

export interface DoActionPayload {
  actionId: string;
  timestamp: number;
}

export interface HandshakePayload {
  protocolVersion: number;
  buildId: string;
  deviceClass: "kbm" | "gamepad" | "touch";
}

export interface HandshakeResponse {
  serverProtocolVersion: number;
  serverTime: number;
  sessionId: string;
}

/**
 * Create a valid DoAction payload for testing.
 */
export function createDoActionPayload(overrides?: Partial<DoActionPayload>): DoActionPayload {
  return {
    actionId: "test-action",
    timestamp: Date.now(),
    ...overrides,
  };
}

/**
 * Create a valid Handshake payload for testing.
 */
export function createHandshakePayload(overrides?: Partial<HandshakePayload>): HandshakePayload {
  return {
    protocolVersion: PROTOCOL_VERSION,
    buildId: "test-build-0.0.0",
    deviceClass: "kbm",
    ...overrides,
  };
}

/**
 * Create a valid Handshake response for testing.
 */
export function createHandshakeResponse(overrides?: Partial<HandshakeResponse>): HandshakeResponse {
  return {
    serverProtocolVersion: PROTOCOL_VERSION,
    serverTime: Math.floor(Date.now() / 1000),
    sessionId: `test-session-${Date.now()}`,
    ...overrides,
  };
}

// ============================================================================
// Mock Player
// ============================================================================

export interface MockPlayer {
  UserId: number;
  Name: string;
  DisplayName: string;
}

let playerIdCounter = 1;

/**
 * Create a mock Player object for testing.
 */
export function createMockPlayer(overrides?: Partial<MockPlayer>): MockPlayer {
  const id = playerIdCounter++;
  return {
    UserId: id,
    Name: `Player${id}`,
    DisplayName: `Player ${id}`,
    ...overrides,
  };
}

/**
 * Reset the player ID counter (call in beforeEach if needed).
 */
export function resetPlayerIdCounter(): void {
  playerIdCounter = 1;
}

// ============================================================================
// Result Factories
// ============================================================================

export interface ActionResultData {
  effectApplied: boolean;
  serverTime?: number;
}

/**
 * Create a success result for action responses.
 */
export function createActionResult(data?: Partial<ActionResultData>): Result<ActionResultData> {
  return ok({
    effectApplied: true,
    serverTime: Math.floor(Date.now() / 1000),
    ...data,
  });
}

/**
 * Create an error result for testing.
 */
export function createErrorResult(
  code: ErrorCode,
  message?: string,
  options?: { retryAfterMs?: number; field?: string }
): Result<never> {
  return err(code, {
    message,
    ...options,
  });
}
