import { ErrorCode, Result, err, ok } from "@broblox/shared-types";

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  burstAllowance?: number;
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
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    if (config.windowMs <= 0) {
      error("RateLimiter: windowMs must be > 0");
    }
    if (config.maxRequests <= 0) {
      error("RateLimiter: maxRequests must be > 0");
    }
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      burstAllowance: config.burstAllowance ?? 0,
    };
  }

  check(playerId: number): Result<{ remaining: number }> {
    const key = tostring(playerId);
    const now = os.clock() * 1000;

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
      bucket.tokens = math.min(
        this.config.maxRequests + this.config.burstAllowance,
        bucket.tokens + tokensToAdd
      );
      bucket.lastRefill = now;
    }

    if (bucket.tokens < 1) {
      const tokensNeeded = 1 - bucket.tokens;
      const refillRate = this.config.maxRequests / this.config.windowMs;
      const retryAfterMs = math.ceil(tokensNeeded / refillRate);
      return err(ErrorCode.RateLimited, { retryAfterMs });
    }

    bucket.tokens -= 1;
    return ok({ remaining: math.floor(bucket.tokens) });
  }

  reset(playerId: number): void {
    this.buckets.delete(tostring(playerId));
  }
}
