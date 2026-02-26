/**
 * @broblox/cosmetics — Types
 *
 * Cosmetic ownership, equip slots, and replication.
 */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type CosmeticCategory =
  | "skin"
  | "hat"
  | "trail"
  | "effect"
  | "accessory"
  | "emote"
  | "title";

export interface CosmeticDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: CosmeticCategory;
  /** Rarity for display */
  readonly rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  /** Whether the cosmetic can be traded */
  readonly tradeable: boolean;
  /** Whether it's limited edition */
  readonly limited: boolean;
  /** Asset ID for display / rendering */
  readonly assetId?: string;
}

// ---------------------------------------------------------------------------
// Equip slots
// ---------------------------------------------------------------------------

export type EquipSlot = "head" | "body" | "trail" | "effect" | "emote_1" | "emote_2" | "title";

/** Maps CosmeticCategory → allowed EquipSlot(s) */
export const CATEGORY_SLOTS: ReadonlyArray<[CosmeticCategory, EquipSlot]> = [
  ["hat", "head"],
  ["skin", "body"],
  ["trail", "trail"],
  ["effect", "effect"],
  ["emote", "emote_1"],
  ["accessory", "head"],
  ["title", "title"],
];

// ---------------------------------------------------------------------------
// Player data
// ---------------------------------------------------------------------------

export interface CosmeticPlayerData {
  /** Set of owned cosmetic IDs */
  ownedCosmetics: string[];
  /** Slot → cosmetic ID */
  equippedCosmetics: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type CosmeticStatus =
  | "success"
  | "cosmetic_not_found"
  | "already_owned"
  | "not_owned"
  | "invalid_slot"
  | "already_equipped"
  | "not_equipped"
  | "slot_category_mismatch";

export interface CosmeticResult {
  readonly ok: boolean;
  readonly status: CosmeticStatus;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface CosmeticEquipEvent {
  readonly playerId: number;
  readonly cosmeticId: string;
  readonly slot: EquipSlot;
  readonly equipped: boolean;
  readonly timestamp: number;
}

export type CosmeticEquipCallback = (event: CosmeticEquipEvent) => void;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface CosmeticsConfig {
  readonly datastoreName?: string;
  readonly enableLogging?: boolean;
  /** Whether to restrict cosmetics in ranked mode */
  readonly restrictedInRanked?: boolean;
}

export const DEFAULT_COSMETICS_CONFIG: CosmeticsConfig = {
  datastoreName: "CosmeticsData",
  enableLogging: false,
  restrictedInRanked: false,
};

export const VERSION = "0.1.0";
