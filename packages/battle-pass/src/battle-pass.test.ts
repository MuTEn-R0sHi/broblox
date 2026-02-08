/**
 * @rbx/battle-pass — Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SeasonDefinition } from "./types";
import { SeasonRegistry } from "./season-registry";
import { BattlePassStore } from "./battle-pass-store";

// ---------------------------------------------------------------------------
// Roblox mocks
// ---------------------------------------------------------------------------

let mockTime = 1000;
const stores = new Map<string, Map<string, unknown>>();

function getOrCreateStore(name: string) {
  if (!stores.has(name)) stores.set(name, new Map<string, unknown>());
  const data = stores.get(name)!;
  return {
    GetAsync: vi.fn((key: string) => data.get(key)),
    SetAsync: vi.fn((key: string, value: unknown) => {
      data.set(key, JSON.parse(JSON.stringify(value)));
    }),
  };
}

function setupGlobals() {
  mockTime = 1000;
  stores.clear();

  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = { time: vi.fn(() => mockTime), clock: vi.fn(() => mockTime / 1000) };
  g.math = {
    floor: Math.floor,
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
    pow: Math.pow,
    huge: Infinity,
  };
  g.typeIs = (value: unknown, typeName: string) => {
    if (typeName === "table") return typeof value === "object" && value !== null;
    return typeof value === typeName;
  };
  g.pcall = (fn: (...a: unknown[]) => unknown) => {
    try {
      const result = fn();
      return [true, result];
    } catch (e) {
      return [false, e];
    }
  };
  g.game = {
    GetService: vi.fn((svc: string) => {
      if (svc === "DataStoreService") {
        return { GetDataStore: vi.fn((name: string) => getOrCreateStore(name)) };
      }
      return {};
    }),
  };
}

// ---------------------------------------------------------------------------
// Test season
// ---------------------------------------------------------------------------

const testSeason: SeasonDefinition = {
  id: "season_1",
  name: "Season 1",
  description: "The first season",
  active: true,
  startTime: 0,
  endTime: 99999999,
  tiers: [
    {
      tier: 1,
      xpRequired: 100,
      rewards: [
        {
          id: "r1_free",
          name: "100 Coins",
          track: "free",
          reward: { type: "currency", amount: 100 },
        },
        {
          id: "r1_premium",
          name: "Gold Hat",
          track: "premium",
          reward: { type: "cosmetic", amount: 1, itemId: "gold_hat" },
        },
      ],
    },
    {
      tier: 2,
      xpRequired: 200,
      rewards: [
        {
          id: "r2_free",
          name: "200 Coins",
          track: "free",
          reward: { type: "currency", amount: 200 },
        },
      ],
    },
    {
      tier: 3,
      xpRequired: 300,
      rewards: [
        {
          id: "r3_free",
          name: "Rare Pet",
          track: "free",
          reward: { type: "custom", amount: 1, itemId: "rare_cat", label: "pet" },
        },
        {
          id: "r3_premium",
          name: "Exclusive Trail",
          track: "premium",
          reward: { type: "cosmetic", amount: 1, itemId: "fire_trail" },
        },
      ],
    },
    {
      tier: 4,
      xpRequired: 500,
      rewards: [
        {
          id: "r4_free",
          name: "Title",
          track: "free",
          reward: { type: "custom", amount: 1, itemId: "Veteran", label: "title" },
        },
      ],
    },
  ],
};

const inactiveSeason: SeasonDefinition = {
  id: "season_0",
  name: "Season 0",
  description: "Ended",
  active: false,
  startTime: 0,
  endTime: 100,
  tiers: [],
};

// ---------------------------------------------------------------------------
// SeasonRegistry tests
// ---------------------------------------------------------------------------

describe("SeasonRegistry", () => {
  beforeEach(() => setupGlobals());

  it("registers and retrieves seasons", () => {
    const reg = new SeasonRegistry();
    reg.register(testSeason);
    expect(reg.has("season_1")).toBe(true);
    expect(reg.get("season_1")?.name).toBe("Season 1");
  });

  it("registerAll adds multiple", () => {
    const reg = new SeasonRegistry();
    reg.registerAll([testSeason, inactiveSeason]);
    expect(reg.count()).toBe(2);
  });

  it("getActive returns active season", () => {
    const reg = new SeasonRegistry();
    reg.registerAll([testSeason, inactiveSeason]);
    expect(reg.getActive()?.id).toBe("season_1");
  });

  it("getAll returns everything", () => {
    const reg = new SeasonRegistry();
    reg.registerAll([testSeason, inactiveSeason]);
    expect(reg.getAll()).toHaveLength(2);
  });

  it("clear removes all", () => {
    const reg = new SeasonRegistry();
    reg.register(testSeason);
    reg.clear();
    expect(reg.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// BattlePassStore tests
// ---------------------------------------------------------------------------

describe("BattlePassStore", () => {
  let registry: SeasonRegistry;
  let store: BattlePassStore;

  beforeEach(() => {
    setupGlobals();
    registry = new SeasonRegistry();
    registry.registerAll([testSeason, inactiveSeason]);
    store = new BattlePassStore(1, registry, { enableLogging: true });
    store.init();
    store.load();
    store.setSeason("season_1");
  });

  // Season management
  it("sets active season", () => {
    expect(store.getSeasonId()).toBe("season_1");
    expect(store.getTier()).toBe(1);
    expect(store.getXp()).toBe(0);
  });

  it("rejects inactive season", () => {
    expect(store.setSeason("season_0").status).toBe("season_inactive");
  });

  it("rejects unknown season", () => {
    expect(store.setSeason("nonexistent").status).toBe("season_not_found");
  });

  it("resets progress on season change", () => {
    store.addXp(500);
    // Re-register a second active season for testing
    const s2: SeasonDefinition = { ...testSeason, id: "season_2", name: "Season 2" };
    registry.register(s2);
    store.setSeason("season_2");
    expect(store.getTier()).toBe(1);
    expect(store.getXp()).toBe(0);
  });

  it("resets premium on season change", () => {
    store.unlockPremium();
    expect(store.isPremium()).toBe(true);
    const s2: SeasonDefinition = { ...testSeason, id: "season_2", name: "Season 2" };
    registry.register(s2);
    store.setSeason("season_2");
    expect(store.isPremium()).toBe(false);
  });

  it("resets claimed rewards on season change", () => {
    store.claimReward("r1_free");
    expect(store.isClaimed("r1_free")).toBe(true);
    const s2: SeasonDefinition = { ...testSeason, id: "season_2", name: "Season 2" };
    registry.register(s2);
    store.setSeason("season_2");
    expect(store.isClaimed("r1_free")).toBe(false);
  });

  // XP & Tier progression
  it("adds XP and progresses tier", () => {
    const result = store.addXp(100);
    expect(result.ok).toBe(true);
    expect(result.previousTier).toBe(1);
    expect(result.newTier).toBe(2);
    expect(store.getTier()).toBe(2);
  });

  it("handles multi-tier jumps", () => {
    store.addXp(600); // 100 + 200 + 300 = 600 to hit tier 4
    expect(store.getTier()).toBe(4);
  });

  it("caps at max tier", () => {
    store.addXp(99999);
    expect(store.getTier()).toBe(4);
    expect(store.getXp()).toBe(0);
  });

  it("rejects XP at max tier", () => {
    store.addXp(99999);
    const result = store.addXp(100);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("max_tier");
  });

  it("rejects negative XP", () => {
    const result = store.addXp(-50);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("invalid_amount");
    expect(store.getXp()).toBe(0);
  });

  it("rejects zero XP", () => {
    const result = store.addXp(0);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("invalid_amount");
    expect(store.getXp()).toBe(0);
  });

  it("fires onTierUp callback", () => {
    const cb = vi.fn();
    store.onTierUp(cb);
    store.addXp(100);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ previousTier: 1, newTier: 2 }));
  });

  // Premium
  it("unlocks premium", () => {
    expect(store.unlockPremium().ok).toBe(true);
    expect(store.isPremium()).toBe(true);
  });

  it("rejects double premium unlock", () => {
    store.unlockPremium();
    expect(store.unlockPremium().status).toBe("already_premium");
  });

  // Claim rewards
  it("claims free reward at current tier", () => {
    const result = store.claimReward("r1_free");
    expect(result.ok).toBe(true);
    expect(result.reward?.name).toBe("100 Coins");
    expect(store.isClaimed("r1_free")).toBe(true);
  });

  it("rejects double claim (idempotent)", () => {
    store.claimReward("r1_free");
    expect(store.claimReward("r1_free").status).toBe("already_claimed");
  });

  it("rejects claim for unreached tier", () => {
    expect(store.claimReward("r2_free").status).toBe("tier_not_reached");
  });

  it("rejects premium claim without premium", () => {
    expect(store.claimReward("r1_premium").status).toBe("premium_required");
  });

  it("allows premium claim with premium unlocked", () => {
    store.unlockPremium();
    const result = store.claimReward("r1_premium");
    expect(result.ok).toBe(true);
    expect(result.reward?.track).toBe("premium");
  });

  it("rejects unknown reward", () => {
    expect(store.claimReward("nonexistent").status).toBe("reward_not_found");
  });

  it("fires onClaim callback", () => {
    const cb = vi.fn();
    store.onClaim(cb);
    store.claimReward("r1_free");
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        rewardId: "r1_free",
        track: "free",
      })
    );
  });

  // Claimable rewards
  it("getClaimableRewards returns unclaimed free rewards at reached tiers", () => {
    const claimable = store.getClaimableRewards();
    // Tier 1 free reward should be claimable
    expect(claimable).toContain("r1_free");
    // Premium reward should NOT be claimable without premium
    expect(claimable).not.toContain("r1_premium");
  });

  it("getClaimableRewards includes premium with premium unlocked", () => {
    store.unlockPremium();
    const claimable = store.getClaimableRewards();
    expect(claimable).toContain("r1_premium");
  });

  it("getClaimableRewards excludes already claimed", () => {
    store.claimReward("r1_free");
    const claimable = store.getClaimableRewards();
    expect(claimable).not.toContain("r1_free");
  });

  it("getClaimedRewards returns claimed list", () => {
    store.claimReward("r1_free");
    expect(store.getClaimedRewards()).toHaveLength(1);
  });

  // Dirty / Persistence
  it("tracks dirty state", () => {
    // setSeason already made it dirty — save first
    store.save();
    expect(store.isDirty()).toBe(false);
    store.addXp(50);
    expect(store.isDirty()).toBe(true);
    store.save();
    expect(store.isDirty()).toBe(false);
  });

  it("save and load round-trips", () => {
    store.addXp(100);
    store.claimReward("r1_free");
    store.unlockPremium();
    store.save();

    const store2 = new BattlePassStore(1, registry, {});
    store2.init();
    store2.load();
    expect(store2.getTier()).toBe(2);
    expect(store2.isPremium()).toBe(true);
    expect(store2.isClaimed("r1_free")).toBe(true);
  });
});
