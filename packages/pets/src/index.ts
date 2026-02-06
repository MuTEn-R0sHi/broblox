/**
 * @rbx/pets
 *
 * Pet system for Roblox games.
 * Provides:
 * - Pet species registry with rarity, elements, abilities
 * - Per-player pet collection with equip/unequip
 * - XP leveling with auto level-up
 * - Evolution system between species
 * - Effective stat calculation with abilities
 * - DataStore persistence
 */

export * from "./types";
export { PetRegistry } from "./pet-registry";
export { PetStore } from "./pet-store";
