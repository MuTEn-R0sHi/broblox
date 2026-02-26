/**
 * @broblox/battle-pass — Types
 *
 * Seasonal progression with free and premium tracks.
 */

/**
 * Reward type (mirrors @broblox/rewards — inlined to avoid cross-package import
 * that breaks rbxtsc Rojo resolution with pnpm workspace symlinks).
 */
type RewardType = "currency" | "xp" | "item" | "boost" | "cosmetic" | "custom";

/** A single reward entry (structurally identical to @broblox/rewards RewardEntry). */
interface RewardEntry {
  type: RewardType;
  amount: number;
  itemId?: string;
  label?: string;
}

// ---------------------------------------------------------------------------
// Track & Tier
// ---------------------------------------------------------------------------

export type RewardTrack = "free" | "premium";

export interface TierReward {
  /** Unique reward identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Which track this reward belongs to */
  readonly track: RewardTrack;
  /** The reward granted at this tier */
  readonly reward: RewardEntry;
}

export interface BattlePassTier {
  /** 1-based tier number */
  readonly tier: number;
  /** XP required to reach this tier from the previous tier */
  readonly xpRequired: number;
  /** Rewards available at this tier */
  readonly rewards: ReadonlyArray<TierReward>;
}

// ---------------------------------------------------------------------------
// Season definition
// ---------------------------------------------------------------------------

export interface SeasonDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Tiers in order (index 0 = tier 1) */
  readonly tiers: ReadonlyArray<BattlePassTier>;
  /** Whether the season is currently active */
  readonly active: boolean;
  /** Start timestamp */
  readonly startTime: number;
  /** End timestamp */
  readonly endTime: number;
}

// ---------------------------------------------------------------------------
// Player data
// ---------------------------------------------------------------------------

export interface BattlePassPlayerData {
  /** Current season ID */
  seasonId: string;
  /** Total XP earned this season */
  xp: number;
  /** Current tier (1-based) */
  tier: number;
  /** Whether premium is unlocked */
  premiumUnlocked: boolean;
  /** Set of claimed reward IDs (idempotent claims) */
  claimedRewards: string[];
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type BattlePassStatus =
  | "success"
  | "season_not_found"
  | "season_inactive"
  | "already_claimed"
  | "tier_not_reached"
  | "premium_required"
  | "already_premium"
  | "max_tier"
  | "reward_not_found"
  | "invalid_amount";

export interface BattlePassResult {
  readonly ok: boolean;
  readonly status: BattlePassStatus;
}

export interface XpResult extends BattlePassResult {
  readonly previousTier?: number;
  readonly newTier?: number;
  readonly totalXp?: number;
}

export interface ClaimResult extends BattlePassResult {
  readonly reward?: TierReward;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface BattlePassTierUpEvent {
  readonly playerId: number;
  readonly seasonId: string;
  readonly previousTier: number;
  readonly newTier: number;
  readonly timestamp: number;
}

export interface BattlePassClaimEvent {
  readonly playerId: number;
  readonly seasonId: string;
  readonly tier: number;
  readonly rewardId: string;
  readonly track: RewardTrack;
  readonly timestamp: number;
}

export type TierUpCallback = (event: BattlePassTierUpEvent) => void;
export type ClaimCallback = (event: BattlePassClaimEvent) => void;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface BattlePassConfig {
  readonly datastoreName?: string;
  readonly enableLogging?: boolean;
}

export const DEFAULT_BATTLE_PASS_CONFIG: BattlePassConfig = {
  datastoreName: "BattlePassData",
  enableLogging: false,
};

export const VERSION = "0.1.0";
