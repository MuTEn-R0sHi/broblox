/**
 * @rbx/net
 * Networking utilities for the platform.
 * Compatible with roblox-ts.
 */

import { ErrorCode, ok, err, type Result } from "./types";

// Re-export types for consumers
export { ErrorCode, ok, err, type Result, type Ok, type Err } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface DoActionPayload {
  actionId: string;
  timestamp: number;
}

export interface HandshakePayload {
  protocolVersion: number;
  buildId: string;
  deviceClass: "kbm" | "gamepad" | "touch";
}

// ============================================================================
// Validation
// ============================================================================

export function validateDoActionPayload(value: unknown): Result<DoActionPayload> {
  if (typeOf(value) !== "table") {
    return err(ErrorCode.InvalidType);
  }
  
  const obj = value as Record<string, unknown>;
  
  if (typeOf(obj.actionId) !== "string") {
    return err(ErrorCode.InvalidType);
  }
  
  const actionId = obj.actionId as string;
  if (actionId.size() < 1 || actionId.size() > 50) {
    return err(ErrorCode.OutOfBounds);
  }
  
  if (typeOf(obj.timestamp) !== "number") {
    return err(ErrorCode.InvalidType);
  }
  
  return ok({
    actionId,
    timestamp: obj.timestamp as number,
  });
}

export function validateHandshakePayload(value: unknown): Result<HandshakePayload> {
  if (typeOf(value) !== "table") {
    return err(ErrorCode.InvalidType);
  }
  
  const obj = value as Record<string, unknown>;
  
  if (typeOf(obj.protocolVersion) !== "number") {
    return err(ErrorCode.InvalidType);
  }
  
  if (typeOf(obj.buildId) !== "string") {
    return err(ErrorCode.InvalidType);
  }
  
  const dc = obj.deviceClass;
  if (dc !== "kbm" && dc !== "gamepad" && dc !== "touch") {
    return err(ErrorCode.InvalidPayload);
  }
  
  return ok({
    protocolVersion: obj.protocolVersion as number,
    buildId: obj.buildId as string,
    deviceClass: dc,
  });
}

// ============================================================================
// Rate Limiting
// ============================================================================

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  check(playerId: number): Result<{ remaining: number }> {
    const key = tostring(playerId);
    const now = os.clock() * 1000;
    
    let bucket = this.buckets.get(key);
    
    if (!bucket) {
      bucket = { tokens: this.config.maxRequests, lastRefill: now };
      this.buckets.set(key, bucket);
    } else {
      const elapsed = now - bucket.lastRefill;
      const refillRate = this.config.maxRequests / this.config.windowMs;
      const tokensToAdd = elapsed * refillRate;
      bucket.tokens = math.min(this.config.maxRequests, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    if (bucket.tokens < 1) {
      return err(ErrorCode.RateLimited);
    }

    bucket.tokens -= 1;
    return ok({ remaining: math.floor(bucket.tokens) });
  }

  reset(playerId: number): void {
    this.buckets.delete(tostring(playerId));
  }
}

// ============================================================================
// Remote Registry
// ============================================================================

export const REMOTES = {
  Handshake: {
    name: "Net_Handshake",
    rateLimit: { windowMs: 60000, maxRequests: 3 },
  },
  DoAction: {
    name: "Intent_DoAction",
    rateLimit: { windowMs: 1000, maxRequests: 5 },
  },
} as const;

export type RemoteName = keyof typeof REMOTES;
