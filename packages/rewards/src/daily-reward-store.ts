/**
 * Daily Reward Store
 *
 * Manages daily login rewards with streak tracking, configurable cycles, and
 * DataStore persistence.
 */

import { createLogger } from "@rbx/core";
import { Counter } from "@rbx/observability";
import type {
  DailyLoginData,
  DailyRewardDay,
  RewardsConfig,
  DailyRewardClaimedCallback,
  DailyRewardClaimedEvent,
} from "./types";

// Roblox globals
declare const game: { GetService(name: string): unknown };
declare function pcall<T>(fn: () => T): LuaTuple<[boolean, T]>;
declare function typeIs(value: unknown, typeName: string): boolean;
declare const os: { time(): number };
declare const math: { floor(x: number): number; max(a: number, b: number): number };

interface DataStore {
  GetAsync(key: string): unknown;
  SetAsync(key: string, value: unknown): void;
}
interface DataStoreService {
  GetDataStore(name: string): DataStore;
}

const dailyClaims = new Counter("rewards_daily_claims");
const streakResets = new Counter("rewards_streak_resets");
const saveAttempts = new Counter("rewards_daily_save_attempts");
const saveFailures = new Counter("rewards_daily_save_failures");

const DEFAULT_CONFIG = {
  dayDuration: 86400,
  streakGracePeriod: 86400,
  cycleLength: 7,
  dailyDatastoreName: "DailyRewards_v1",
  enableLogging: false,
};

export class DailyRewardStore {
  private playerId: number;
  private config: typeof DEFAULT_CONFIG;
  private data: DailyLoginData;
  private rewardCycle: DailyRewardDay[];
  private store: DataStore | undefined;
  private dirty = false;
  private logger: ReturnType<typeof createLogger> | undefined;

  private claimedCallbacks: DailyRewardClaimedCallback[] = [];

  constructor(playerId: number, rewardCycle: DailyRewardDay[], config?: Partial<RewardsConfig>) {
    this.playerId = playerId;
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };
    this.rewardCycle = rewardCycle;

    this.data = {
      playerId,
      streak: 0,
      cycleDay: 1,
      lastClaimTime: 0,
      totalDaysClaimed: 0,
      version: 1,
    };

    if (this.config.enableLogging) {
      this.logger = createLogger(`DailyRewards.Player${playerId}`);
    }
  }

  // --------------------------------------------------------------------------
  // Init / Load / Save
  // --------------------------------------------------------------------------

  init(): void {
    const DataStoreService = game.GetService("DataStoreService") as DataStoreService;
    this.store = DataStoreService.GetDataStore(this.config.dailyDatastoreName);
  }

  load(): boolean {
    if (!this.store) return false;

    const [ok, raw] = pcall(() => this.store!.GetAsync(`daily_${this.playerId}`));
    if (!ok) return false;

    if (raw !== undefined && typeIs(raw, "table")) {
      const saved = raw as unknown as DailyLoginData;
      this.data = {
        playerId: this.playerId,
        streak: saved.streak ?? 0,
        cycleDay: saved.cycleDay ?? 1,
        lastClaimTime: saved.lastClaimTime ?? 0,
        totalDaysClaimed: saved.totalDaysClaimed ?? 0,
        version: saved.version ?? 1,
      };
    }

    this.dirty = false;
    return true;
  }

  save(): boolean {
    if (!this.store) return false;
    saveAttempts.inc();

    const [ok] = pcall(() => this.store!.SetAsync(`daily_${this.playerId}`, this.data));
    if (!ok) {
      saveFailures.inc();
      return false;
    }

    this.dirty = false;
    return true;
  }

  // --------------------------------------------------------------------------
  // Claim
  // --------------------------------------------------------------------------

  /** Check if the player can claim today's reward. */
  canClaim(): boolean {
    if (this.data.lastClaimTime === 0) return true; // Never claimed
    const elapsed = os.time() - this.data.lastClaimTime;
    return elapsed >= this.config.dayDuration;
  }

  /**
   * Claim today's daily reward.
   * Returns the reward day entry if successful, or undefined if not claimable.
   */
  claim(): DailyRewardDay | undefined {
    if (!this.canClaim()) return undefined;

    const now = os.time();

    // Check if streak should reset
    if (this.data.lastClaimTime > 0) {
      const elapsed = now - this.data.lastClaimTime;
      const maxGap = this.config.dayDuration + this.config.streakGracePeriod;
      if (elapsed > maxGap) {
        // Streak broken
        this.data.streak = 0;
        this.data.cycleDay = 1;
        streakResets.inc();
        this.logger?.info("Streak reset — too long since last claim");
      }
    }

    // Advance streak
    this.data.streak += 1;
    this.data.totalDaysClaimed += 1;
    this.data.lastClaimTime = now;

    // Get today's reward from the cycle
    const cycleIndex = (this.data.cycleDay - 1) % this.rewardCycle.size();
    const rewardDay = this.rewardCycle[cycleIndex];

    // Advance cycle day
    this.data.cycleDay += 1;
    if (this.data.cycleDay > this.config.cycleLength) {
      this.data.cycleDay = 1;
    }

    this.dirty = true;
    dailyClaims.inc();

    this.logger?.info(`Day ${rewardDay.day} claimed — streak ${this.data.streak}`);

    const event: DailyRewardClaimedEvent = {
      playerId: this.playerId,
      day: rewardDay.day,
      streak: this.data.streak,
      rewards: rewardDay.rewards,
    };
    for (const cb of this.claimedCallbacks) {
      cb(event);
    }

    return rewardDay;
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /** Current streak length. */
  getStreak(): number {
    return this.data.streak;
  }

  /** Current day in the reward cycle. */
  getCycleDay(): number {
    return this.data.cycleDay;
  }

  /** Total days claimed all time. */
  getTotalDaysClaimed(): number {
    return this.data.totalDaysClaimed;
  }

  /** Timestamp of last claim. */
  getLastClaimTime(): number {
    return this.data.lastClaimTime;
  }

  /** Time remaining until next claim is available, in seconds. */
  getTimeUntilNextClaim(): number {
    if (this.data.lastClaimTime === 0) return 0;
    const elapsed = os.time() - this.data.lastClaimTime;
    const remaining = this.config.dayDuration - elapsed;
    return math.max(0, remaining);
  }

  /** Whether there are unsaved changes. */
  isDirty(): boolean {
    return this.dirty;
  }

  /** Get player ID. */
  getPlayerId(): number {
    return this.playerId;
  }

  /** Get full data snapshot. */
  getData(): DailyLoginData {
    return {
      playerId: this.data.playerId,
      streak: this.data.streak,
      cycleDay: this.data.cycleDay,
      lastClaimTime: this.data.lastClaimTime,
      totalDaysClaimed: this.data.totalDaysClaimed,
      version: this.data.version,
    };
  }

  // --------------------------------------------------------------------------
  // Event Listeners
  // --------------------------------------------------------------------------

  onClaimed(callback: DailyRewardClaimedCallback): void {
    this.claimedCallbacks.push(callback);
  }
}
