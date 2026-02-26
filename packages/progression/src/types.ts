/**
 * @broblox/progression — Type Definitions
 *
 * Types for XP, levels, prestige/rebirth, and configuration.
 */

// ============================================================================
// XP / Level Curve
// ============================================================================

/** Function that returns XP required to reach a given level */
export type XpCurveFunction = (level: number) => number;

/** Built-in XP curve presets */
export type XpCurvePreset = "linear" | "quadratic" | "exponential" | "custom";

/** A player's progression state (serializable to DataStore) */
export interface ProgressionData {
  /** Player user ID */
  playerId: number;
  /** Current level (1-based) */
  level: number;
  /** Current XP within the current level */
  currentXp: number;
  /** Total XP earned across all time (including prestige resets) */
  totalXp: number;
  /** Current prestige tier (0 = no prestige) */
  prestige: number;
  /** Timestamps of each prestige event */
  prestigeHistory: number[];
  /** Schema version */
  version: number;
}

// ============================================================================
// Level-Up Events
// ============================================================================

/** Emitted when a player levels up */
export interface LevelUpEvent {
  playerId: number;
  previousLevel: number;
  newLevel: number;
  prestige: number;
  totalXp: number;
}

/** Emitted when a player prestiges */
export interface PrestigeEvent {
  playerId: number;
  previousPrestige: number;
  newPrestige: number;
  levelAtPrestige: number;
  totalXp: number;
}

/** Callback for level-up events */
export type LevelUpCallback = (event: LevelUpEvent) => void;

/** Callback for prestige events */
export type PrestigeCallback = (event: PrestigeEvent) => void;

// ============================================================================
// Configuration
// ============================================================================

/** Progression system configuration */
export interface ProgressionConfig {
  /** Maximum level (0 = unlimited) */
  maxLevel?: number;
  /** XP curve preset or custom function */
  xpCurve?: XpCurvePreset;
  /** Custom XP curve function (used when xpCurve = "custom") */
  xpCurveFunction?: XpCurveFunction;
  /** Base XP for level 2 (used by presets) */
  baseXp?: number;
  /** Growth factor for XP curve (used by presets) */
  growthFactor?: number;
  /** Whether prestige is enabled */
  prestigeEnabled?: boolean;
  /** Minimum level required to prestige */
  prestigeMinLevel?: number;
  /** Maximum prestige tier (0 = unlimited) */
  maxPrestige?: number;
  /** XP multiplier bonus per prestige tier (e.g., 0.1 = 10% more XP per prestige) */
  prestigeXpBonus?: number;
  /** DataStore name for persistence */
  datastoreName?: string;
  /** Enable debug logging */
  enableLogging?: boolean;
}

/** Default configuration */
export const DEFAULT_PROGRESSION_CONFIG: Required<ProgressionConfig> = {
  maxLevel: 100,
  xpCurve: "quadratic",
  xpCurveFunction: (level: number) => level * 100,
  baseXp: 100,
  growthFactor: 1.5,
  prestigeEnabled: false,
  prestigeMinLevel: 100,
  maxPrestige: 10,
  prestigeXpBonus: 0.1,
  datastoreName: "PlayerProgression_v1",
  enableLogging: false,
};

/** Current progression data schema version */
export const PROGRESSION_DATA_VERSION = 1;
