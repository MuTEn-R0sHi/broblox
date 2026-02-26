/**
 * @broblox/inventory
 *
 * Base item and slot inventory system for Roblox games.
 * Provides:
 * - Item registry for defining item types with categories, rarities, and tags
 * - Per-player inventory with stackable/non-stackable items
 * - DataStore persistence with save/load lifecycle
 * - Transfer between players with tradeability checks
 * - Capacity management (slots + total item limits)
 * - Instance metadata for custom data (enchantments, durability, etc.)
 */

export * from "./types";
export { ItemRegistry } from "./item-registry";
export { InventoryStore } from "./inventory-store";
export { createInventoryService } from "./create-inventory-service";
export type { InventoryServiceConfig, InventoryServiceHandle } from "./create-inventory-service";
