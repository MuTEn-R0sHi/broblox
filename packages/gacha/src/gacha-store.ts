/**
 * @rbx/gacha — Gacha Store
 *
 * Handles hatching eggs, weighted random selection, and pity system.
 */

import type {
  EggDefinition,
  GachaConfig,
  GachaPlayerData,
  GachaRarity,
  GachaWeight,
  HatchCallback,
  HatchResult,
} from "./types";
import { DEFAULT_GACHA_CONFIG, rarityRank } from "./types";
import { EggRegistry } from "./egg-registry";

export class GachaStore {
  private playerId: number;
  private registry: EggRegistry;
  private config: GachaConfig;
  private data: GachaPlayerData;
  private dirty = false;
  private dataStore:
    | { GetAsync: (key: string) => unknown; SetAsync: (key: string, value: unknown) => void }
    | undefined;

  private hatchCallbacks: HatchCallback[] = [];

  constructor(playerId: number, registry: EggRegistry, config?: Partial<GachaConfig>) {
    this.playerId = playerId;
    this.registry = registry;
    this.config = { ...DEFAULT_GACHA_CONFIG, ...config };
    this.data = {
      hatchCounts: new Map(),
      pityCounters: new Map(),
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
    this.dataStore = dss.GetDataStore(this.config.datastoreName ?? "GachaData");
    if (this.config.enableLogging) print(`[GachaStore] init for player ${this.playerId}`);
  }

  load(): void {
    if (!this.dataStore) return;
    const [ok, raw] = pcall(
      () =>
        this.dataStore!.GetAsync(`gacha_${this.playerId}`) as
          | { hatchCounts?: Array<[string, number]>; pityCounters?: Array<[string, number]> }
          | undefined
    );
    if (!ok || raw === undefined) {
      this.dirty = false;
      return;
    }
    this.data.hatchCounts = new Map<string, number>();
    if (raw.hatchCounts) {
      for (let i = 0; i < raw.hatchCounts.size(); i++) {
        const pair = raw.hatchCounts[i];
        this.data.hatchCounts.set(pair[0], pair[1]);
      }
    }
    this.data.pityCounters = new Map<string, number>();
    if (raw.pityCounters) {
      for (let i = 0; i < raw.pityCounters.size(); i++) {
        const pair = raw.pityCounters[i];
        this.data.pityCounters.set(pair[0], pair[1]);
      }
    }
    this.dirty = false;
  }

  save(): void {
    if (!this.dataStore) return;
    // Serialize Maps as arrays of [key, value] pairs for DataStore compatibility
    const hatchArr: Array<[string, number]> = [];
    this.data.hatchCounts.forEach((v, k) => hatchArr.push([k, v]));
    const pityArr: Array<[string, number]> = [];
    this.data.pityCounters.forEach((v, k) => pityArr.push([k, v]));
    pcall(() =>
      this.dataStore!.SetAsync(`gacha_${this.playerId}`, {
        hatchCounts: hatchArr,
        pityCounters: pityArr,
      })
    );
    this.dirty = false;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  // -------------------------------------------------------------------------
  // Hatch
  // -------------------------------------------------------------------------

  /**
   * Attempt to hatch an egg. This is a "pull" in gacha terminology.
   * `currencyBalance` is provided by the caller (server-side economy).
   */
  hatch(eggId: string, currencyBalance: number): HatchResult {
    const egg = this.registry.get(eggId);
    if (egg === undefined) {
      return { ok: false, status: "egg_not_found" };
    }
    if (!egg.enabled) {
      return { ok: false, status: "egg_disabled" };
    }
    if (currencyBalance < egg.cost) {
      return { ok: false, status: "insufficient_funds" };
    }
    if (egg.maxHatches > 0) {
      const count = this.data.hatchCounts.get(eggId) ?? 0;
      if (count >= egg.maxHatches) {
        return { ok: false, status: "max_hatches_reached" };
      }
    }
    if (egg.lootTable.size() === 0) {
      return { ok: false, status: "loot_table_empty" };
    }

    // Determine pity state
    const pityCounter = this.data.pityCounters.get(eggId) ?? 0;
    const isPity = pityCounter >= egg.pityThreshold;

    // Roll
    let picked: GachaWeight;
    if (isPity) {
      picked = this.rollPity(egg);
    } else {
      picked = this.rollWeighted(egg.lootTable);
    }

    // Update pity counter
    const pickedRank = rarityRank(picked.rarity);
    const pityRank = rarityRank(egg.pityRarity);
    if (pickedRank >= pityRank) {
      this.data.pityCounters.set(eggId, 0);
    } else {
      this.data.pityCounters.set(eggId, pityCounter + 1);
    }

    // Update hatch count
    const prevCount = this.data.hatchCounts.get(eggId) ?? 0;
    this.data.hatchCounts.set(eggId, prevCount + 1);
    this.dirty = true;

    // Fire callbacks
    const evt = {
      playerId: this.playerId,
      eggId,
      itemId: picked.itemId,
      rarity: picked.rarity,
      wasPity: isPity,
      timestamp: os.time(),
    };
    for (let i = 0; i < this.hatchCallbacks.size(); i++) {
      this.hatchCallbacks[i](evt);
    }

    return {
      ok: true,
      status: "success",
      itemId: picked.itemId,
      rarity: picked.rarity,
      wasPity: isPity,
    };
  }

  // -------------------------------------------------------------------------
  // Weighted random selection
  // -------------------------------------------------------------------------

  private rollWeighted(lootEntries: ReadonlyArray<GachaWeight>): GachaWeight {
    let totalWeight = 0;
    for (let i = 0; i < lootEntries.size(); i++) {
      totalWeight += lootEntries[i].weight;
    }

    let roll = math.random() * totalWeight;
    for (let i = 0; i < lootEntries.size(); i++) {
      roll -= lootEntries[i].weight;
      if (roll <= 0) return lootEntries[i];
    }
    return lootEntries[lootEntries.size() - 1];
  }

  /** Pity roll: filter loot table to items at or above pity rarity, then roll weighted. */
  private rollPity(egg: EggDefinition): GachaWeight {
    const pityRank = rarityRank(egg.pityRarity);
    const filtered: GachaWeight[] = [];
    for (let i = 0; i < egg.lootTable.size(); i++) {
      if (rarityRank(egg.lootTable[i].rarity) >= pityRank) {
        filtered.push(egg.lootTable[i]);
      }
    }
    if (filtered.size() === 0) {
      // Fallback to full table if no items match pity rarity
      return this.rollWeighted(egg.lootTable);
    }
    return this.rollWeighted(filtered);
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  getHatchCount(eggId: string): number {
    return this.data.hatchCounts.get(eggId) ?? 0;
  }

  getPityCounter(eggId: string): number {
    return this.data.pityCounters.get(eggId) ?? 0;
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  onHatch(cb: HatchCallback): void {
    this.hatchCallbacks.push(cb);
  }
}
