/**
 * @rbx/gacha — Types
 *
 * Egg / gacha system with loot tables, pity counters, and rarity tiers.
 */

// ---------------------------------------------------------------------------
// Rarity weights
// ---------------------------------------------------------------------------

export type GachaRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export interface GachaWeight {
  /** Species ID or item ID that can be obtained */
  readonly itemId: string;
  /** Rarity tier */
  readonly rarity: GachaRarity;
  /** Relative weight (higher = more likely). NOT a percentage. */
  readonly weight: number;
}

// ---------------------------------------------------------------------------
// Egg / Banner definitions
// ---------------------------------------------------------------------------

export interface EggDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Cost to hatch (currency amount) */
  readonly cost: number;
  /** Currency key, e.g. "coins", "gems" */
  readonly currency: string;
  /** Loot table entries */
  readonly lootTable: ReadonlyArray<GachaWeight>;
  /** Number of rolls without a rare+ result before pity triggers */
  readonly pityThreshold: number;
  /** Minimum rarity guaranteed by pity */
  readonly pityRarity: GachaRarity;
  /** Whether the egg is currently available */
  readonly enabled: boolean;
  /** Max hatches per player (0 = unlimited) */
  readonly maxHatches: number;
}

// ---------------------------------------------------------------------------
// Hatch result
// ---------------------------------------------------------------------------

export type GachaStatus =
  | "success"
  | "egg_not_found"
  | "egg_disabled"
  | "insufficient_funds"
  | "invalid_balance"
  | "max_hatches_reached"
  | "loot_table_empty"
  | "slots_full";

export interface HatchResult {
  readonly ok: boolean;
  readonly status: GachaStatus;
  readonly itemId?: string;
  readonly rarity?: GachaRarity;
  readonly wasPity?: boolean;
}

// ---------------------------------------------------------------------------
// Player gacha data (persisted)
// ---------------------------------------------------------------------------

export interface GachaPlayerData {
  /** eggId → number of hatches */
  hatchCounts: Map<string, number>;
  /** eggId → current pity counter (rolls since last rare+) */
  pityCounters: Map<string, number>;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface HatchEvent {
  readonly playerId: number;
  readonly eggId: string;
  readonly itemId: string;
  readonly rarity: GachaRarity;
  readonly wasPity: boolean;
  readonly timestamp: number;
}

export type HatchCallback = (event: HatchEvent) => void;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface GachaConfig {
  readonly datastoreName?: string;
  readonly enableLogging?: boolean;
}

export const DEFAULT_GACHA_CONFIG: GachaConfig = {
  datastoreName: "GachaData",
  enableLogging: false,
};

export const VERSION = "0.1.0";

// ---------------------------------------------------------------------------
// Rarity utilities (shared across gacha modules)
// ---------------------------------------------------------------------------

export const RARITY_ORDER: ReadonlyArray<GachaRarity> = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
];

export function rarityRank(r: GachaRarity): number {
  for (let i = 0; i < RARITY_ORDER.size(); i++) {
    if (RARITY_ORDER[i] === r) return i;
  }
  return 0;
}
