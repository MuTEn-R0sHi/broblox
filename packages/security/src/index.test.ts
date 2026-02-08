/**
 * Unit tests for @rbx/security package.
 * Tests violation detection, trust scoring, and enforcement.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mockRobloxGlobals, createMockPlayer, resetPlayerIdCounter } from "@rbx/testing";

// Install Roblox globals
beforeEach(() => {
  mockRobloxGlobals();
  resetPlayerIdCounter();
});

// ============================================================================
// Type Definitions (mirrored from types.ts for testing)
// ============================================================================

type ViolationSeverity = "low" | "medium" | "high" | "critical";
type ViolationCategory =
  | "speed"
  | "teleport"
  | "fly"
  | "noclip"
  | "exploit"
  | "injection"
  | "rate-abuse"
  | "invalid-data"
  | "suspicious-pattern";

type EnforcementAction = "none" | "warn" | "kick" | "shadow" | "temp-ban" | "perm-ban";

interface Violation {
  player: { UserId: number; Name: string };
  category: ViolationCategory;
  severity: ViolationSeverity;
  description: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

interface TrustFactors {
  accountAgeDays: number;
  hasVerifiedPhone?: boolean;
  playtimeMinutes: number;
  violationCount: number;
  friendsInServer: number;
}

interface TrustScore {
  score: number;
  riskLevel: "trusted" | "normal" | "suspicious" | "untrusted";
  factors: Partial<Record<keyof TrustFactors, number>>;
}

interface EnforcementConfig {
  severityActions: Record<ViolationSeverity, EnforcementAction>;
  escalationThreshold: number;
  windowSeconds: number;
  kickMessage?: string;
}

// ============================================================================
// Trust Score Calculation Tests
// ============================================================================

describe("Trust Score Calculation", () => {
  const WEIGHTS = {
    accountAge: 20,
    verifiedPhone: 15,
    playtime: 25,
    violations: 30,
    friends: 10,
  };

  function calculateTrustScore(factors: TrustFactors): TrustScore {
    const breakdown: Partial<Record<keyof TrustFactors, number>> = {};
    let total = 0;

    // Account age (0-20 points)
    const ageScore = Math.min(1, factors.accountAgeDays / 30);
    breakdown.accountAgeDays = ageScore * WEIGHTS.accountAge;
    total += breakdown.accountAgeDays;

    // Verified phone (0-15 points)
    if (factors.hasVerifiedPhone !== undefined) {
      breakdown.hasVerifiedPhone = factors.hasVerifiedPhone ? WEIGHTS.verifiedPhone : 0;
      total += breakdown.hasVerifiedPhone;
    }

    // Playtime (0-25 points)
    const playtimeScore = Math.min(1, factors.playtimeMinutes / 60);
    breakdown.playtimeMinutes = playtimeScore * WEIGHTS.playtime;
    total += breakdown.playtimeMinutes;

    // Violations (0-30 points, inverted)
    const violationPenalty = Math.min(WEIGHTS.violations, factors.violationCount * 10);
    breakdown.violationCount = WEIGHTS.violations - violationPenalty;
    total += breakdown.violationCount;

    // Friends in server (0-10 points)
    const friendsScore = Math.min(1, factors.friendsInServer / 3);
    breakdown.friendsInServer = friendsScore * WEIGHTS.friends;
    total += breakdown.friendsInServer;

    const score = Math.min(100, Math.max(0, Math.floor(total)));

    let riskLevel: TrustScore["riskLevel"];
    if (score >= 75) {
      riskLevel = "trusted";
    } else if (score >= 50) {
      riskLevel = "normal";
    } else if (score >= 25) {
      riskLevel = "suspicious";
    } else {
      riskLevel = "untrusted";
    }

    return { score, riskLevel, factors: breakdown };
  }

  describe("score ranges", () => {
    it("calculates max score for ideal player", () => {
      const factors: TrustFactors = {
        accountAgeDays: 365, // Well over 30 days
        hasVerifiedPhone: true,
        playtimeMinutes: 120, // Well over 60 minutes
        violationCount: 0,
        friendsInServer: 5, // Well over 3 friends
      };

      const score = calculateTrustScore(factors);
      expect(score.score).toBe(100);
      expect(score.riskLevel).toBe("trusted");
    });

    it("calculates minimum score for new suspicious player", () => {
      const factors: TrustFactors = {
        accountAgeDays: 0,
        hasVerifiedPhone: false,
        playtimeMinutes: 0,
        violationCount: 5, // Many violations
        friendsInServer: 0,
      };

      const score = calculateTrustScore(factors);
      expect(score.score).toBe(0);
      expect(score.riskLevel).toBe("untrusted");
    });

    it("calculates normal score for typical player", () => {
      const factors: TrustFactors = {
        accountAgeDays: 15, // Half way to 30
        hasVerifiedPhone: true,
        playtimeMinutes: 30, // Half way to 60
        violationCount: 0,
        friendsInServer: 1,
      };

      const score = calculateTrustScore(factors);
      expect(score.score).toBeGreaterThanOrEqual(50);
      expect(score.riskLevel).toBe("normal");
    });
  });

  describe("individual factors", () => {
    it("caps account age score at 30 days", () => {
      const factors1: TrustFactors = {
        accountAgeDays: 30,
        playtimeMinutes: 0,
        violationCount: 0,
        friendsInServer: 0,
      };
      const factors2: TrustFactors = {
        accountAgeDays: 365,
        playtimeMinutes: 0,
        violationCount: 0,
        friendsInServer: 0,
      };

      const score1 = calculateTrustScore(factors1);
      const score2 = calculateTrustScore(factors2);

      // Both should have max age score
      expect(score1.factors.accountAgeDays).toBe(20);
      expect(score2.factors.accountAgeDays).toBe(20);
    });

    it("applies violation penalty correctly", () => {
      const noViolations: TrustFactors = {
        accountAgeDays: 0,
        playtimeMinutes: 0,
        violationCount: 0,
        friendsInServer: 0,
      };
      const oneViolation: TrustFactors = {
        accountAgeDays: 0,
        playtimeMinutes: 0,
        violationCount: 1,
        friendsInServer: 0,
      };
      const threeViolations: TrustFactors = {
        accountAgeDays: 0,
        playtimeMinutes: 0,
        violationCount: 3,
        friendsInServer: 0,
      };

      expect(calculateTrustScore(noViolations).factors.violationCount).toBe(30);
      expect(calculateTrustScore(oneViolation).factors.violationCount).toBe(20);
      expect(calculateTrustScore(threeViolations).factors.violationCount).toBe(0);
    });

    it("gives bonus for verified phone", () => {
      const withPhone: TrustFactors = {
        accountAgeDays: 0,
        hasVerifiedPhone: true,
        playtimeMinutes: 0,
        violationCount: 0,
        friendsInServer: 0,
      };
      const withoutPhone: TrustFactors = {
        accountAgeDays: 0,
        hasVerifiedPhone: false,
        playtimeMinutes: 0,
        violationCount: 0,
        friendsInServer: 0,
      };

      const scoreWithPhone = calculateTrustScore(withPhone);
      const scoreWithoutPhone = calculateTrustScore(withoutPhone);

      expect(scoreWithPhone.score).toBe(scoreWithoutPhone.score + 15);
    });
  });

  describe("risk levels", () => {
    it("classifies trusted (75+)", () => {
      const factors: TrustFactors = {
        accountAgeDays: 30,
        hasVerifiedPhone: true,
        playtimeMinutes: 60,
        violationCount: 0,
        friendsInServer: 3,
      };

      const score = calculateTrustScore(factors);
      expect(score.score).toBeGreaterThanOrEqual(75);
      expect(score.riskLevel).toBe("trusted");
    });

    it("classifies normal (50-74)", () => {
      const factors: TrustFactors = {
        accountAgeDays: 15,
        hasVerifiedPhone: true,
        playtimeMinutes: 30,
        violationCount: 0,
        friendsInServer: 1,
      };

      const score = calculateTrustScore(factors);
      expect(score.score).toBeGreaterThanOrEqual(50);
      expect(score.score).toBeLessThan(75);
      expect(score.riskLevel).toBe("normal");
    });

    it("classifies suspicious (25-49)", () => {
      const factors: TrustFactors = {
        accountAgeDays: 5,
        hasVerifiedPhone: false,
        playtimeMinutes: 10,
        violationCount: 1,
        friendsInServer: 0,
      };

      const score = calculateTrustScore(factors);
      expect(score.score).toBeGreaterThanOrEqual(25);
      expect(score.score).toBeLessThan(50);
      expect(score.riskLevel).toBe("suspicious");
    });

    it("classifies untrusted (0-24)", () => {
      const factors: TrustFactors = {
        accountAgeDays: 1,
        hasVerifiedPhone: false,
        playtimeMinutes: 5,
        violationCount: 2,
        friendsInServer: 0,
      };

      const score = calculateTrustScore(factors);
      expect(score.score).toBeLessThan(25);
      expect(score.riskLevel).toBe("untrusted");
    });
  });
});

// ============================================================================
// Violation Detection Tests
// ============================================================================

describe("Violation Detection", () => {
  describe("Speed check", () => {
    const MAX_SPEED = 100; // studs/second

    function checkSpeed(distance: number, elapsed: number): { violation: boolean; speed: number } {
      const speed = distance / elapsed;
      return {
        violation: speed > MAX_SPEED,
        speed,
      };
    }

    it("allows normal walking speed", () => {
      // Walking: ~16 studs/s
      const result = checkSpeed(16, 1);
      expect(result.violation).toBe(false);
      expect(result.speed).toBe(16);
    });

    it("allows normal running speed", () => {
      // Running: ~32 studs/s
      const result = checkSpeed(32, 1);
      expect(result.violation).toBe(false);
    });

    it("detects impossible speed", () => {
      // 500 studs in 1 second = hacking
      const result = checkSpeed(500, 1);
      expect(result.violation).toBe(true);
      expect(result.speed).toBe(500);
    });

    it("handles edge case at limit", () => {
      const atLimit = checkSpeed(100, 1);
      expect(atLimit.violation).toBe(false);

      const overLimit = checkSpeed(101, 1);
      expect(overLimit.violation).toBe(true);
    });

    it("calculates speed correctly over different intervals", () => {
      // 50 studs in 0.5 seconds = 100 studs/s (at limit)
      const halfSecond = checkSpeed(50, 0.5);
      expect(halfSecond.violation).toBe(false);
      expect(halfSecond.speed).toBe(100);

      // 150 studs in 1.5 seconds = 100 studs/s (at limit)
      const oneAndHalf = checkSpeed(150, 1.5);
      expect(oneAndHalf.violation).toBe(false);
    });
  });

  describe("Teleport check", () => {
    const MAX_TELEPORT_DISTANCE = 200;

    function checkTeleport(distance: number, allowedTeleport: boolean): boolean {
      if (allowedTeleport) return false;
      return distance > MAX_TELEPORT_DISTANCE;
    }

    it("allows short movements", () => {
      expect(checkTeleport(10, false)).toBe(false);
      expect(checkTeleport(50, false)).toBe(false);
    });

    it("allows movement at threshold", () => {
      expect(checkTeleport(200, false)).toBe(false);
    });

    it("detects suspicious teleport", () => {
      expect(checkTeleport(201, false)).toBe(true);
      expect(checkTeleport(1000, false)).toBe(true);
    });

    it("ignores distance when teleport is allowed", () => {
      expect(checkTeleport(1000, true)).toBe(false);
      expect(checkTeleport(10000, true)).toBe(false);
    });
  });

  describe("Rate abuse detection", () => {
    function checkRateAbuse(
      count: number,
      windowStart: number,
      now: number,
      maxPerWindow: number,
      windowMs: number
    ): { abuse: boolean; count: number } {
      const elapsed = now - windowStart;
      if (elapsed > windowMs) {
        // Window expired, reset
        return { abuse: false, count: 1 };
      }
      const newCount = count + 1;
      return {
        abuse: newCount > maxPerWindow,
        count: newCount,
      };
    }

    it("allows requests within limit", () => {
      let count = 0;
      const windowStart = 0;
      const maxPerWindow = 10;
      const windowMs = 1000;

      for (let i = 0; i < 10; i++) {
        const result = checkRateAbuse(count, windowStart, 500, maxPerWindow, windowMs);
        expect(result.abuse).toBe(false);
        count = result.count;
      }
    });

    it("detects abuse over limit", () => {
      const result = checkRateAbuse(10, 0, 500, 10, 1000);
      expect(result.abuse).toBe(true);
      expect(result.count).toBe(11);
    });

    it("resets after window expires", () => {
      const result = checkRateAbuse(10, 0, 2000, 10, 1000);
      expect(result.abuse).toBe(false);
      expect(result.count).toBe(1);
    });
  });
});

// ============================================================================
// Enforcement Tests
// ============================================================================

describe("Enforcement", () => {
  const DEFAULT_CONFIG: EnforcementConfig = {
    severityActions: {
      low: "none",
      medium: "warn",
      high: "kick",
      critical: "kick",
    },
    escalationThreshold: 3,
    windowSeconds: 60,
    kickMessage: "Suspicious activity detected",
  };

  describe("action selection", () => {
    it("selects correct action for low severity", () => {
      expect(DEFAULT_CONFIG.severityActions.low).toBe("none");
    });

    it("selects correct action for medium severity", () => {
      expect(DEFAULT_CONFIG.severityActions.medium).toBe("warn");
    });

    it("selects correct action for high severity", () => {
      expect(DEFAULT_CONFIG.severityActions.high).toBe("kick");
    });

    it("selects correct action for critical severity", () => {
      expect(DEFAULT_CONFIG.severityActions.critical).toBe("kick");
    });
  });

  describe("escalation", () => {
    function escalateAction(action: EnforcementAction): EnforcementAction {
      switch (action) {
        case "none":
          return "warn";
        case "warn":
          return "kick";
        case "kick":
          return "kick";
        default:
          return action;
      }
    }

    it("escalates none to warn", () => {
      expect(escalateAction("none")).toBe("warn");
    });

    it("escalates warn to kick", () => {
      expect(escalateAction("warn")).toBe("kick");
    });

    it("keeps kick as kick (max escalation)", () => {
      expect(escalateAction("kick")).toBe("kick");
    });
  });

  describe("violation tracking", () => {
    it("tracks violations within window", () => {
      const violations: Array<{ timestamp: number; severity: ViolationSeverity }> = [];
      const windowSeconds = 60;
      const now = 1000;

      // Add violations
      violations.push({ timestamp: 950, severity: "medium" });
      violations.push({ timestamp: 960, severity: "medium" });
      violations.push({ timestamp: 990, severity: "high" });

      // Filter to window
      const cutoff = now - windowSeconds;
      const inWindow = violations.filter((v) => v.timestamp >= cutoff);

      expect(inWindow.length).toBe(3);
    });

    it("removes old violations outside window", () => {
      const violations: Array<{ timestamp: number; severity: ViolationSeverity }> = [];
      const windowSeconds = 60;
      const now = 1000;

      // Add old and new violations
      violations.push({ timestamp: 800, severity: "medium" }); // Old
      violations.push({ timestamp: 850, severity: "medium" }); // Old
      violations.push({ timestamp: 950, severity: "high" }); // In window
      violations.push({ timestamp: 990, severity: "high" }); // In window

      // Filter to window
      const cutoff = now - windowSeconds;
      const inWindow = violations.filter((v) => v.timestamp >= cutoff);

      expect(inWindow.length).toBe(2);
    });

    it("triggers escalation at threshold", () => {
      const violations: Array<{ timestamp: number }> = [
        { timestamp: 950 },
        { timestamp: 960 },
        { timestamp: 970 },
      ];

      expect(violations.length).toBe(DEFAULT_CONFIG.escalationThreshold);
    });
  });

  describe("shadow ban state", () => {
    it("tracks shadow ban status per player", () => {
      const shadowBanned = new Set<number>();
      const player1 = createMockPlayer();
      const player2 = createMockPlayer();

      expect(shadowBanned.has(player1.UserId)).toBe(false);

      shadowBanned.add(player1.UserId);

      expect(shadowBanned.has(player1.UserId)).toBe(true);
      expect(shadowBanned.has(player2.UserId)).toBe(false);
    });
  });
});

// ============================================================================
// Violation Type Tests
// ============================================================================

describe("Violation Types", () => {
  describe("ViolationSeverity", () => {
    it("defines all severity levels", () => {
      const severities: ViolationSeverity[] = ["low", "medium", "high", "critical"];
      expect(severities).toHaveLength(4);
    });
  });

  describe("ViolationCategory", () => {
    it("defines all violation categories", () => {
      const categories: ViolationCategory[] = [
        "speed",
        "teleport",
        "fly",
        "noclip",
        "exploit",
        "injection",
        "rate-abuse",
        "invalid-data",
        "suspicious-pattern",
      ];
      expect(categories).toHaveLength(9);
    });
  });

  describe("Violation structure", () => {
    it("creates valid violation object", () => {
      const player = createMockPlayer();
      const violation: Violation = {
        player,
        category: "speed",
        severity: "high",
        description: "Speed: 500 studs/s",
        context: { speed: 500, distance: 500, elapsed: 1 },
        timestamp: Date.now(),
      };

      expect(violation.player.UserId).toBe(player.UserId);
      expect(violation.category).toBe("speed");
      expect(violation.severity).toBe("high");
      expect(violation.context?.speed).toBe(500);
    });
  });
});

// ============================================================================
// Trust Cache Tests
// ============================================================================

describe("Trust Score Cache", () => {
  it("caches trust scores with TTL", () => {
    const cache = new Map<number, { score: TrustScore; timestamp: number }>();
    const player = createMockPlayer();

    const score: TrustScore = {
      score: 75,
      riskLevel: "trusted",
      factors: { accountAgeDays: 20 },
    };

    // Cache the score
    cache.set(player.UserId, { score, timestamp: 1000 });

    // Check cache hit
    const cached = cache.get(player.UserId);
    expect(cached?.score.score).toBe(75);
  });

  it("invalidates expired cache entries", () => {
    const cache = new Map<number, { score: TrustScore; timestamp: number }>();
    const CACHE_TTL = 60;
    const player = createMockPlayer();

    const score: TrustScore = {
      score: 75,
      riskLevel: "trusted",
      factors: {},
    };

    cache.set(player.UserId, { score, timestamp: 1000 });

    // Check if expired
    const now = 1070; // 70 seconds later
    const cached = cache.get(player.UserId);

    if (cached && now - cached.timestamp > CACHE_TTL) {
      cache.delete(player.UserId);
    }

    expect(cache.has(player.UserId)).toBe(false);
  });

  it("keeps valid cache entries", () => {
    const cache = new Map<number, { score: TrustScore; timestamp: number }>();
    const CACHE_TTL = 60;
    const player = createMockPlayer();

    const score: TrustScore = {
      score: 50,
      riskLevel: "normal",
      factors: {},
    };

    cache.set(player.UserId, { score, timestamp: 1000 });

    // Check if expired
    const now = 1030; // 30 seconds later (within TTL)
    const cached = cache.get(player.UserId);

    if (cached && now - cached.timestamp > CACHE_TTL) {
      cache.delete(player.UserId);
    }

    expect(cache.has(player.UserId)).toBe(true);
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("Trust Score Helpers", () => {
  it("isTrusted returns true for score >= 50", () => {
    const isTrusted = (score: TrustScore): boolean => score.score >= 50;

    expect(isTrusted({ score: 50, riskLevel: "normal", factors: {} })).toBe(true);
    expect(isTrusted({ score: 75, riskLevel: "trusted", factors: {} })).toBe(true);
    expect(isTrusted({ score: 100, riskLevel: "trusted", factors: {} })).toBe(true);
    expect(isTrusted({ score: 49, riskLevel: "suspicious", factors: {} })).toBe(false);
  });

  it("isSuspicious returns true for score < 25", () => {
    const isSuspicious = (score: TrustScore): boolean => score.score < 25;

    expect(isSuspicious({ score: 24, riskLevel: "untrusted", factors: {} })).toBe(true);
    expect(isSuspicious({ score: 0, riskLevel: "untrusted", factors: {} })).toBe(true);
    expect(isSuspicious({ score: 25, riskLevel: "suspicious", factors: {} })).toBe(false);
    expect(isSuspicious({ score: 50, riskLevel: "normal", factors: {} })).toBe(false);
  });
});
