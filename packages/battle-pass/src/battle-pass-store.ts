/**
 * @broblox/battle-pass — Battle Pass Store
 *
 * Handles XP granting, tier progression, reward claims, and persistence.
 */

import type {
  BattlePassConfig,
  BattlePassPlayerData,
  BattlePassResult,
  ClaimCallback,
  ClaimResult,
  TierReward,
  TierUpCallback,
  XpResult,
} from "./types";
import { DEFAULT_BATTLE_PASS_CONFIG } from "./types";
import { SeasonRegistry } from "./season-registry";

export class BattlePassStore {
  private playerId: number;
  private registry: SeasonRegistry;
  private config: BattlePassConfig;
  private data: BattlePassPlayerData;
  private dirty = false;
  private dataStore:
    | { GetAsync: (key: string) => unknown; SetAsync: (key: string, value: unknown) => void }
    | undefined;

  private tierUpCallbacks: TierUpCallback[] = [];
  private claimCallbacks: ClaimCallback[] = [];

  constructor(playerId: number, registry: SeasonRegistry, config?: Partial<BattlePassConfig>) {
    this.playerId = playerId;
    this.registry = registry;
    this.config = { ...DEFAULT_BATTLE_PASS_CONFIG, ...config };
    this.data = {
      seasonId: "",
      xp: 0,
      tier: 1,
      premiumUnlocked: false,
      claimedRewards: [],
    };
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  init(): void {
    const dss = game.GetService("DataStoreService") as {
      GetDataStore(name: string): {
        GetAsync: (key: string) => unknown;
        SetAsync: (key: string, value: unknown) => void;
      };
    };
    this.dataStore = dss.GetDataStore(this.config.datastoreName ?? "BattlePassData");
    if (this.config.enableLogging) print(`[BattlePassStore] init for player ${this.playerId}`);
  }

  load(): void {
    if (!this.dataStore) return;
    const [ok, raw] = pcall(
      () => this.dataStore!.GetAsync(`bp_${this.playerId}`) as BattlePassPlayerData | undefined
    );
    if (!ok || raw === undefined) {
      this.dirty = false;
      return;
    }
    this.data.seasonId = raw.seasonId ?? "";
    this.data.xp = raw.xp ?? 0;
    this.data.tier = raw.tier ?? 1;
    this.data.premiumUnlocked = raw.premiumUnlocked ?? false;
    this.data.claimedRewards = raw.claimedRewards ?? [];
    this.dirty = false;
  }

  save(): void {
    if (!this.dataStore) return;
    pcall(() => this.dataStore!.SetAsync(`bp_${this.playerId}`, this.data));
    this.dirty = false;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  // -------------------------------------------------------------------------
  // Season management
  // -------------------------------------------------------------------------

  /** Set the active season for this player. Resets progress if season changes. */
  setSeason(seasonId: string): BattlePassResult {
    const season = this.registry.get(seasonId);
    if (season === undefined) {
      return { ok: false, status: "season_not_found" };
    }
    if (!season.active) {
      return { ok: false, status: "season_inactive" };
    }
    if (this.data.seasonId !== seasonId) {
      this.data.seasonId = seasonId;
      this.data.xp = 0;
      this.data.tier = 1;
      this.data.claimedRewards = [];
      this.data.premiumUnlocked = false;
      this.dirty = true;
    }
    return { ok: true, status: "success" };
  }

  /** Unlock premium track */
  unlockPremium(): BattlePassResult {
    if (this.data.premiumUnlocked) {
      return { ok: false, status: "already_premium" };
    }
    this.data.premiumUnlocked = true;
    this.dirty = true;
    return { ok: true, status: "success" };
  }

  // -------------------------------------------------------------------------
  // XP & Tier progression
  // -------------------------------------------------------------------------

  /** Add XP and automatically tier up */
  addXp(amount: number): XpResult {
    if (amount <= 0) {
      return { ok: false, status: "invalid_amount" };
    }

    const season = this.registry.get(this.data.seasonId);
    if (season === undefined) {
      return { ok: false, status: "season_not_found" };
    }
    if (!season.active) {
      return { ok: false, status: "season_inactive" };
    }

    const maxTier = season.tiers.size();
    if (this.data.tier >= maxTier) {
      return { ok: false, status: "max_tier" };
    }

    const previousTier = this.data.tier;
    this.data.xp += amount;

    // Auto tier-up loop
    while (this.data.tier < maxTier) {
      const currentTierDef = season.tiers[this.data.tier - 1];
      if (currentTierDef === undefined) break;
      const required = currentTierDef.xpRequired;
      if (this.data.xp >= required) {
        this.data.xp -= required;
        this.data.tier++;
      } else {
        break;
      }
    }

    // Cap at max tier
    if (this.data.tier >= maxTier) {
      this.data.tier = maxTier;
      this.data.xp = 0;
    }

    this.dirty = true;

    // Fire tier-up events
    if (this.data.tier > previousTier) {
      const evt = {
        playerId: this.playerId,
        seasonId: this.data.seasonId,
        previousTier,
        newTier: this.data.tier,
        timestamp: os.time(),
      };
      for (let i = 0; i < this.tierUpCallbacks.size(); i++) {
        this.tierUpCallbacks[i](evt);
      }
    }

    return {
      ok: true,
      status: "success",
      previousTier,
      newTier: this.data.tier,
      totalXp: this.data.xp,
    };
  }

  // -------------------------------------------------------------------------
  // Claim rewards
  // -------------------------------------------------------------------------

  /** Claim a specific reward from a tier (idempotent) */
  claimReward(rewardId: string): ClaimResult {
    const season = this.registry.get(this.data.seasonId);
    if (season === undefined) {
      return { ok: false, status: "season_not_found" };
    }

    // Check if already claimed
    for (let i = 0; i < this.data.claimedRewards.size(); i++) {
      if (this.data.claimedRewards[i] === rewardId) {
        return { ok: false, status: "already_claimed" };
      }
    }

    // Find the reward across tiers
    let foundReward: TierReward | undefined;
    let foundTier = 0;
    for (let t = 0; t < season.tiers.size(); t++) {
      const tier = season.tiers[t];
      for (let r = 0; r < tier.rewards.size(); r++) {
        if (tier.rewards[r].id === rewardId) {
          foundReward = tier.rewards[r];
          foundTier = tier.tier;
          break;
        }
      }
      if (foundReward !== undefined) break;
    }

    if (foundReward === undefined) {
      return { ok: false, status: "reward_not_found" };
    }

    // Check tier reached
    if (this.data.tier < foundTier) {
      return { ok: false, status: "tier_not_reached" };
    }

    // Check premium
    if (foundReward.track === "premium" && !this.data.premiumUnlocked) {
      return { ok: false, status: "premium_required" };
    }

    // Claim
    this.data.claimedRewards.push(rewardId);
    this.dirty = true;

    // Fire callback
    const evt = {
      playerId: this.playerId,
      seasonId: this.data.seasonId,
      tier: foundTier,
      rewardId,
      track: foundReward.track,
      timestamp: os.time(),
    };
    for (let i = 0; i < this.claimCallbacks.size(); i++) {
      this.claimCallbacks[i](evt);
    }

    return { ok: true, status: "success", reward: foundReward };
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  getTier(): number {
    return this.data.tier;
  }

  getXp(): number {
    return this.data.xp;
  }

  getSeasonId(): string {
    return this.data.seasonId;
  }

  isPremium(): boolean {
    return this.data.premiumUnlocked;
  }

  isClaimed(rewardId: string): boolean {
    for (let i = 0; i < this.data.claimedRewards.size(); i++) {
      if (this.data.claimedRewards[i] === rewardId) return true;
    }
    return false;
  }

  getClaimedRewards(): string[] {
    const result: string[] = [];
    for (let i = 0; i < this.data.claimedRewards.size(); i++) {
      result.push(this.data.claimedRewards[i]);
    }
    return result;
  }

  /** Get all claimable (unclaimed + tier reached + track eligible) rewards */
  getClaimableRewards(): string[] {
    const season = this.registry.get(this.data.seasonId);
    if (season === undefined) return [];

    const result: string[] = [];
    for (let t = 0; t < season.tiers.size(); t++) {
      const tier = season.tiers[t];
      if (tier.tier > this.data.tier) break;
      for (let r = 0; r < tier.rewards.size(); r++) {
        const reward = tier.rewards[r];
        if (reward.track === "premium" && !this.data.premiumUnlocked) continue;
        if (!this.isClaimed(reward.id)) {
          result.push(reward.id);
        }
      }
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  onTierUp(cb: TierUpCallback): void {
    this.tierUpCallbacks.push(cb);
  }

  onClaim(cb: ClaimCallback): void {
    this.claimCallbacks.push(cb);
  }
}
