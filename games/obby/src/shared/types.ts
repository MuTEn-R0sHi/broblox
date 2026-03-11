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
  /** World this checkpoint belongs to */
  worldId: string;
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

/** Player attributes (base values, before gear bonuses) */
export interface PlayerAttributes {
  /** Speed attribute: 10.0 – 30.0 */
  speed: number;
  /** Jump attribute: 30.0 – 70.0 */
  jump: number;
  /** Stamina attribute: 5.0 – 30.0 */
  stamina: number;
}

/** Lifetime training rep counters (for diminishing returns) */
export interface TrainingReps {
  speed: number;
  jump: number;
  stamina: number;
}

/** Per-world progression data */
export interface WorldProgressData {
  currentStage: number;
  currentCheckpoint: number;
  completions: number;
  bestFullRunTime: number | undefined;
  stageProgress: Record<string, StageProgress>;
}

/** A single inventory slot */
export interface InventorySlot {
  itemId: string;
  quantity: number;
}

/** Equipment slot names */
export type EquipSlot =
  | "feet"
  | "back"
  | "body"
  | "accessory1"
  | "accessory2"
  | "consumable1"
  | "consumable2"
  | "consumable3";

/** v1 schema (legacy — kept for migration) */
export interface ObbyPlayerDataV1 {
  readonly __version: number;
  currentCheckpoint: number;
  currentStage: number;
  coins: number;
  totalDeaths: number;
  totalCompletions: number;
  bestFullRunTime?: number;
  stageProgress: Record<string, StageProgress>;
  unlockedItems: string[];
  equippedTrail?: string;
  lastPlayedAt: number;
}

/** Current player data schema (v2) */
export interface ObbyPlayerData {
  /** Data schema version for persistence */
  readonly __version: number;

  /** Base attributes (before gear) */
  attributes: PlayerAttributes;
  /** Lifetime training reps (for diminishing returns) */
  trainingReps: TrainingReps;

  /** Total coins collected */
  coins: number;

  /** Per-world progression */
  worlds: Record<string, WorldProgressData>;

  /** Gear inventory */
  inventory: InventorySlot[];
  /** Equipped gear: slot → gearId */
  equipped: Partial<Record<EquipSlot, string>>;
  /** Owned gear IDs */
  ownedGear: string[];

  /** Total deaths (global) */
  totalDeaths: number;
  /** Total world completions (any world) */
  totalCompletions: number;

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
  cause: "fall" | "killbrick" | "hazard" | "reset" | "unknown";
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
// Attribute & Training Payloads
// ============================================================================

/** Server → Client: Full attribute sync (base + effective) */
export interface AttributeSyncPayload {
  base: PlayerAttributes;
  effective: PlayerAttributes;
  trainingReps: TrainingReps;
}

/** Server → Client: Training rep completed */
export interface TrainingCompletePayload {
  attribute: AttributeType;
  newValue: number;
  gain: number;
}

/** Client → Server: Start training at a station */
export interface TrainingRequestPayload {
  stationType: AttributeType;
}

/** Server → Client: Stamina state sync */
export interface StaminaSyncPayload {
  current: number;
  max: number;
  exhausted: boolean;
}

// ============================================================================
// World System Types
// ============================================================================

/** World configuration */
export interface WorldConfig {
  id: string;
  displayName: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | "extreme";
  unlockRequirements: {
    speed: number;
    jump: number;
    stamina: number;
    worldsCompleted?: string[];
  };
  stageCount: number;
  coinMultiplier: number;
}

/** Server → Client: Player's active world changed */
export interface WorldChangedPayload {
  worldId: string | undefined;
  worldName: string | undefined;
}

/** Client → Server: Request to enter a world */
export interface EnterWorldRequestPayload {
  worldId: string;
}

// ============================================================================
// Hazard Types
// ============================================================================

/** Server → Client: A hazard instance toggled state (active/inactive). */
export interface HazardTogglePayload {
  instanceKey: string;
  active: boolean;
}

/** Server → Client: Player took hazard damage. */
export interface HazardDamagePayload {
  hazardId: string;
  damage: number;
}

// ============================================================================
// Obstacle Types
// ============================================================================

/** Server → Client: An obstacle instance's state updated (position, rotation, etc.). */
export interface ObstacleUpdatePayload {
  instanceKey: string;
  progress: number;
  active: boolean;
}

/** Server → Client: An obstacle instance toggled state (blink platform on/off). */
export interface ObstacleTogglePayload {
  instanceKey: string;
  active: boolean;
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
  /** CollectionService tag for training stations */
  TRAINING_STATION_TAG: "ObbyTrainingStation",

  // ── Attribute defaults & caps ──────────────────────────────────────
  /** Default Speed attribute for new players */
  DEFAULT_SPEED: 10,
  /** Default Jump attribute for new players */
  DEFAULT_JUMP: 30,
  /** Default Stamina attribute for new players */
  DEFAULT_STAMINA: 5,
  /** Max Speed attribute */
  MAX_SPEED: 30,
  /** Max Jump attribute */
  MAX_JUMP: 70,
  /** Max Stamina attribute */
  MAX_STAMINA: 30,

  // ── Training tuning ────────────────────────────────────────────────
  /** Attribute gain per training rep */
  TRAINING_GAIN: 0.1,
  /** Reduced gain per rep once attribute exceeds this threshold */
  TRAINING_DIMINISH_THRESHOLD: 20,
  /** Attribute gain per rep after diminishing threshold */
  TRAINING_GAIN_DIMINISHED: 0.05,
  /** Cooldown between reps at the same station (seconds) */
  TRAINING_COOLDOWN: 2,

  // ── Humanoid formulae constants ────────────────────────────────────
  /** Humanoid.WalkSpeed = WALK_SPEED_BASE + effectiveSpeed × WALK_SPEED_SCALE */
  WALK_SPEED_BASE: 6,
  WALK_SPEED_SCALE: 0.8,
  /** RunSpeed = WalkSpeed × RUN_SPEED_MULTIPLIER */
  RUN_SPEED_MULTIPLIER: 1.5,

  // ── Stamina tuning ─────────────────────────────────────────────────
  /** Stamina drain rate while sprinting (units/sec) */
  STAMINA_DRAIN_RATE: 1,
  /** Stamina recharge rate while walking (units/sec) */
  STAMINA_RECHARGE_RATE: 0.5,
  /** Stamina recharge rate while standing still (units/sec) */
  STAMINA_RECHARGE_IDLE_RATE: 1,
  /** Cooldown after stamina is fully depleted before recharge begins (seconds) */
  STAMINA_EXHAUSTION_COOLDOWN: 2,
} as const;

/** Attribute type keys */
export type AttributeType = keyof PlayerAttributes;

// ============================================================================
// Marketplace Payloads
// ============================================================================

/** Client → Server: buy a developer product */
export interface BuyProductRequest {
  productId: number;
}

/** Client → Server: check game pass ownership */
export interface CheckGamePassRequest {
  passId: number;
}

/** Server → Client: game pass ownership result */
export interface GamePassOwnershipPayload {
  passId: number;
  owned: boolean;
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

/** Client → Server: equip a gear item */
export interface EquipGearRequest {
  gearId: string;
}

/** Client → Server: unequip a gear slot */
export interface UnequipGearRequest {
  slot: string;
}

/** Client → Server: buy a gear item from shop */
export interface BuyGearRequest {
  gearId: string;
}

/** Server → Client: gear buy result */
export interface BuyGearResultPayload {
  success: boolean;
  message?: string;
}

/** Server → Client: equipment state sync */
export interface EquipmentSyncPayload {
  ownedGear: string[];
  equipped: Record<string, string>;
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
import type { GearDefinition } from "@broblox/equipment";

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

  // Equipment / Gear
  ownedGear: string[];
  equippedGear: Record<string, string>;
  gearCatalog: GearDefinition[];

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
  GearDefinition,
};
