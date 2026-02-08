/**
 * Progression Store
 *
 * Per-player XP, levels, and prestige management with DataStore persistence.
 * Supports configurable XP curves (linear, quadratic, exponential, custom).
 */

import { createLogger } from "@rbx/core";
import { Counter } from "@rbx/observability";
import type {
  ProgressionData,
  ProgressionConfig,
  LevelUpEvent,
  PrestigeEvent,
  LevelUpCallback,
  PrestigeCallback,
  XpCurveFunction,
} from "./types";

const xpGained = new Counter("progression_xp_gained");
const levelUps = new Counter("progression_level_ups");
const prestiges = new Counter("progression_prestiges");
const saveAttempts = new Counter("progression_save_attempts");
const saveFailures = new Counter("progression_save_failures");

const DEFAULT_CONFIG: Required<ProgressionConfig> = {
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

/**
 * Manages a single player's XP, level, and prestige progression.
 */
export class ProgressionStore {
  private playerId: number;
  private data: ProgressionData;
  private config: Required<ProgressionConfig>;
  private xpForLevel: XpCurveFunction;
  private store: DataStore | undefined;
  private dirty = false;
  private logger: ReturnType<typeof createLogger> | undefined;

  private levelUpCallbacks: LevelUpCallback[] = [];
  private prestigeCallbacks: PrestigeCallback[] = [];

  constructor(playerId: number, config?: ProgressionConfig) {
    this.playerId = playerId;
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };

    this.data = {
      playerId,
      level: 1,
      currentXp: 0,
      totalXp: 0,
      prestige: 0,
      prestigeHistory: [],
      version: 1,
    };

    this.xpForLevel = this.buildXpCurve();

    if (this.config.enableLogging) {
      this.logger = createLogger(`Progression.Player${playerId}`);
    }
  }

  // --------------------------------------------------------------------------
  // XP Curve
  // --------------------------------------------------------------------------

  private buildXpCurve(): XpCurveFunction {
    const base = this.config.baseXp;
    const growth = this.config.growthFactor;

    switch (this.config.xpCurve) {
      case "linear":
        return (level: number) => base * level;
      case "quadratic":
        return (level: number) => math.floor(base * level * level * growth);
      case "exponential":
        return (level: number) => math.floor(base * math.pow(growth, level - 1));
      case "custom":
        return this.config.xpCurveFunction;
      default:
        return (level: number) => math.floor(base * level * level * growth);
    }
  }

  // --------------------------------------------------------------------------
  // Init / Load / Save
  // --------------------------------------------------------------------------

  /** Initialize DataStore connection. */
  init(): void {
    const DataStoreService = game.GetService("DataStoreService") as DataStoreService;
    this.store = DataStoreService.GetDataStore(this.config.datastoreName);
  }

  /** Load progression from DataStore. */
  load(): boolean {
    if (!this.store) return false;

    const [ok, raw] = pcall(() => this.store!.GetAsync(`progression_${this.playerId}`));
    if (!ok) return false;

    if (raw !== undefined && typeIs(raw, "table")) {
      const saved = raw as unknown as ProgressionData;
      this.data = {
        playerId: this.playerId,
        level: math.max(1, saved.level ?? 1),
        currentXp: math.max(0, saved.currentXp ?? 0),
        totalXp: math.max(0, saved.totalXp ?? 0),
        prestige: math.max(0, saved.prestige ?? 0),
        prestigeHistory: saved.prestigeHistory ?? [],
        version: saved.version ?? 1,
      };
      this.logger?.info(`Loaded: level ${this.data.level}, xp ${this.data.currentXp}`);
    }

    this.dirty = false;
    return true;
  }

  /** Save progression to DataStore. */
  save(): boolean {
    if (!this.store) return false;
    saveAttempts.inc();

    const [ok] = pcall(() => this.store!.SetAsync(`progression_${this.playerId}`, this.data));
    if (!ok) {
      saveFailures.inc();
      return false;
    }

    this.dirty = false;
    this.logger?.info("Progression saved.");
    return true;
  }

  // --------------------------------------------------------------------------
  // XP Operations
  // --------------------------------------------------------------------------

  /**
   * Award XP to the player. Applies prestige bonus if applicable.
   * Returns the number of levels gained.
   */
  addXp(amount: number): number {
    if (amount <= 0 || amount !== amount || amount === math.huge) return 0;

    // Apply prestige bonus
    let effectiveAmount = amount;
    if (this.config.prestigeEnabled && this.data.prestige > 0) {
      const bonus = 1 + this.data.prestige * this.config.prestigeXpBonus;
      effectiveAmount = math.floor(amount * bonus);
    }

    this.data.currentXp += effectiveAmount;
    this.data.totalXp += effectiveAmount;
    xpGained.add(effectiveAmount);
    this.dirty = true;

    // Check for level-ups
    let levelsGained = 0;
    while (this.canLevelUp()) {
      const required = this.getXpForNextLevel();
      this.data.currentXp -= required;
      const previousLevel = this.data.level;
      this.data.level += 1;
      levelsGained += 1;
      levelUps.inc();

      this.logger?.info(`Level up! ${previousLevel} → ${this.data.level}`);

      const event: LevelUpEvent = {
        playerId: this.playerId,
        previousLevel,
        newLevel: this.data.level,
        prestige: this.data.prestige,
        totalXp: this.data.totalXp,
      };
      for (const cb of this.levelUpCallbacks) {
        cb(event);
      }
    }

    return levelsGained;
  }

  /**
   * Set XP directly (admin/debug use).
   */
  setXp(xp: number): void {
    this.data.currentXp = xp;
    this.dirty = true;
  }

  /**
   * Set level directly (admin/debug use).
   */
  setLevel(level: number): void {
    if (level >= 1) {
      this.data.level = level;
      this.data.currentXp = 0;
      this.dirty = true;
    }
  }

  // --------------------------------------------------------------------------
  // Level Queries
  // --------------------------------------------------------------------------

  /** Get current level. */
  getLevel(): number {
    return this.data.level;
  }

  /** Get current XP within the current level. */
  getCurrentXp(): number {
    return this.data.currentXp;
  }

  /** Get total XP earned all-time. */
  getTotalXp(): number {
    return this.data.totalXp;
  }

  /** Get XP required to reach the next level. */
  getXpForNextLevel(): number {
    return this.xpForLevel(this.data.level + 1);
  }

  /** Get XP required for a specific level. */
  getXpForLevel(level: number): number {
    return this.xpForLevel(level);
  }

  /** Get progress toward next level as 0.0–1.0. */
  getProgress(): number {
    const required = this.getXpForNextLevel();
    if (required <= 0) return 1;
    const progress = this.data.currentXp / required;
    return progress > 1 ? 1 : progress;
  }

  /** Whether the player can level up right now. */
  canLevelUp(): boolean {
    if (this.config.maxLevel > 0 && this.data.level >= this.config.maxLevel) {
      return false;
    }
    return this.data.currentXp >= this.getXpForNextLevel();
  }

  /** Whether the player is at max level. */
  isMaxLevel(): boolean {
    return this.config.maxLevel > 0 && this.data.level >= this.config.maxLevel;
  }

  // --------------------------------------------------------------------------
  // Prestige
  // --------------------------------------------------------------------------

  /** Whether the player can prestige. */
  canPrestige(): boolean {
    if (!this.config.prestigeEnabled) return false;
    if (this.data.level < this.config.prestigeMinLevel) return false;
    if (this.config.maxPrestige > 0 && this.data.prestige >= this.config.maxPrestige) return false;
    return true;
  }

  /**
   * Prestige the player — resets level to 1, keeps totalXp.
   * Returns true if successful.
   */
  prestige(): boolean {
    if (!this.canPrestige()) return false;

    const previousPrestige = this.data.prestige;
    const levelAtPrestige = this.data.level;

    this.data.prestige += 1;
    this.data.level = 1;
    this.data.currentXp = 0;
    this.data.prestigeHistory.push(os.time());
    this.dirty = true;
    prestiges.inc();

    this.logger?.info(`Prestige! ${previousPrestige} → ${this.data.prestige}`);

    const event: PrestigeEvent = {
      playerId: this.playerId,
      previousPrestige,
      newPrestige: this.data.prestige,
      levelAtPrestige,
      totalXp: this.data.totalXp,
    };
    for (const cb of this.prestigeCallbacks) {
      cb(event);
    }

    return true;
  }

  /** Get current prestige tier. */
  getPrestige(): number {
    return this.data.prestige;
  }

  /** Get prestige history timestamps. */
  getPrestigeHistory(): number[] {
    const result: number[] = [];
    for (const t of this.data.prestigeHistory) {
      result.push(t);
    }
    return result;
  }

  /** Get the XP bonus multiplier from prestige (e.g., 1.2 for 20% bonus). */
  getPrestigeMultiplier(): number {
    if (!this.config.prestigeEnabled || this.data.prestige <= 0) return 1;
    return 1 + this.data.prestige * this.config.prestigeXpBonus;
  }

  // --------------------------------------------------------------------------
  // Event Listeners
  // --------------------------------------------------------------------------

  /** Register a callback for level-up events. */
  onLevelUp(callback: LevelUpCallback): void {
    this.levelUpCallbacks.push(callback);
  }

  /** Register a callback for prestige events. */
  onPrestige(callback: PrestigeCallback): void {
    this.prestigeCallbacks.push(callback);
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  /** Get the full progression data snapshot. */
  getData(): ProgressionData {
    return {
      playerId: this.data.playerId,
      level: this.data.level,
      currentXp: this.data.currentXp,
      totalXp: this.data.totalXp,
      prestige: this.data.prestige,
      prestigeHistory: [...this.data.prestigeHistory],
      version: this.data.version,
    };
  }

  /** Whether there are unsaved changes. */
  isDirty(): boolean {
    return this.dirty;
  }

  /** Get player ID. */
  getPlayerId(): number {
    return this.playerId;
  }
}
