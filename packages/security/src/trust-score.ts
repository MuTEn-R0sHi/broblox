/**
 * Trust Score System
 *
 * Calculates a trust score for players based on various factors.
 * Used for adaptive enforcement and matchmaking.
 */

import { TrustFactors, TrustScore } from "./types";
import { TRUST_SCORE_CACHE_TTL_SEC } from "@broblox/constants";

// ============================================================================
// Score Weights
// ============================================================================

/** Weight multipliers for each factor */
const WEIGHTS = {
  accountAge: 20,
  verifiedPhone: 15,
  playtime: 25,
  violations: 30,
  friends: 10,
} as const;

// ============================================================================
// Trust Score Calculator
// ============================================================================

/**
 * Calculate trust score from factors.
 * Returns score from 0-100.
 */
export function calculateTrustScore(factors: TrustFactors): TrustScore {
  const breakdown: Partial<Record<keyof TrustFactors, number>> = {};
  let total = 0;

  // Account age (0-20 points)
  // 30+ days = full points, scales down
  const ageScore = math.min(1, factors.accountAgeDays / 30);
  breakdown.accountAgeDays = ageScore * WEIGHTS.accountAge;
  total += breakdown.accountAgeDays;

  // Verified phone (0-15 points)
  if (factors.hasVerifiedPhone !== undefined) {
    breakdown.hasVerifiedPhone = factors.hasVerifiedPhone ? WEIGHTS.verifiedPhone : 0;
    total += breakdown.hasVerifiedPhone;
  }

  // Playtime (0-25 points)
  // 60+ minutes = full points, scales up
  const playtimeScore = math.min(1, factors.playtimeMinutes / 60);
  breakdown.playtimeMinutes = playtimeScore * WEIGHTS.playtime;
  total += breakdown.playtimeMinutes;

  // Violations (0-30 points, inverted)
  // 0 violations = full points, each violation loses 10
  const violationPenalty = math.min(WEIGHTS.violations, factors.violationCount * 10);
  breakdown.violationCount = WEIGHTS.violations - violationPenalty;
  total += breakdown.violationCount;

  // Friends in server (0-10 points)
  // 3+ friends = full points
  const friendsScore = math.min(1, factors.friendsInServer / 3);
  breakdown.friendsInServer = friendsScore * WEIGHTS.friends;
  total += breakdown.friendsInServer;

  // Normalize to 0-100
  const score = math.clamp(math.floor(total), 0, 100);

  // Determine risk level
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

  return {
    score,
    riskLevel,
    factors: breakdown,
  };
}

// ============================================================================
// Player Trust Cache
// ============================================================================

const trustCache = new Map<number, { score: TrustScore; timestamp: number }>();

/**
 * Get cached trust score for player.
 * Returns undefined if not cached or expired.
 */
export function getCachedTrustScore(player: Player): TrustScore | undefined {
  const cached = trustCache.get(player.UserId);
  if (!cached) {
    return undefined;
  }

  if (os.time() - cached.timestamp > TRUST_SCORE_CACHE_TTL_SEC) {
    trustCache.delete(player.UserId);
    return undefined;
  }

  return cached.score;
}

/**
 * Cache a trust score for player.
 */
export function cacheTrustScore(player: Player, score: TrustScore): void {
  trustCache.set(player.UserId, {
    score,
    timestamp: os.time(),
  });
}

/**
 * Invalidate cached trust score.
 */
export function invalidateTrustScore(player: Player): void {
  trustCache.delete(player.UserId);
}

// ============================================================================
// Quick Helpers
// ============================================================================

/**
 * Check if player should be trusted (score >= 50).
 */
export function isTrusted(score: TrustScore): boolean {
  return score.score >= 50;
}

/**
 * Check if player is suspicious (score < 25).
 */
export function isSuspicious(score: TrustScore): boolean {
  return score.score < 25;
}

/**
 * Clean up trust cache for a player (call on leave).
 */
export function cleanupTrustCache(player: Player): void {
  trustCache.delete(player.UserId);
}
