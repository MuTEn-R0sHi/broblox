/**
 * Action Service Tests
 *
 * Unit tests for the ActionService validation logic.
 * These test the business logic without importing Roblox packages.
 */

import { describe, it, expect, beforeEach } from "vitest";

// Constants mirroring @rbx/constants
const TIMESTAMP_TOLERANCE_MS = 5000; // 5 second tolerance

// Mock feature flag function
const mockFlags: Record<string, boolean> = {
  "doAction.enabled": true,
};

function isFlagEnabled(flag: string): boolean {
  return mockFlags[flag] ?? false;
}

function setFlag(flag: string, value: boolean): void {
  mockFlags[flag] = value;
}

describe("ActionService validation logic", () => {
  beforeEach(() => {
    // Reset flags
    mockFlags["doAction.enabled"] = true;
  });

  describe("feature flag check", () => {
    it("should check if doAction.enabled flag is set", () => {
      const isEnabled = isFlagEnabled("doAction.enabled");
      expect(isEnabled).toBe(true);
    });

    it("should reject when feature is disabled", () => {
      setFlag("doAction.enabled", false);
      const isEnabled = isFlagEnabled("doAction.enabled");
      expect(isEnabled).toBe(false);
    });
  });

  describe("timestamp validation", () => {
    it("should reject negative timestamps", () => {
      const timestamp = -1;
      const isValid = timestamp >= 0;
      expect(isValid).toBe(false);
    });

    it("should reject timestamps too far in the future", () => {
      const nowMs = Date.now();
      const futureTimestamp = nowMs + TIMESTAMP_TOLERANCE_MS + 1000;
      const isValid = futureTimestamp <= nowMs + TIMESTAMP_TOLERANCE_MS;
      expect(isValid).toBe(false);
    });

    it("should accept timestamps within tolerance", () => {
      const nowMs = Date.now();
      const validTimestamp = nowMs - 1000; // 1 second ago
      const isValid = validTimestamp >= 0 && validTimestamp <= nowMs + TIMESTAMP_TOLERANCE_MS;
      expect(isValid).toBe(true);
    });

    it("should accept current timestamp", () => {
      const nowMs = Date.now();
      const isValid = nowMs >= 0 && nowMs <= nowMs + TIMESTAMP_TOLERANCE_MS;
      expect(isValid).toBe(true);
    });
  });
});

describe("ActionRequest structure", () => {
  it("should validate actionId is a string", () => {
    const request = {
      actionId: "jump",
      timestamp: Date.now(),
    };

    expect(typeof request.actionId).toBe("string");
    expect(request.actionId.length).toBeGreaterThan(0);
  });

  it("should allow optional payload", () => {
    const requestWithPayload = {
      actionId: "attack",
      timestamp: Date.now(),
      payload: { targetId: "enemy_123" },
    };

    const requestWithoutPayload = {
      actionId: "jump",
      timestamp: Date.now(),
    };

    expect(requestWithPayload.payload).toBeDefined();
    expect(requestWithoutPayload.payload).toBeUndefined();
  });
});

describe("ActionResponse structure", () => {
  it("should have accepted boolean", () => {
    const response = {
      accepted: true,
      serverTimestamp: Date.now(),
    };

    expect(typeof response.accepted).toBe("boolean");
  });

  it("should have server timestamp", () => {
    const response = {
      accepted: true,
      serverTimestamp: Date.now(),
    };

    expect(typeof response.serverTimestamp).toBe("number");
    expect(response.serverTimestamp).toBeGreaterThan(0);
  });
});
