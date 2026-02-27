/**
 * Security types
 */

import { DEFAULT_TEMP_BAN_DURATION_HOURS } from "@broblox/constants";

// ============================================================================
// Detection Types
// ============================================================================

/** Severity levels for detected violations */
export type ViolationSeverity = "low" | "medium" | "high" | "critical";

/** Categories of detectable violations */
export type ViolationCategory =
  | "speed"
  | "teleport"
  | "fly"
  | "noclip"
  | "exploit"
  | "injection"
  | "rate-abuse"
  | "invalid-data"
  | "suspicious-pattern";

/** A detected violation */
export interface Violation {
  /** Player who committed the violation */
  player: Player;
  /** Type of violation */
  category: ViolationCategory;
  /** Severity level */
  severity: ViolationSeverity;
  /** Human-readable description */
  description: string;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Timestamp of detection */
  timestamp: number;
}

/** Violation handler callback */
export type ViolationHandler = (violation: Violation) => void;

// ============================================================================
// Enforcement Types
// ============================================================================

/** Available enforcement actions */
export type EnforcementAction = "none" | "warn" | "kick" | "shadow" | "temp-ban" | "perm-ban";

/** Configuration for automatic enforcement */
export interface EnforcementConfig {
  /** Action to take based on severity */
  severityActions: Record<ViolationSeverity, EnforcementAction>;
  /** Number of violations before escalation */
  escalationThreshold: number;
  /** Time window for counting violations (seconds) */
  windowSeconds: number;
  /** Custom kick message */
  kickMessage?: string;
  /** Duration in hours for temp-ban actions (default: 24) */
  tempBanDurationHours?: number;
  /**
   * Called when a ban action (temp-ban or perm-ban) is triggered.
   * Wire this to your DataStore / @broblox/moderation to persist the ban.
   * The enforcer still kicks the player immediately after calling this.
   */
  onBan?: (
    player: Player,
    type: "TEMPORARY" | "PERMANENT",
    reason: string,
    durationHours?: number
  ) => void;
}

/** Default enforcement configuration */
export const DEFAULT_ENFORCEMENT_CONFIG: EnforcementConfig = {
  severityActions: {
    low: "none",
    medium: "warn",
    high: "kick",
    critical: "kick",
  },
  escalationThreshold: 3,
  windowSeconds: 60,
  kickMessage: "Suspicious activity detected",
  tempBanDurationHours: DEFAULT_TEMP_BAN_DURATION_HOURS,
};

// ============================================================================
// Trust Score Types
// ============================================================================

/** Factors that affect trust score */
export interface TrustFactors {
  /** Account age in days */
  accountAgeDays: number;
  /** Whether player has verified phone */
  hasVerifiedPhone?: boolean;
  /** Total playtime in game (minutes) */
  playtimeMinutes: number;
  /** Number of violations in session */
  violationCount: number;
  /** Friends in server */
  friendsInServer: number;
}

/** Trust score result */
export interface TrustScore {
  /** Score from 0-100 */
  score: number;
  /** Risk level */
  riskLevel: "trusted" | "normal" | "suspicious" | "untrusted";
  /** Breakdown of scoring factors */
  factors: Partial<Record<keyof TrustFactors, number>>;
}
