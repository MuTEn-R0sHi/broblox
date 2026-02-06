/**
 * Codes Types
 *
 * Types for the redeemable promo-code system.
 */

// ============================================================================
// Reward Types
// ============================================================================

/**
 * A single reward granted when a code is redeemed.
 * The `type` field determines the kind of reward; `amount` is optional
 * and depends on the reward type.
 */
export interface CodeReward {
  /** Reward category (e.g. "coins", "gems", "item", "xp") */
  type: string;
  /** Human-readable label shown to the player */
  label: string;
  /** Numeric amount (for currency / XP rewards) */
  amount?: number;
  /** Asset / item identifier (for item rewards) */
  assetId?: string;
}

// ============================================================================
// Code Definition
// ============================================================================

export type CodeStatus = "ACTIVE" | "EXPIRED" | "DISABLED";

/**
 * A redeemable promo code registered by the game developer.
 */
export interface RedeemableCode {
  /** The code string players enter (stored UPPER-CASE) */
  code: string;
  /** Human-readable description */
  description: string;
  /** Current status */
  status: CodeStatus;
  /** Rewards granted on redemption */
  rewards: CodeReward[];
  /** Maximum total redemptions across all players (0 = unlimited) */
  maxUses: number;
  /** Maximum redemptions per player (default 1) */
  perPlayerLimit: number;
  /** Unix timestamp (seconds) when the code expires (0 = never) */
  expiresAt: number;
  /** Unix timestamp (seconds) when the code was created */
  createdAt: number;
  /** Current global redemption count */
  useCount: number;
}

// ============================================================================
// Redemption Record
// ============================================================================

/**
 * A record of a single code redemption by a player, persisted in DataStore.
 */
export interface CodeRedemptionRecord {
  /** The code that was redeemed */
  code: string;
  /** Unix timestamp of redemption */
  redeemedAt: number;
}

// ============================================================================
// Result Types
// ============================================================================

export type RedeemResultStatus =
  | "SUCCESS"
  | "INVALID_CODE"
  | "ALREADY_REDEEMED"
  | "MAX_USES_REACHED"
  | "EXPIRED"
  | "DISABLED";

export interface RedeemResult {
  /** Whether the redemption succeeded */
  success: boolean;
  /** Status code */
  status: RedeemResultStatus;
  /** Human-readable message */
  message: string;
  /** Rewards granted (only on success) */
  rewards?: CodeReward[];
}

// ============================================================================
// Configuration
// ============================================================================

export interface CodesConfig {
  /** DataStore name for player redemption records */
  datastoreName?: string;
  /** Whether to log code operations */
  enableLogging?: boolean;
  /** Callback invoked on successful redemption */
  onRedeem?: (playerId: number, code: string, rewards: CodeReward[]) => void;
}

export const DEFAULT_CODES_CONFIG: Required<CodesConfig> = {
  datastoreName: "PlayerCodes",
  enableLogging: true,
  onRedeem: () => {},
};
