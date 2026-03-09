/**
 * @broblox/equipment — Type Definitions
 *
 * Types for gear definitions, stat modifiers, equip slots, and configuration.
 */

// ============================================================================
// Stat Modifiers
// ============================================================================

/** A numeric modifier applied to a player stat when gear is equipped. */
export interface StatModifier {
  /** Stat key (e.g. "speed", "jump", "stamina", "damage", "defense"). */
  readonly stat: string;
  /** Flat bonus added to the base stat. */
  readonly flat: number;
}

// ============================================================================
// Gear Definitions
// ============================================================================

/** Rarity tiers for gear. */
export type GearRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

/** Static definition of a gear item (registered once, never mutated). */
export interface GearDefinition {
  /** Unique gear type identifier (e.g. "running_shoes"). */
  readonly id: string;
  /** Human-readable display name. */
  readonly name: string;
  /** Optional description. */
  readonly description?: string;
  /** Rarity tier. */
  readonly rarity: GearRarity;
  /** Which equip slot this gear occupies. */
  readonly slot: string;
  /** Stat modifiers applied when equipped. */
  readonly modifiers: readonly StatModifier[];
  /** Level requirement to equip (0 = no requirement). */
  readonly levelRequirement?: number;
  /** Coin cost to purchase from shop (0 = not purchasable). */
  readonly price?: number;
  /** Optional tags for filtering (e.g. ["speed", "agility"]). */
  readonly tags?: readonly string[];
}

// ============================================================================
// Player Equipment State
// ============================================================================

/** A player's equipment state (serializable). */
export interface EquipmentData {
  /** Slot name → gear ID currently equipped. */
  readonly equipped: Record<string, string>;
  /** Set of gear IDs the player owns. */
  readonly ownedGear: string[];
}

// ============================================================================
// Operation Results
// ============================================================================

export type EquipmentResultStatus =
  | "success"
  | "gear_not_found"
  | "not_owned"
  | "already_equipped"
  | "slot_mismatch"
  | "level_too_low"
  | "slot_empty"
  | "already_owned"
  | "insufficient_funds";

export interface EquipmentResult {
  readonly ok: boolean;
  readonly status: EquipmentResultStatus;
}

// ============================================================================
// Events
// ============================================================================

export interface GearEquipEvent {
  readonly playerId: number;
  readonly gearId: string;
  readonly slot: string;
  readonly equipped: boolean;
  readonly timestamp: number;
}

export type GearEquipCallback = (event: GearEquipEvent) => void;

// ============================================================================
// Configuration
// ============================================================================

export interface EquipmentConfig {
  /** Enable debug logging. */
  readonly enableLogging?: boolean;
}

export const DEFAULT_EQUIPMENT_CONFIG: Required<EquipmentConfig> = {
  enableLogging: false,
};
