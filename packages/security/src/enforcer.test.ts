/**
 * Tests for the enforcement system.
 *
 * Covers: Enforcer class, createEnforcer, cleanupEnforcementState.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Violation, ViolationSeverity } from "./types";

// ---------------------------------------------------------------------------
// Local type stub for Roblox Player (not available in test environment)
// ---------------------------------------------------------------------------

type Player = { UserId: number; Name: string; Kick: ReturnType<typeof vi.fn> };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let osTimeValue = 1000;

function createMockPlayer(userId: number, name = `Player${userId}`) {
  return {
    UserId: userId,
    Name: name,
    Kick: vi.fn(),
  } as unknown as Player;
}

function createViolation(
  player: Player,
  severity: ViolationSeverity,
  category = "speed" as const
): Violation {
  return {
    player,
    category,
    severity,
    description: `Test violation: ${severity}`,
    timestamp: osTimeValue,
  };
}

beforeEach(() => {
  vi.resetModules();
  osTimeValue = 1000;

  const g = globalThis as Record<string, unknown>;
  g.os = {
    ...(g.os as object),
    clock: () => 0,
    time: () => osTimeValue,
  };
});

// ---------------------------------------------------------------------------
// Enforcer class
// ---------------------------------------------------------------------------

describe("Enforcer", () => {
  it("creates with default config", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    expect(enforcer).toBeDefined();
  });

  it("creates with custom config", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer({
      escalationThreshold: 5,
      windowSeconds: 120,
    });
    expect(enforcer).toBeDefined();
  });

  it("creates with partial severity overrides", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer({
      severityActions: { low: "warn", medium: "warn", high: "kick", critical: "kick" },
    });
    // Should still have the merged config
    expect(enforcer).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// handleViolation
// ---------------------------------------------------------------------------

describe("handleViolation", () => {
  it("does nothing for low severity (action = none)", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(1);

    enforcer.handleViolation(createViolation(player, "low"));

    // No kick for low severity
    expect(player.Kick).not.toHaveBeenCalled();
  });

  it("warns for medium severity", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(2);

    enforcer.handleViolation(createViolation(player, "medium"));

    // Warn = no kick, but violation is recorded
    expect(player.Kick).not.toHaveBeenCalled();
    expect(enforcer.getViolationCount(player)).toBe(1);
  });

  it("kicks for high severity", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(3);

    enforcer.handleViolation(createViolation(player, "high"));

    expect(player.Kick).toHaveBeenCalledTimes(1);
    expect(player.Kick).toHaveBeenCalledWith("Suspicious activity detected");
  });

  it("kicks for critical severity", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(4);

    enforcer.handleViolation(createViolation(player, "critical"));

    expect(player.Kick).toHaveBeenCalledTimes(1);
  });

  it("records violations over time", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(5);

    enforcer.handleViolation(createViolation(player, "low"));
    enforcer.handleViolation(createViolation(player, "low"));
    enforcer.handleViolation(createViolation(player, "low"));

    expect(enforcer.getViolationCount(player)).toBe(3);
  });

  it("escalates action after reaching threshold (3 violations)", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(6);

    // First 2 low violations: action = none (no escalation yet)
    enforcer.handleViolation(createViolation(player, "low"));
    enforcer.handleViolation(createViolation(player, "low"));
    expect(player.Kick).not.toHaveBeenCalled();

    // Third low violation: 3 violations >= threshold → escalate none→warn
    enforcer.handleViolation(createViolation(player, "low"));
    // Still no kick (warn doesn't kick)
    expect(player.Kick).not.toHaveBeenCalled();
  });

  it("escalates warn to kick at threshold", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(7);

    // Fill up with medium violations (action = warn)
    enforcer.handleViolation(createViolation(player, "medium"));
    enforcer.handleViolation(createViolation(player, "medium"));
    expect(player.Kick).not.toHaveBeenCalled();

    // Third medium: 3 violations >= threshold → escalate warn→kick
    enforcer.handleViolation(createViolation(player, "medium"));
    expect(player.Kick).toHaveBeenCalledTimes(1);
  });

  it("evicts old violations outside window", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer({ windowSeconds: 60 });
    const player = createMockPlayer(8);

    // Two old violations
    osTimeValue = 1000;
    enforcer.handleViolation(createViolation(player, "low"));
    enforcer.handleViolation(createViolation(player, "low"));

    // Time passes beyond window
    osTimeValue = 1100;

    // Third violation — old ones should be evicted from window
    enforcer.handleViolation(createViolation(player, "low"));

    // Only 1 violation in window (the recent one), so no escalation
    expect(enforcer.getViolationCount(player)).toBe(1);
  });

  it("uses custom kick message", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer({ kickMessage: "Cheating detected!" });
    const player = createMockPlayer(9);

    enforcer.handleViolation(createViolation(player, "high"));

    expect(player.Kick).toHaveBeenCalledWith("Cheating detected!");
  });
});

// ---------------------------------------------------------------------------
// kick / shadowBan
// ---------------------------------------------------------------------------

describe("kick", () => {
  it("kicks with default message", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(10);

    enforcer.kick(player);

    expect(player.Kick).toHaveBeenCalledTimes(1);
    // Falls through to config.kickMessage ("Suspicious activity detected")
    expect(player.Kick).toHaveBeenCalledWith("Suspicious activity detected");
  });

  it("kicks with custom reason", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(11);

    enforcer.kick(player, "speed hacking");

    expect(player.Kick).toHaveBeenCalledWith("speed hacking");
  });
});

describe("shadowBan", () => {
  it("marks player as shadow banned", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(12);

    expect(enforcer.isShadowBanned(player)).toBe(false);

    enforcer.shadowBan(player);

    expect(enforcer.isShadowBanned(player)).toBe(true);
  });

  it("applies shadow ban via handleViolation with shadow action", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer({
      severityActions: { low: "none", medium: "shadow", high: "kick", critical: "kick" },
    });
    const player = createMockPlayer(13);

    enforcer.handleViolation(createViolation(player, "medium"));

    expect(enforcer.isShadowBanned(player)).toBe(true);
    expect(player.Kick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// resetPlayer / getViolationCount
// ---------------------------------------------------------------------------

describe("resetPlayer", () => {
  it("clears violation history", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(14);

    enforcer.handleViolation(createViolation(player, "low"));
    enforcer.handleViolation(createViolation(player, "low"));
    expect(enforcer.getViolationCount(player)).toBe(2);

    enforcer.resetPlayer(player);
    expect(enforcer.getViolationCount(player)).toBe(0);
  });

  it("clears shadow ban status", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(15);

    enforcer.shadowBan(player);
    expect(enforcer.isShadowBanned(player)).toBe(true);

    enforcer.resetPlayer(player);
    expect(enforcer.isShadowBanned(player)).toBe(false);
  });
});

describe("getViolationCount", () => {
  it("returns 0 for unknown player", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(99);

    expect(enforcer.getViolationCount(player)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// start / stop (auto-enforcement via onViolation)
// ---------------------------------------------------------------------------

describe("start / stop", () => {
  it("start is idempotent", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();

    // Should not throw when called multiple times
    enforcer.start();
    enforcer.start();
    enforcer.stop();
  });

  it("stop is safe when not started", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer();

    // Should not throw
    enforcer.stop();
  });

  it("auto-handles violations via detectors when started", async () => {
    const { createEnforcer } = await import("./enforcer");
    const { reportViolation } = await import("./detectors");
    const enforcer = createEnforcer();
    const player = createMockPlayer(16);

    enforcer.start();

    // Trigger a high violation through the detector system
    reportViolation(player, "speed", "high", "too fast");

    expect(player.Kick).toHaveBeenCalledTimes(1);

    enforcer.stop();
  });

  it("does not handle violations after stop", async () => {
    const { createEnforcer } = await import("./enforcer");
    const { reportViolation } = await import("./detectors");
    const enforcer = createEnforcer();
    const player = createMockPlayer(17);

    enforcer.start();
    enforcer.stop();

    reportViolation(player, "speed", "high", "too fast");

    // After stop, enforcer doesn't listen → no kick
    expect(player.Kick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// cleanupEnforcementState
// ---------------------------------------------------------------------------

describe("cleanupEnforcementState", () => {
  it("clears the module-level state for a player", async () => {
    const { createEnforcer, cleanupEnforcementState } = await import("./enforcer");
    const enforcer = createEnforcer();
    const player = createMockPlayer(18);

    enforcer.handleViolation(createViolation(player, "low"));
    expect(enforcer.getViolationCount(player)).toBe(1);

    cleanupEnforcementState(player);
    expect(enforcer.getViolationCount(player)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Ban action fallback
// ---------------------------------------------------------------------------

describe("ban actions", () => {
  it("falls back to kick for temp-ban when no onBan callback", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer({
      severityActions: { low: "temp-ban", medium: "warn", high: "kick", critical: "kick" },
    });
    const player = createMockPlayer(19);

    enforcer.handleViolation(createViolation(player, "low"));

    // temp-ban falls back to kick with ban message
    expect(player.Kick).toHaveBeenCalledWith("You have been banned from this game");
  });

  it("falls back to kick for perm-ban when no onBan callback", async () => {
    const { createEnforcer } = await import("./enforcer");
    const enforcer = createEnforcer({
      severityActions: { low: "perm-ban", medium: "warn", high: "kick", critical: "kick" },
    });
    const player = createMockPlayer(20);

    enforcer.handleViolation(createViolation(player, "low"));

    expect(player.Kick).toHaveBeenCalledWith("You have been banned from this game");
  });

  it("calls onBan callback with TEMPORARY type for temp-ban", async () => {
    const { createEnforcer } = await import("./enforcer");
    const onBan = vi.fn();
    const enforcer = createEnforcer({
      severityActions: { low: "temp-ban", medium: "warn", high: "kick", critical: "kick" },
      onBan,
    });
    const player = createMockPlayer(21);
    const violation = createViolation(player, "low");

    enforcer.handleViolation(violation);

    expect(onBan).toHaveBeenCalledWith(player, "TEMPORARY", violation.description, 24);
    expect(player.Kick).toHaveBeenCalledWith("You have been banned from this game");
  });

  it("calls onBan callback with PERMANENT type for perm-ban", async () => {
    const { createEnforcer } = await import("./enforcer");
    const onBan = vi.fn();
    const enforcer = createEnforcer({
      severityActions: { low: "perm-ban", medium: "warn", high: "kick", critical: "kick" },
      onBan,
    });
    const player = createMockPlayer(22);
    const violation = createViolation(player, "low");

    enforcer.handleViolation(violation);

    expect(onBan).toHaveBeenCalledWith(player, "PERMANENT", violation.description, undefined);
    expect(player.Kick).toHaveBeenCalledWith("You have been banned from this game");
  });

  it("passes custom tempBanDurationHours to onBan", async () => {
    const { createEnforcer } = await import("./enforcer");
    const onBan = vi.fn();
    const enforcer = createEnforcer({
      severityActions: { low: "temp-ban", medium: "warn", high: "kick", critical: "kick" },
      tempBanDurationHours: 48,
      onBan,
    });
    const player = createMockPlayer(23);
    const violation = createViolation(player, "low");

    enforcer.handleViolation(violation);

    expect(onBan).toHaveBeenCalledWith(player, "TEMPORARY", violation.description, 48);
  });
});

// ---------------------------------------------------------------------------
// Escalation chain — extended
// ---------------------------------------------------------------------------

describe("escalation chain", () => {
  it("escalates kick to shadow at threshold", async () => {
    const { createEnforcer } = await import("./enforcer");
    // Default: high → kick, threshold = 3
    const enforcer = createEnforcer();
    const player = createMockPlayer(30);

    // First 2 high violations: below threshold, execute "kick" each time
    enforcer.handleViolation(createViolation(player, "high"));
    enforcer.handleViolation(createViolation(player, "high"));
    expect(enforcer.isShadowBanned(player)).toBe(false);

    // Third violation: 3 >= threshold → escalate kick → shadow
    enforcer.handleViolation(createViolation(player, "high"));
    expect(enforcer.isShadowBanned(player)).toBe(true);
  });

  it("escalates shadow to temp-ban at threshold", async () => {
    const { createEnforcer } = await import("./enforcer");
    const onBan = vi.fn();
    const enforcer = createEnforcer({
      severityActions: { low: "none", medium: "none", high: "shadow", critical: "none" },
      onBan,
    });
    const player = createMockPlayer(31);

    // First 2 high violations: below threshold, execute "shadow"
    enforcer.handleViolation(createViolation(player, "high"));
    enforcer.handleViolation(createViolation(player, "high"));
    expect(onBan).not.toHaveBeenCalled();

    // Third violation: 3 >= threshold → escalate shadow → temp-ban
    enforcer.handleViolation(createViolation(player, "high"));
    expect(onBan).toHaveBeenCalledWith(player, "TEMPORARY", expect.any(String), expect.any(Number));
    expect(player.Kick).toHaveBeenCalledWith("You have been banned from this game");
  });

  it("escalates temp-ban to perm-ban at threshold", async () => {
    const { createEnforcer } = await import("./enforcer");
    const onBan = vi.fn();
    const enforcer = createEnforcer({
      severityActions: { low: "none", medium: "none", high: "temp-ban", critical: "none" },
      onBan,
    });
    const player = createMockPlayer(32);

    // First 2 high violations: execute "temp-ban" → onBan with TEMPORARY
    enforcer.handleViolation(createViolation(player, "high"));
    enforcer.handleViolation(createViolation(player, "high"));
    expect(onBan).toHaveBeenCalledTimes(2);
    expect(onBan).toHaveBeenLastCalledWith(
      player,
      "TEMPORARY",
      expect.any(String),
      expect.any(Number)
    );

    // Third violation: 3 >= threshold → escalate temp-ban → perm-ban
    enforcer.handleViolation(createViolation(player, "high"));
    expect(onBan).toHaveBeenCalledTimes(3);
    expect(onBan).toHaveBeenLastCalledWith(player, "PERMANENT", expect.any(String), undefined);
  });

  it("perm-ban caps and stays at perm-ban when escalated", async () => {
    const { createEnforcer } = await import("./enforcer");
    const onBan = vi.fn();
    const enforcer = createEnforcer({
      severityActions: { low: "none", medium: "none", high: "perm-ban", critical: "none" },
      onBan,
    });
    const player = createMockPlayer(33);

    // Three violations — on 3rd, escalate perm-ban → perm-ban (cap)
    enforcer.handleViolation(createViolation(player, "high"));
    enforcer.handleViolation(createViolation(player, "high"));
    enforcer.handleViolation(createViolation(player, "high"));

    // All three should have triggered PERMANENT ban, not an unknown action
    expect(onBan).toHaveBeenCalledTimes(3);
    for (const call of onBan.mock.calls) {
      expect(call[1]).toBe("PERMANENT");
    }
  });
});
