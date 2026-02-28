/**
 * Starter Game Types
 */

// ============================================================================
// Player Data Types
// ============================================================================

export interface StarterPlayerData {
  /** Data schema version for persistence */
  readonly __version: number;
  /** Total coins collected */
  coins: number;
  /** Total kills */
  kills: number;
  /** Last played timestamp */
  lastPlayedAt: number;
}

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
  kills: number;

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
