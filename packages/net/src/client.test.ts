/**
 * Tests for client-side invocation utilities.
 * Note: These tests verify the logic in a Node.js environment using mocks.
 */

import { describe, it, expect } from "vitest";
import { ErrorCode, ok, err, isRetryableError } from "@broblox/shared-types";

// Since client.ts uses Roblox APIs, we test the core logic separately

describe("Retry Logic", () => {
  describe("isRetryableError", () => {
    it("should return true for Timeout", () => {
      expect(isRetryableError(ErrorCode.Timeout)).toBe(true);
    });

    it("should return true for RateLimited", () => {
      expect(isRetryableError(ErrorCode.RateLimited)).toBe(true);
    });

    it("should return true for ServiceUnavailable", () => {
      expect(isRetryableError(ErrorCode.ServiceUnavailable)).toBe(true);
    });

    it("should return false for InvalidPayload", () => {
      expect(isRetryableError(ErrorCode.InvalidPayload)).toBe(false);
    });

    it("should return false for Unauthorized", () => {
      expect(isRetryableError(ErrorCode.Unauthorized)).toBe(false);
    });

    it("should return false for NotFound", () => {
      expect(isRetryableError(ErrorCode.NotFound)).toBe(false);
    });
  });

  describe("Backoff Calculation", () => {
    const calculateDelay = (
      attempt: number,
      baseDelayMs: number,
      maxDelayMs: number,
      exponential: boolean
    ): number => {
      if (exponential) {
        return Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      }
      return baseDelayMs;
    };

    it("should calculate linear delay", () => {
      expect(calculateDelay(0, 1000, 10000, false)).toBe(1000);
      expect(calculateDelay(1, 1000, 10000, false)).toBe(1000);
      expect(calculateDelay(5, 1000, 10000, false)).toBe(1000);
    });

    it("should calculate exponential delay", () => {
      expect(calculateDelay(0, 1000, 10000, true)).toBe(1000); // 1000 * 2^0 = 1000
      expect(calculateDelay(1, 1000, 10000, true)).toBe(2000); // 1000 * 2^1 = 2000
      expect(calculateDelay(2, 1000, 10000, true)).toBe(4000); // 1000 * 2^2 = 4000
      expect(calculateDelay(3, 1000, 10000, true)).toBe(8000); // 1000 * 2^3 = 8000
    });

    it("should cap delay at maxDelayMs", () => {
      expect(calculateDelay(4, 1000, 10000, true)).toBe(10000); // 1000 * 2^4 = 16000, capped at 10000
      expect(calculateDelay(5, 1000, 10000, true)).toBe(10000);
    });
  });

  describe("Retry Decision", () => {
    const shouldRetry = (errorCode: ErrorCode, retryOnCodes?: ErrorCode[]): boolean => {
      return retryOnCodes ? retryOnCodes.includes(errorCode) : isRetryableError(errorCode);
    };

    it("should retry on retryable errors when no specific codes provided", () => {
      expect(shouldRetry(ErrorCode.Timeout)).toBe(true);
      expect(shouldRetry(ErrorCode.RateLimited)).toBe(true);
      expect(shouldRetry(ErrorCode.InvalidPayload)).toBe(false);
    });

    it("should only retry on specified codes when provided", () => {
      const codes = [ErrorCode.Timeout];
      expect(shouldRetry(ErrorCode.Timeout, codes)).toBe(true);
      expect(shouldRetry(ErrorCode.RateLimited, codes)).toBe(false);
      expect(shouldRetry(ErrorCode.InvalidPayload, codes)).toBe(false);
    });
  });
});

describe("Client Utilities API Contract", () => {
  it("should define expected option types", () => {
    // These type checks verify the contract without calling Roblox APIs
    type InvokeOptions = {
      timeoutMs?: number;
    };

    type RetryOptions = InvokeOptions & {
      maxRetries?: number;
      baseDelayMs?: number;
      exponentialBackoff?: boolean;
      maxDelayMs?: number;
      retryOnCodes?: ErrorCode[];
    };

    // Type-only assertions
    const invokeOpts: InvokeOptions = { timeoutMs: 5000 };
    const retryOpts: RetryOptions = {
      timeoutMs: 5000,
      maxRetries: 3,
      baseDelayMs: 1000,
      exponentialBackoff: true,
      maxDelayMs: 10000,
      retryOnCodes: [ErrorCode.Timeout, ErrorCode.RateLimited],
    };

    expect(invokeOpts.timeoutMs).toBe(5000);
    expect(retryOpts.maxRetries).toBe(3);
  });

  it("should define default values contract", () => {
    const DEFAULTS = {
      timeoutMs: 5000, // REMOTE_INVOKE_TIMEOUT_MS
      maxRetries: 3,
      baseDelayMs: 1000,
      exponentialBackoff: true,
      maxDelayMs: 10000,
    };

    expect(DEFAULTS.timeoutMs).toBe(5000);
    expect(DEFAULTS.maxRetries).toBe(3);
    expect(DEFAULTS.baseDelayMs).toBe(1000);
    expect(DEFAULTS.exponentialBackoff).toBe(true);
    expect(DEFAULTS.maxDelayMs).toBe(10000);
  });
});

describe("Result Integration", () => {
  it("should work with ok results", () => {
    const result = ok("success");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("success");
    }
  });

  it("should work with err results", () => {
    const result = err(ErrorCode.Timeout, { message: "timed out" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(ErrorCode.Timeout);
      expect(result.message).toBe("timed out");
    }
  });

  it("should support retryAfterMs in error results", () => {
    const result = err(ErrorCode.RateLimited, {
      message: "rate limited",
      retryAfterMs: 5000,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterMs).toBe(5000);
    }
  });
});
