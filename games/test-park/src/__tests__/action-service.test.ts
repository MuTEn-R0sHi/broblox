/**
 * Action Service Tests
 *
 * Unit tests for the pure validateActionRequest function.
 * Tests the actual production logic (not an inline reimplementation).
 */

import { describe, it, expect } from "vitest";
import { validateActionRequest } from "../shared/action-validation";

// Use a fixed tolerance value matching @broblox/constants TIMESTAMP_TOLERANCE_MS
const TIMESTAMP_TOLERANCE_MS = 5000;

const baseRequest = { actionId: "jump", timestamp: 1000 };
const baseDeps = {
  nowMs: 1000,
  timestampToleranceMs: TIMESTAMP_TOLERANCE_MS,
  isActionEnabled: true,
};

describe("validateActionRequest", () => {
  describe("feature flag check", () => {
    it("returns ok when feature is enabled", () => {
      const result = validateActionRequest(baseRequest, baseDeps);
      expect(result.ok).toBe(true);
    });

    it("returns feature_disabled when flag is off", () => {
      const result = validateActionRequest(baseRequest, { ...baseDeps, isActionEnabled: false });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("feature_disabled");
      }
    });

    it("feature_disabled short-circuits before timestamp check", () => {
      // Even an invalid timestamp should not change the reason when flag is off
      const result = validateActionRequest(
        { actionId: "jump", timestamp: -999 },
        { ...baseDeps, isActionEnabled: false }
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("feature_disabled");
      }
    });
  });

  describe("timestamp validation", () => {
    it("rejects negative timestamps", () => {
      const result = validateActionRequest({ ...baseRequest, timestamp: -1 }, baseDeps);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("invalid_timestamp");
    });

    it("rejects timestamps beyond nowMs + tolerance", () => {
      const result = validateActionRequest(
        { ...baseRequest, timestamp: baseDeps.nowMs + TIMESTAMP_TOLERANCE_MS + 1 },
        baseDeps
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("invalid_timestamp");
    });

    it("accepts timestamp exactly at nowMs + tolerance boundary", () => {
      const result = validateActionRequest(
        { ...baseRequest, timestamp: baseDeps.nowMs + TIMESTAMP_TOLERANCE_MS },
        baseDeps
      );
      expect(result.ok).toBe(true);
    });

    it("accepts timestamp of zero (epoch start)", () => {
      const result = validateActionRequest({ ...baseRequest, timestamp: 0 }, baseDeps);
      expect(result.ok).toBe(true);
    });

    it("accepts a recent past timestamp", () => {
      const result = validateActionRequest(
        { ...baseRequest, timestamp: baseDeps.nowMs - 500 },
        baseDeps
      );
      expect(result.ok).toBe(true);
    });

    it("accepts timestamp equal to nowMs", () => {
      const result = validateActionRequest({ ...baseRequest, timestamp: baseDeps.nowMs }, baseDeps);
      expect(result.ok).toBe(true);
    });
  });

  describe("actionId is not validated (payload shape is validated by the remote registry)", () => {
    it("passes through any actionId string", () => {
      const result = validateActionRequest(
        { actionId: "any-action-123", timestamp: 1000 },
        baseDeps
      );
      expect(result.ok).toBe(true);
    });
  });
});

describe("ActionValidationOutcome type narrowing", () => {
  it("ok:true result has no reason field", () => {
    const result = validateActionRequest(baseRequest, baseDeps);
    expect(result.ok).toBe(true);
    // TypeScript should narrow: result.reason does not exist when ok=true
    if (result.ok) {
      expect((result as Record<string, unknown>)["reason"]).toBeUndefined();
    }
  });

  it("ok:false result carries the reason", () => {
    const result = validateActionRequest(baseRequest, { ...baseDeps, isActionEnabled: false });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBeDefined();
    }
  });
});
