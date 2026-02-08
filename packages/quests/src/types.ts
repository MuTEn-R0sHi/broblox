/**
 * @rbx/quests — Type Definitions
 *
 * Types for quest definitions, objectives, progress tracking, and configuration.
 */

import type { RewardEntry } from "@rbx/rewards";

// ============================================================================
// Quest Objective
// ============================================================================

/** Objective types */
export type ObjectiveType =
  | "kill"
  | "collect"
  | "visit"
  | "interact"
  | "craft"
  | "score"
  | "survive"
  | "stage_complete"
  | "deathless_stages"
  | "custom";

/** A single objective within a quest */
export interface QuestObjective {
  /** Unique objective ID within the quest */
  id: string;
  /** Human-readable description */
  description: string;
  /** Type of objective */
  type: ObjectiveType;
  /** Target value to reach (e.g., kill 10 enemies → target = 10) */
  target: number;
  /** Optional metadata (e.g., specific enemy type, area name) */
  metadata?: Map<string, string>;
}

// ============================================================================
// Quest Definition
// ============================================================================

/** Repeating schedule for quests */
export type QuestSchedule = "once" | "daily" | "weekly" | "seasonal";

/** Rarity / difficulty tier */
export type QuestTier = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** A quest blueprint (static definition) */
export interface QuestDefinition {
  /** Unique quest ID */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Schedule / repeat behaviour */
  schedule: QuestSchedule;
  /** Difficulty tier */
  tier: QuestTier;
  /** Objectives to complete */
  objectives: QuestObjective[];
  /** Rewards granted on completion */
  rewards: RewardEntry[];
  /** Tags for filtering */
  tags?: string[];
  /** Minimum level to accept */
  minLevel?: number;
  /** Maximum level (0 = no cap) */
  maxLevel?: number;
  /** Whether the quest auto-accepts or must be manually accepted */
  autoAccept?: boolean;
  /** Time limit in seconds (0 = no limit) */
  timeLimit?: number;
  /** Prerequisite quest IDs that must be completed first */
  prerequisites?: string[];
}

// ============================================================================
// Quest Progress (Per-Player State)
// ============================================================================

/** Status of an active quest */
export type QuestStatus = "available" | "active" | "completed" | "failed" | "expired";

/** Progress on a single objective */
export interface ObjectiveProgress {
  objectiveId: string;
  current: number;
  target: number;
  completed: boolean;
}

/** A player's state for a single quest */
export interface QuestProgress {
  questId: string;
  status: QuestStatus;
  objectives: ObjectiveProgress[];
  acceptedAt: number;
  completedAt?: number;
  /** For repeating quests — last reset timestamp */
  lastReset?: number;
}

/** All quest progress for a player (serialisable) */
export interface QuestPlayerData {
  playerId: number;
  activeQuests: QuestProgress[];
  completedQuestIds: string[];
  version: number;
}

// ============================================================================
// Events
// ============================================================================

export interface QuestAcceptedEvent {
  playerId: number;
  questId: string;
}

export interface QuestCompletedEvent {
  playerId: number;
  questId: string;
  rewards: RewardEntry[];
}

export interface ObjectiveProgressEvent {
  playerId: number;
  questId: string;
  objectiveId: string;
  current: number;
  target: number;
}

export type QuestAcceptedCallback = (event: QuestAcceptedEvent) => void;
export type QuestCompletedCallback = (event: QuestCompletedEvent) => void;
export type ObjectiveProgressCallback = (event: ObjectiveProgressEvent) => void;

// ============================================================================
// Configuration
// ============================================================================

export interface QuestsConfig {
  /** Maximum number of active quests per player */
  maxActiveQuests?: number;
  /** DataStore name */
  datastoreName?: string;
  /** Enable debug logging */
  enableLogging?: boolean;
}

export const DEFAULT_QUESTS_CONFIG: Required<QuestsConfig> = {
  maxActiveQuests: 10,
  datastoreName: "PlayerQuests_v1",
  enableLogging: false,
};
