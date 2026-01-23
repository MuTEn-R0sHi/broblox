import { ErrorCode, Result, err, ok } from "@rbx/shared-types";

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
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
