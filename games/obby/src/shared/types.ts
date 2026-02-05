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
// Event Names
// ============================================================================

export const events = {
  checkpointReached: "ObbyCheckpointReached",
  stageCompleted: "ObbyStageCompleted",
  requestRespawn: "ObbyRequestRespawn",
  playerDataSync: "ObbyPlayerDataSync",
} as const;
