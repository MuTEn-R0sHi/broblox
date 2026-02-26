/**
 * @broblox/pets — Type Definitions
 *
 * Types for pet species, instances, abilities, evolution, and configuration.
 */

// ============================================================================
// Pet Species (Static Definitions)
// ============================================================================

/** Pet rarity tiers */
export type PetRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

/** Pet element/affinity type */
export type PetElement = "fire" | "water" | "earth" | "air" | "light" | "dark" | "neutral";

/** A single ability a pet can have */
export interface PetAbility {
  id: string;
  name: string;
  description: string;
  /** Stat multiplier this ability grants (e.g., 1.1 = +10%) */
  multiplier: number;
  /** Stat key this ability affects */
  stat: string;
}

/** Static definition of a pet species (registered once) */
export interface PetSpecies {
  /** Unique species identifier (e.g., "fire_dragon") */
  id: string;
  /** Display name */
  name: string;
  /** Optional description */
  description?: string;
  /** Rarity tier */
  rarity: PetRarity;
  /** Elemental type */
  element: PetElement;
  /** Base stats at level 1 */
  baseStats: PetStats;
  /** Max level this species can reach */
  maxLevel: number;
  /** XP required for level 2 (scales with growthRate) */
  baseXp: number;
  /** XP growth multiplier per level */
  growthRate: number;
  /** Abilities unlocked at specific levels: [level, ability] */
  abilities: Array<[number, PetAbility]>;
  /** Evolution target species ID (undefined = no evolution) */
  evolvesInto?: string;
  /** Level required to evolve */
  evolveLevel?: number;
  /** Optional tags for filtering */
  tags?: string[];
}

/** Base statistics for a pet */
export interface PetStats {
  /** Generic power stat */
  power: number;
  /** Speed stat */
  speed: number;
  /** Stamina/health stat */
  stamina: number;
  /** Luck stat (affects drops, etc.) */
  luck: number;
}

// ============================================================================
// Pet Instances (Per-Player)
// ============================================================================

/** A concrete pet instance owned by a player */
export interface PetInstance {
  /** Unique pet instance UUID */
  instanceId: string;
  /** Reference to PetSpecies.id */
  speciesId: string;
  /** Player-assigned nickname (optional) */
  nickname?: string;
  /** Current level */
  level: number;
  /** Current XP towards next level */
  xp: number;
  /** Whether this pet is currently equipped/active */
  equipped: boolean;
  /** Whether this pet is locked (protected from deletion) */
  locked: boolean;
  /** Unix timestamp when acquired */
  acquiredAt: number;
  /** Custom metadata */
  metadata?: Map<string, unknown>;
}

/** Player's full pet collection state (serializable) */
export interface PetPlayerData {
  playerId: number;
  pets: PetInstance[];
  maxSlots: number;
  version: number;
}

// ============================================================================
// Operation Results
// ============================================================================

export const MAX_NICKNAME_LENGTH = 30;

export type PetResultStatus =
  | "success"
  | "pet_not_found"
  | "species_not_found"
  | "slots_full"
  | "max_equipped"
  | "already_equipped"
  | "not_equipped"
  | "max_level"
  | "insufficient_xp"
  | "cannot_evolve"
  | "pet_locked"
  | "invalid_amount"
  | "invalid_nickname"
  | "datastore_error"
  | "unknown_error";

export interface PetResult {
  ok: boolean;
  status: PetResultStatus;
  pet?: PetInstance;
  message?: string;
}

// ============================================================================
// Events
// ============================================================================

export interface PetLevelUpEvent {
  playerId: number;
  instanceId: string;
  speciesId: string;
  previousLevel: number;
  newLevel: number;
}

export interface PetEvolvedEvent {
  playerId: number;
  instanceId: string;
  fromSpecies: string;
  toSpecies: string;
}

export interface PetEquippedEvent {
  playerId: number;
  instanceId: string;
  speciesId: string;
  equipped: boolean;
}

export type PetLevelUpCallback = (event: PetLevelUpEvent) => void;
export type PetEvolvedCallback = (event: PetEvolvedEvent) => void;
export type PetEquippedCallback = (event: PetEquippedEvent) => void;

// ============================================================================
// Configuration
// ============================================================================

export interface PetConfig {
  datastoreName?: string;
  defaultMaxSlots?: number;
  maxEquipped?: number;
  enableLogging?: boolean;
}

export const DEFAULT_PET_CONFIG: Required<PetConfig> = {
  datastoreName: "PlayerPets_v1",
  defaultMaxSlots: 100,
  maxEquipped: 3,
  enableLogging: false,
};

export const PET_DATA_VERSION = 1;
