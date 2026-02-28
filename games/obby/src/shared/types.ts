/**
 * Obby Game Types
 */

// ============================================================================
// Stage Types
// ============================================================================

export interface StageConfig {
  /** Stage number (1-indexed) */
  stageNumber: number;
  /** Display name */
  displayName: string;
  /** Difficulty rating */
  difficulty: "easy" | "medium" | "hard" | "extreme";
  /** Coins awarded for completion */
  coinReward: number;
  /** Has a secret area */
  hasSecret?: boolean;
}

export interface StageProgress {
  /** Stage number */
  stageNumber: number;
  /** First completed timestamp */
  firstCompletedAt: number;
  /** Best completion time (seconds) */
  bestTime?: number;
  /** Number of completions */
  completions: number;
  /** Deaths on this stage */
  deaths: number;
}

// ============================================================================
// Checkpoint Types
// ============================================================================

export interface CheckpointData {
  /** Stage this checkpoint belongs to */
  stageNumber: number;
  /** Checkpoint index within stage */
  checkpointIndex: number;
  /** World position */
  position: Vector3;
  /** Rotation angle (degrees) */
  rotation: number;
}

// ============================================================================
// Player Data Types
// ============================================================================

export interface ObbyPlayerData {
  /** Data schema version for persistence */
  readonly __version: number;
  /** Current checkpoint (highest reached) */
  currentCheckpoint: number;
  /** Current stage number */
  currentStage: number;
  /** Total coins collected */
  coins: number;
  /** Total deaths */
  totalDeaths: number;
  /** Total completions (full obby) */
  totalCompletions: number;
  /** Best full run time (seconds) */
  bestFullRunTime?: number;
  /** Stage-by-stage progress */
  stageProgress: Record<string, StageProgress>;
  /** Unlocked cosmetics/trails */
  unlockedItems: string[];
  /** Equipped trail */
  equippedTrail?: string;
  /** Last played timestamp */
  lastPlayedAt: number;
}

// ============================================================================
// Events
// ============================================================================

export interface CheckpointReachedEvent {
  playerId: number;
  checkpointId: number;
  stageNumber: number;
  isNew: boolean;
}

export interface StageCompletedEvent {
  playerId: number;
  stageNumber: number;
  completionTime: number;
  isNewBest: boolean;
  coinsEarned: number;
}

export interface PlayerDeathEvent {
  playerId: number;
  stageNumber: number;
  position: Vector3;
  cause: "fall" | "killbrick" | "reset" | "unknown";
}

export interface ObbyCompletedEvent {
  playerId: number;
  totalTime: number;
  isNewBest: boolean;
  totalDeaths: number;
}

// ============================================================================
// Network Payloads
// ============================================================================

export interface CheckpointTouchPayload {
  checkpointId: number;
}

export interface RespawnRequestPayload {
  toCheckpoint?: number;
}

export interface StageDataPayload {
  stageNumber: number;
  progress: StageProgress;
}

export interface LeaderboardEntryDto {
  userId: number;
  playerName: string;
  completions: number;
  bestTime?: number;
  rank: number;
}

export interface LeaderboardUpdatePayload {
  updatedAt: number;
  entries: LeaderboardEntryDto[];
}

export interface LeaderboardRefreshStatusPayload {
  ok: boolean;
  /** If ok=false due to rate limiting, how long to wait before retrying (seconds). */
  retryAfter?: number;
}

// ============================================================================
// Constants
// ============================================================================

export const OBBY_CONSTANTS = {
  /** Default coins per stage */
  DEFAULT_STAGE_COINS: 10,
  /** Bonus coins for completing under time threshold */
  TIME_BONUS_COINS: 5,
  /** Minimum respawn delay (seconds) */
  RESPAWN_DELAY: 0.5,
  /** Kill brick damage */
  KILL_BRICK_DAMAGE: 100,
  /** Fall height before respawn (studs below lowest checkpoint) */
  FALL_HEIGHT: 50,
  /** CollectionService tag for stages */
  STAGE_TAG: "ObbyStage",
  /** CollectionService tag for checkpoints */
  CHECKPOINT_TAG: "ObbyCheckpoint",
  /** CollectionService tag for end zones */
  END_ZONE_TAG: "ObbyEndZone",
  /** CollectionService tag for kill zones */
  KILL_ZONE_TAG: "ObbyKillZone",
  /** CollectionService tag for coins */
  COIN_TAG: "ObbyCoin",
} as const;

// ============================================================================
// Remote Request Payloads (Client → Server)
// ============================================================================

/** Payload for code redemption */
export interface RedeemCodeRequest {
  code: string;
}

/** Payload for egg hatching */
export interface HatchEggRequest {
  eggId: string;
  count: number;
}

/** Payload for equipping a pet */
export interface EquipPetRequest {
  instanceId: string;
}

/** Payload for unequipping a pet */
export interface UnequipPetRequest {
  instanceId: string;
}

/** Payload for equipping a cosmetic */
export interface EquipCosmeticRequest {
  cosmeticId: string;
  slot: string;
}

/** Payload for unequipping a cosmetic */
export interface UnequipCosmeticRequest {
  slot: string;
}

/** Payload for claiming a battle pass reward */
export interface ClaimBattlePassRewardRequest {
  rewardId: string;
}

// ============================================================================
// Remote Response Payloads (Server → Client via server functions)
// ============================================================================

/** Code redemption result sent back to client */
export interface CodeRedeemResultPayload {
  success: boolean;
  message?: string;
}

// ============================================================================
// Full Player Data Sync (sent on join & after actions)
// ============================================================================

import type { ItemInstance } from "@broblox/inventory";
import type { QuestProgress } from "@broblox/quests";
import type { PetInstance } from "@broblox/pets";
import type { BattlePassPlayerData } from "@broblox/battle-pass";
import type { DailyRewardDay, RewardEntry } from "@broblox/rewards";
import type { HatchResult } from "@broblox/gacha";

/** Comprehensive player data sync — serializable for remotes */
export interface FullPlayerDataPayload {
  // Core
  coins: number;
  currentStage: number;
  currentCheckpoint: number;

  // Progression
  level: number;
  xp: number;
  xpForNext: number;
  prestige: number;

  // Inventory
  items: ItemInstance[];
  maxSlots: number;

  // Quests
  activeQuests: QuestProgress[];
  completedQuestIds: string[];

  // Pets
  pets: PetInstance[];

  // Cosmetics
  ownedCosmetics: string[];
  equippedCosmetics: Record<string, string>;

  // Battle Pass
  battlePass?: BattlePassPlayerData;

  // Daily Rewards
  dailyCanClaim: boolean;
  dailyCurrentDay: number;
  dailyStreak: number;
  dailyTimeUntilNext: number;
  dailyRewardCycle: DailyRewardDay[];
}

/** Re-export package types used by UI screens & remotes */
export type {
  ItemInstance,
  QuestProgress,
  PetInstance,
  BattlePassPlayerData,
  DailyRewardDay,
  RewardEntry,
  HatchResult,
};
