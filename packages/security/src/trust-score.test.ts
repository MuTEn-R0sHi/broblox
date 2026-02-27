/**
 * Tests for trust score calculation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

describe("calculateTrustScore", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function getModule() {
    return import("./trust-score");
  }

  it("gives maximum score to a trusted player", async () => {
    const { calculateTrustScore } = await getModule();
    const result = calculateTrustScore({
      accountAgeDays: 365,
      hasVerifiedPhone: true,
      playtimeMinutes: 120,
      violationCount: 0,
      friendsInServer: 5,
    });

    expect(result.score).toBe(100);
    expect(result.riskLevel).toBe("trusted");
  });

  it("gives minimum score to a brand new suspicious player", async () => {
    const { calculateTrustScore } = await getModule();
    const result = calculateTrustScore({
      accountAgeDays: 0,
      hasVerifiedPhone: false,
      playtimeMinutes: 0,
      violationCount: 10,
      friendsInServer: 0,
    });

    expect(result.score).toBe(0);
    expect(result.riskLevel).toBe("untrusted");
  });

  it("penalizes violations correctly", async () => {
    const { calculateTrustScore } = await getModule();
    const noViolations = calculateTrustScore({
      accountAgeDays: 30,
      playtimeMinutes: 60,
      violationCount: 0,
      friendsInServer: 3,
    });

    const withViolations = calculateTrustScore({
      accountAgeDays: 30,
      playtimeMinutes: 60,
      violationCount: 2,
      friendsInServer: 3,
    });

    expect(noViolations.score).toBeGreaterThan(withViolations.score);
    // Each violation penalizes 10 points, 2 violations = 20 point penalty from the 30 weight
    expect(noViolations.score - withViolations.score).toBe(20);
  });

  it("caps violation penalty at the weight maximum", async () => {
    const { calculateTrustScore } = await getModule();
    const threeViolations = calculateTrustScore({
      accountAgeDays: 30,
      playtimeMinutes: 60,
      violationCount: 3,
      friendsInServer: 3,
    });
    const tenViolations = calculateTrustScore({
      accountAgeDays: 30,
      playtimeMinutes: 60,
      violationCount: 10,
      friendsInServer: 3,
    });

    // Both should have 0 violation points (penalty capped at 30)
    expect(threeViolations.score).toBe(tenViolations.score);
  });

  it("scales account age linearly up to 30 days", async () => {
    const { calculateTrustScore } = await getModule();
    const halfAge = calculateTrustScore({
      accountAgeDays: 15,
      playtimeMinutes: 60,
      violationCount: 0,
      friendsInServer: 3,
    });
    const fullAge = calculateTrustScore({
      accountAgeDays: 30,
      playtimeMinutes: 60,
      violationCount: 0,
      friendsInServer: 3,
    });

    // 15/30 * 20 = 10 vs 30/30 * 20 = 20, diff = 10 points
    expect(fullAge.score - halfAge.score).toBe(10);
  });

  it("assigns correct risk levels based on score", async () => {
    const { calculateTrustScore } = await getModule();
    const factors = {
      accountAgeDays: 0,
      playtimeMinutes: 0,
      violationCount: 0,
      friendsInServer: 0,
    };

    // Score of 30 (violations weight only) = suspicious
    const suspicious = calculateTrustScore({ ...factors });
    expect(suspicious.score).toBe(30);
    expect(suspicious.riskLevel).toBe("suspicious");
  });

  it("includes scoring breakdown in result", async () => {
    const { calculateTrustScore } = await getModule();
    const result = calculateTrustScore({
      accountAgeDays: 30,
      hasVerifiedPhone: true,
      playtimeMinutes: 60,
      violationCount: 0,
      friendsInServer: 3,
    });

    expect(result.factors.accountAgeDays).toBe(20);
    expect(result.factors.hasVerifiedPhone).toBe(15);
    expect(result.factors.playtimeMinutes).toBe(25);
    expect(result.factors.violationCount).toBe(30);
    expect(result.factors.friendsInServer).toBe(10);
  });

  it("treats verified phone as optional", async () => {
    const { calculateTrustScore } = await getModule();
    const withPhone = calculateTrustScore({
      accountAgeDays: 30,
      hasVerifiedPhone: true,
      playtimeMinutes: 60,
      violationCount: 0,
      friendsInServer: 3,
    });
    const withoutPhoneField = calculateTrustScore({
      accountAgeDays: 30,
      playtimeMinutes: 60,
      violationCount: 0,
      friendsInServer: 3,
    });

    // Without the field, phone points shouldn't be counted
    expect(withPhone.score).toBeGreaterThan(withoutPhoneField.score);
    expect(withPhone.score - withoutPhoneField.score).toBe(15);
  });
});

describe("isTrusted / isSuspicious", () => {
  it("correctly identifies trusted scores", async () => {
    const { isTrusted } = await import("./trust-score");
    expect(isTrusted({ score: 50, riskLevel: "normal", factors: {} })).toBe(true);
    expect(isTrusted({ score: 100, riskLevel: "trusted", factors: {} })).toBe(true);
    expect(isTrusted({ score: 49, riskLevel: "suspicious", factors: {} })).toBe(false);
  });

  it("correctly identifies suspicious scores", async () => {
    const { isSuspicious } = await import("./trust-score");
    expect(isSuspicious({ score: 24, riskLevel: "untrusted", factors: {} })).toBe(true);
    expect(isSuspicious({ score: 0, riskLevel: "untrusted", factors: {} })).toBe(true);
    expect(isSuspicious({ score: 25, riskLevel: "suspicious", factors: {} })).toBe(false);
  });
});

// ============================================================================
// Cache functions
// ============================================================================

describe("trust cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("os", { time: vi.fn(() => 1000), clock: vi.fn(() => 0) });
  });

  function makePlayer(id: number): Player {
    return { UserId: id } as unknown as Player;
  }

  it("cacheTrustScore + getCachedTrustScore round-trip", async () => {
    const { cacheTrustScore, getCachedTrustScore } = await import("./trust-score");
    const player = makePlayer(1);
    const score = { score: 80, riskLevel: "trusted" as const, factors: {} };

    cacheTrustScore(player, score);
    expect(getCachedTrustScore(player)).toEqual(score);
  });

  it("getCachedTrustScore returns undefined on cache miss", async () => {
    const { getCachedTrustScore } = await import("./trust-score");
    expect(getCachedTrustScore(makePlayer(999))).toBeUndefined();
  });

  it("getCachedTrustScore returns undefined when TTL expired", async () => {
    const mockTime = vi.fn(() => 1000);
    vi.stubGlobal("os", { time: mockTime, clock: vi.fn(() => 0) });

    const { cacheTrustScore, getCachedTrustScore } = await import("./trust-score");
    const player = makePlayer(2);
    cacheTrustScore(player, { score: 50, riskLevel: "normal", factors: {} });

    // Advance past TTL (60s)
    mockTime.mockReturnValue(1000 + 61);
    expect(getCachedTrustScore(player)).toBeUndefined();
  });

  it("invalidateTrustScore removes entry", async () => {
    const { cacheTrustScore, getCachedTrustScore, invalidateTrustScore } =
      await import("./trust-score");
    const player = makePlayer(3);
    cacheTrustScore(player, { score: 70, riskLevel: "normal", factors: {} });

    invalidateTrustScore(player);
    expect(getCachedTrustScore(player)).toBeUndefined();
  });

  it("cleanupTrustCache removes entry", async () => {
    const { cacheTrustScore, getCachedTrustScore, cleanupTrustCache } =
      await import("./trust-score");
    const player = makePlayer(4);
    cacheTrustScore(player, { score: 60, riskLevel: "normal", factors: {} });

    cleanupTrustCache(player);
    expect(getCachedTrustScore(player)).toBeUndefined();
  });
});
