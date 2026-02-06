/**
 * Item Registry
 *
 * Central registry for item definitions. Register item types once,
 * then reference them by ID when adding items to inventories.
 */

import { createLogger } from "@rbx/core";
import type { ItemDefinition, ItemCategory, ItemRarity } from "./types";

const logger = createLogger("Inventory.ItemRegistry");

/**
 * Manages registered item definitions.
 * Item definitions are static metadata — they describe what an item *is*.
 */
export class ItemRegistry {
  private definitions = new Map<string, ItemDefinition>();
  private enableLogging: boolean;

  constructor(enableLogging = false) {
    this.enableLogging = enableLogging;
  }

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  /**
   * Register a single item definition.
   * Overwrites if the same ID already exists.
   */
  register(definition: ItemDefinition): void {
    if (definition.maxStack < 1) {
      definition = { ...definition, maxStack: 1 };
    }
    this.definitions.set(definition.id, definition);
    if (this.enableLogging) {
      logger.info(
        `Registered item: ${definition.id} (${definition.category}/${definition.rarity})`
      );
    }
  }

  /**
   * Register multiple item definitions at once.
   */
  registerAll(definitions: ItemDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }

  /**
   * Remove an item definition from the registry.
   */
  unregister(itemId: string): boolean {
    const existed = this.definitions.has(itemId);
    this.definitions.delete(itemId);
    return existed;
  }

  // --------------------------------------------------------------------------
  // Lookups
  // --------------------------------------------------------------------------

  /**
   * Get an item definition by ID.
   */
  get(itemId: string): ItemDefinition | undefined {
    return this.definitions.get(itemId);
  }

  /**
   * Check if an item ID is registered.
   */
  has(itemId: string): boolean {
    return this.definitions.has(itemId);
  }

  /**
   * Get all registered item definitions.
   */
  getAll(): ItemDefinition[] {
    const result: ItemDefinition[] = [];
    this.definitions.forEach((def) => result.push(def));
    return result;
  }

  /**
   * Get items filtered by category.
   */
  getByCategory(category: ItemCategory): ItemDefinition[] {
    const result: ItemDefinition[] = [];
    this.definitions.forEach((def) => {
      if (def.category === category) {
        result.push(def);
      }
    });
    return result;
  }

  /**
   * Get items filtered by rarity.
   */
  getByRarity(rarity: ItemRarity): ItemDefinition[] {
    const result: ItemDefinition[] = [];
    this.definitions.forEach((def) => {
      if (def.rarity === rarity) {
        result.push(def);
      }
    });
    return result;
  }

  /**
   * Get items that have a specific tag.
   */
  getByTag(tag: string): ItemDefinition[] {
    const result: ItemDefinition[] = [];
    this.definitions.forEach((def) => {
      if (def.tags) {
        for (const t of def.tags) {
          if (t === tag) {
            result.push(def);
            break;
          }
        }
      }
    });
    return result;
  }

  /**
   * Get the total number of registered items.
   */
  count(): number {
    let n = 0;
    this.definitions.forEach(() => n++);
    return n;
  }

  /**
   * Clear all registered definitions.
   */
  clear(): void {
    this.definitions.clear();
  }
}
