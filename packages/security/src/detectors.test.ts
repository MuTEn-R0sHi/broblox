/**
 * Tests for security detectors.
 *
 * Covers: onViolation, reportViolation, checkSpeed, checkTeleport,
 * reportInvalidData, checkRateAbuse, cleanupPlayer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Local type stubs for Roblox globals not available in test environment
// ---------------------------------------------------------------------------

type Player = { UserId: number; Name: string; Kick?: (msg: string) => void };
type Vector3 = { X: number; Y: number; Z: number; Magnitude: number; sub(other: Vector3): Vector3 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPlayer(userId: number, name = `Player${userId}`) {
  return { UserId: userId, Name: name } as unknown as Player;
}

function createVector3(x: number, y: number, z: number) {
  return {
    X: x,
    Y: y,
    Z: z,
    sub(other: { X: number; Y: number; Z: number }) {
      const dx = x - other.X;
      const dy = y - other.Y;
      const dz = z - other.Z;
      return {
        X: dx,
        Y: dy,
        Z: dz,
        Magnitude: math.sqrt(dx * dx + dy * dy + dz * dz),
      };
    },
    Magnitude: math.sqrt(x * x + y * y + z * z),
  } as unknown as Vector3;
}

let clockTime = 0;
let osTimeValue = 1000;

beforeEach(() => {
  vi.resetModules();
  clockTime = 0;
  osTimeValue = 1000;

  const g = globalThis as Record<string, unknown>;
  g.os = {
    ...(g.os as object),
    clock: () => clockTime,
    time: () => osTimeValue,
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("onViolation / reportViolation", () => {
  it("registers a handler and calls it on violation", async () => {
    const { onViolation, reportViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(1);
    reportViolation(player, "speed", "medium", "too fast");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        player,
        category: "speed",
        severity: "medium",
        description: "too fast",
        timestamp: osTimeValue,
      })
    );
  });

  it("calls multiple handlers", async () => {
    const { onViolation, reportViolation } = await import("./detectors");
    const h1 = vi.fn();
    const h2 = vi.fn();
    onViolation(h1);
    onViolation(h2);

    reportViolation(createMockPlayer(1), "teleport", "high", "tp");
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe removes handler", async () => {
    const { onViolation, reportViolation } = await import("./detectors");
    const handler = vi.fn();
    const unsub = onViolation(handler);
    unsub();

    reportViolation(createMockPlayer(1), "speed", "low", "x");
    expect(handler).not.toHaveBeenCalled();
  });

  it("includes context in violation", async () => {
    const { onViolation, reportViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    reportViolation(createMockPlayer(1), "speed", "medium", "fast", { speed: 200 });
    expect(handler.mock.calls[0][0].context).toEqual({ speed: 200 });
  });

  it("returns the violation object", async () => {
    const { reportViolation } = await import("./detectors");
    const v = reportViolation(createMockPlayer(1), "exploit", "critical", "bad");
    expect(v.category).toBe("exploit");
    expect(v.severity).toBe("critical");
  });

  it("does not throw when handler throws", async () => {
    const { onViolation, reportViolation } = await import("./detectors");
    const badHandler = vi.fn(() => {
      throw new Error("handler error");
    });
    const goodHandler = vi.fn();
    onViolation(badHandler);
    onViolation(goodHandler);

    // Should not throw; second handler still called
    expect(() => reportViolation(createMockPlayer(1), "speed", "low", "x")).not.toThrow();
    expect(goodHandler).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// checkSpeed
// ---------------------------------------------------------------------------

describe("checkSpeed", () => {
  it("does not report on first call (no previous position)", async () => {
    const { checkSpeed, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(10);
    clockTime = 1;
    checkSpeed(player, createVector3(0, 0, 0));

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not report normal speed", async () => {
    const { checkSpeed, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(11);
    clockTime = 0;
    checkSpeed(player, createVector3(0, 0, 0));

    // 50 studs in 1 second = 50 studs/s (under 100 limit)
    clockTime = 1;
    checkSpeed(player, createVector3(50, 0, 0));

    expect(handler).not.toHaveBeenCalled();
  });

  it("reports speed violation when moving too fast", async () => {
    const { checkSpeed, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(12);
    // First call: creates state but returns early (elapsed=0 < 0.5)
    clockTime = 0;
    checkSpeed(player, createVector3(0, 0, 0));

    // Second call: elapsed=1 >= 0.5 but no lastPosition yet — sets lastPosition
    clockTime = 1;
    checkSpeed(player, createVector3(0, 0, 0));

    // Third call: 200 studs in 1 second = 200 studs/s (over 100 limit)
    clockTime = 2;
    checkSpeed(player, createVector3(200, 0, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].category).toBe("speed");
    expect(handler.mock.calls[0][0].severity).toBe("medium");
  });

  it("escalates to high severity after 3 violations", async () => {
    const { checkSpeed, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(13);
    // First call: creates state, returns early (elapsed=0)
    clockTime = 0;
    checkSpeed(player, createVector3(0, 0, 0));

    // Second call: sets lastPosition (no previous to compare)
    clockTime = 1;
    checkSpeed(player, createVector3(0, 0, 0));

    // Each subsequent step moves 200 studs in 1 second = 200 studs/s
    clockTime = 2;
    checkSpeed(player, createVector3(200, 0, 0)); // violation #1 (medium)
    clockTime = 3;
    checkSpeed(player, createVector3(400, 0, 0)); // violation #2 (medium)
    clockTime = 4;
    checkSpeed(player, createVector3(600, 0, 0)); // violation #3 (high: violations >= 3)

    expect(handler).toHaveBeenCalledTimes(3);
    // First two are medium, third is high
    expect(handler.mock.calls[0][0].severity).toBe("medium");
    expect(handler.mock.calls[1][0].severity).toBe("medium");
    expect(handler.mock.calls[2][0].severity).toBe("high");
  });

  it("skips check if interval too short", async () => {
    const { checkSpeed, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(14);
    clockTime = 0;
    checkSpeed(player, createVector3(0, 0, 0));

    // Only 0.1s later (under 0.5 interval)
    clockTime = 0.1;
    checkSpeed(player, createVector3(500, 0, 0));

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not flag aerial speed within 1.5× threshold", async () => {
    const { checkSpeed, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(50);
    clockTime = 0;
    checkSpeed(player, createVector3(0, 0, 0), true);

    clockTime = 1;
    checkSpeed(player, createVector3(0, 0, 0), true);

    // 140 studs/s — above ground limit (100) but below aerial limit (150)
    clockTime = 2;
    checkSpeed(player, createVector3(140, 0, 0), true);

    expect(handler).not.toHaveBeenCalled();
  });

  it("flags aerial speed above 1.5× threshold", async () => {
    const { checkSpeed, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(51);
    clockTime = 0;
    checkSpeed(player, createVector3(0, 0, 0), true);

    clockTime = 1;
    checkSpeed(player, createVector3(0, 0, 0), true);

    // 160 studs/s — above aerial limit (150)
    clockTime = 2;
    checkSpeed(player, createVector3(160, 0, 0), true);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].category).toBe("speed");
  });
});

describe("resetSpeedCheck", () => {
  it("clears speed state for a player", async () => {
    const { checkSpeed, resetSpeedCheck, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(15);
    clockTime = 0;
    checkSpeed(player, createVector3(0, 0, 0));
    clockTime = 1;
    checkSpeed(player, createVector3(50, 0, 0));

    // Reset — next call should treat as first call
    resetSpeedCheck(player);
    clockTime = 2;
    checkSpeed(player, createVector3(500, 0, 0));

    // No violation because no previous position after reset
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// checkTeleport
// ---------------------------------------------------------------------------

describe("checkTeleport", () => {
  it("returns false for normal movement", async () => {
    const { checkTeleport, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const result = checkTeleport(
      createMockPlayer(20),
      createVector3(0, 0, 0),
      createVector3(50, 0, 0)
    );
    expect(result).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns true for suspicious teleport", async () => {
    const { checkTeleport, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const result = checkTeleport(
      createMockPlayer(21),
      createVector3(0, 0, 0),
      createVector3(300, 0, 0)
    );
    expect(result).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].category).toBe("teleport");
    expect(handler.mock.calls[0][0].severity).toBe("high");
  });

  it("returns false when teleport is suppressed", async () => {
    const { checkTeleport, suppressTeleportCheck, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(22);
    suppressTeleportCheck(player, 5); // suppress for 5 seconds

    const result = checkTeleport(player, createVector3(0, 0, 0), createVector3(1000, 0, 0));
    expect(result).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it("reports distance exactly at boundary (> 200)", async () => {
    const { checkTeleport, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    // Exactly 200 — should NOT trigger (must be > 200)
    const result200 = checkTeleport(
      createMockPlayer(23),
      createVector3(0, 0, 0),
      createVector3(200, 0, 0)
    );
    expect(result200).toBe(false);

    // 201 — should trigger
    const result201 = checkTeleport(
      createMockPlayer(24),
      createVector3(0, 0, 0),
      createVector3(201, 0, 0)
    );
    expect(result201).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// reportInvalidData
// ---------------------------------------------------------------------------

describe("reportInvalidData", () => {
  it("reports a medium-severity invalid-data violation", async () => {
    const { reportInvalidData, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    reportInvalidData(createMockPlayer(30), "health", "number", "abc");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].category).toBe("invalid-data");
    expect(handler.mock.calls[0][0].severity).toBe("medium");
  });
});

// ---------------------------------------------------------------------------
// checkRateAbuse
// ---------------------------------------------------------------------------

describe("checkRateAbuse", () => {
  it("returns false when under limit", async () => {
    const { checkRateAbuse, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(40);
    const result = checkRateAbuse(player, "fire", 10);

    expect(result).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns true when limit exceeded", async () => {
    const { checkRateAbuse, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(41);
    // Call 11 times with limit 10
    for (let i = 0; i < 10; i++) {
      checkRateAbuse(player, "fire", 10);
    }
    const result = checkRateAbuse(player, "fire", 10);

    expect(result).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].category).toBe("rate-abuse");
  });

  it("resets window after 60 seconds", async () => {
    const { checkRateAbuse, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(42);
    osTimeValue = 1000;

    // Exhaust limit
    for (let i = 0; i < 10; i++) {
      checkRateAbuse(player, "jump", 10);
    }
    expect(checkRateAbuse(player, "jump", 10)).toBe(true);

    // Advance past window
    osTimeValue = 1061;
    expect(checkRateAbuse(player, "jump", 10)).toBe(false);
  });

  it("tracks actions independently", async () => {
    const { checkRateAbuse } = await import("./detectors");
    const player = createMockPlayer(43);

    // Exhaust "fire" limit
    for (let i = 0; i < 5; i++) {
      checkRateAbuse(player, "fire", 5);
    }
    expect(checkRateAbuse(player, "fire", 5)).toBe(true);

    // "jump" should still be fine
    expect(checkRateAbuse(player, "jump", 5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cleanupPlayer
// ---------------------------------------------------------------------------

describe("cleanupPlayer", () => {
  it("clears speed and rate state for a player", async () => {
    const { checkSpeed, checkRateAbuse, cleanupPlayer, onViolation } = await import("./detectors");
    const handler = vi.fn();
    onViolation(handler);

    const player = createMockPlayer(50);
    clockTime = 0;
    checkSpeed(player, createVector3(0, 0, 0));
    checkRateAbuse(player, "test", 10);

    cleanupPlayer(player);

    // After cleanup, checkSpeed treats as new (no previous position)
    clockTime = 1;
    checkSpeed(player, createVector3(500, 0, 0));
    expect(handler).not.toHaveBeenCalled();
  });
});
