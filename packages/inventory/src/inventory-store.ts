/**
 * Inventory Store
 *
 * Per-player inventory management with DataStore persistence.
 * Supports stackable/non-stackable items, quantity operations,
 * capacity limits, and save/load lifecycle.
 */

import { createLogger } from "@rbx/core";
import { Counter } from "@rbx/observability";
import { ItemRegistry } from "./item-registry";
import type {
  ItemInstance,
  InventoryData,
  InventoryConfig,
  InventoryResult,
  TransferResult,
  DEFAULT_INVENTORY_CONFIG,
  INVENTORY_DATA_VERSION,
} from "./types";

// Re-import as values (types above are just for type annotations)
const DEFAULT_CONFIG: Required<InventoryConfig> = {
  datastoreName: "PlayerInventory_v1",
  defaultMaxSlots: 50,
  enableLogging: false,
  autoSaveInterval: 60,
  maxTotalItems: 500,
};
const DATA_VERSION = 1;

// Roblox globals
declare const game: {
  GetService(name: string): unknown;
};
declare function tostring(v: unknown): string;

interface DataStore {
  GetAsync(key: string): unknown;
  SetAsync(key: string, value: unknown): void;
  UpdateAsync(key: string, callback: (old: unknown) => unknown): unknown;
}

interface DataStoreService {
  GetDataStore(name: string): DataStore;
}

interface HttpService {
  GenerateGUID(wrapInCurlyBraces?: boolean): string;
}

// Roblox pcall
declare function pcall<T>(fn: () => T): LuaTuple<[boolean, T]>;
declare function typeIs(value: unknown, typeName: string): boolean;

// Math/os globals
declare const math: { floor(x: number): number; random(): number };
declare const os: { time(): number };

const itemsAdded = new Counter("inventory_items_added");
const itemsRemoved = new Counter("inventory_items_removed");
const saveAttempts = new Counter("inventory_save_attempts");
const saveFailures = new Counter("inventory_save_failures");
const loadAttempts = new Counter("inventory_load_attempts");

/**
 * Manages a single player's inventory.
 * One InventoryStore instance per player.
 */
export class InventoryStore {
  private playerId: number;
  private items: ItemInstance[] = [];
  private maxSlots: number;
  private config: Required<InventoryConfig>;
  private registry: ItemRegistry;
  private store: DataStore | undefined;
  private dirty = false;
  private logger: ReturnType<typeof createLogger> | undefined;

  constructor(playerId: number, registry: ItemRegistry, config?: InventoryConfig) {
    this.playerId = playerId;
    this.registry = registry;
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };
    this.maxSlots = this.config.defaultMaxSlots;

    if (this.config.enableLogging) {
      this.logger = createLogger(`Inventory.Player${playerId}`);
    }
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Initialize the DataStore connection. Call once before load/save.
   */
  init(): void {
    const DataStoreService = game.GetService("DataStoreService") as DataStoreService;
    this.store = DataStoreService.GetDataStore(this.config.datastoreName);
  }

  /**
   * Load inventory from DataStore. Creates empty inventory if none exists.
   */
  load(): InventoryResult {
    if (!this.store) {
      return { ok: false, status: "datastore_error", message: "store not initialized" };
    }

    loadAttempts.inc();
    const [ok, raw] = pcall(() => this.store!.GetAsync(`inventory_${this.playerId}`));

    if (!ok) {
      return { ok: false, status: "datastore_error", message: "failed to load inventory" };
    }

    if (raw !== undefined && typeIs(raw, "table")) {
      const data = raw as unknown as InventoryData;
      this.items = data.items ?? [];
      this.maxSlots = data.maxSlots ?? this.config.defaultMaxSlots;
      this.logger?.info(`Loaded ${this.items.size()} items.`);
    } else {
      // New player — empty inventory
      this.items = [];
      this.maxSlots = this.config.defaultMaxSlots;
      this.logger?.info("Created new empty inventory.");
    }

    this.dirty = false;
    return { ok: true, status: "success" };
  }

  /**
   * Save inventory to DataStore.
   */
  save(): InventoryResult {
    if (!this.store) {
      return { ok: false, status: "datastore_error", message: "store not initialized" };
    }

    saveAttempts.inc();

    const data: InventoryData = {
      playerId: this.playerId,
      items: this.items,
      maxSlots: this.maxSlots,
      version: DATA_VERSION,
    };

    const [ok] = pcall(() => this.store!.SetAsync(`inventory_${this.playerId}`, data));

    if (!ok) {
      saveFailures.inc();
      return { ok: false, status: "datastore_error", message: "failed to save inventory" };
    }

    this.dirty = false;
    this.logger?.info(`Saved ${this.items.size()} items.`);
    return { ok: true, status: "success" };
  }

  // --------------------------------------------------------------------------
  // Item Operations
  // --------------------------------------------------------------------------

  /**
   * Add an item to the inventory.
   * For stackable items, merges into existing stacks first.
   */
  addItem(itemId: string, quantity = 1, metadata?: Record<string, unknown>): InventoryResult {
    const def = this.registry.get(itemId);
    if (!def) {
      return { ok: false, status: "invalid_item", message: `unknown item: ${itemId}` };
    }
    if (quantity < 1) {
      return { ok: false, status: "invalid_item", message: "quantity must be >= 1" };
    }

    // Check total item limit
    if (this.config.maxTotalItems > 0) {
      const totalItems = this.getTotalItemCount();
      if (totalItems + quantity > this.config.maxTotalItems) {
        return { ok: false, status: "inventory_full", message: "total item limit reached" };
      }
    }

    let remaining = quantity;

    // Try to merge into existing stacks if stackable
    if (def.maxStack > 1) {
      for (const existing of this.items) {
        if (existing.itemId === itemId && existing.quantity < def.maxStack) {
          const space = def.maxStack - existing.quantity;
          const toAdd = remaining < space ? remaining : space;
          existing.quantity += toAdd;
          remaining -= toAdd;
          if (remaining <= 0) {
            this.dirty = true;
            itemsAdded.add(quantity);
            this.logger?.info(`Stacked ${quantity}x ${itemId}`);
            return { ok: true, status: "success", item: existing };
          }
        }
      }
    }

    // Create new stacks for remaining items
    while (remaining > 0) {
      // Check slot capacity
      if (this.items.size() >= this.maxSlots) {
        if (remaining < quantity) {
          // Partial add succeeded
          const added = quantity - remaining;
          this.dirty = true;
          itemsAdded.add(added);
          return {
            ok: false,
            status: "inventory_full",
            message: `only ${added} of ${quantity} added`,
          };
        }
        return { ok: false, status: "inventory_full", message: "no empty slots" };
      }

      const stackSize = remaining < def.maxStack ? remaining : def.maxStack;
      const instance: ItemInstance = {
        instanceId: this.generateId(),
        itemId: itemId,
        quantity: stackSize,
        acquiredAt: os.time(),
        metadata: metadata,
      };
      this.items.push(instance);
      remaining -= stackSize;
    }

    this.dirty = true;
    itemsAdded.add(quantity);
    this.logger?.info(`Added ${quantity}x ${itemId}`);

    // Return the last created instance
    return { ok: true, status: "success", item: this.items[this.items.size() - 1] };
  }

  /**
   * Remove a quantity of an item by item ID.
   * Removes from the first matching stacks found.
   */
  removeItem(itemId: string, quantity = 1): InventoryResult {
    if (quantity < 1) {
      return { ok: false, status: "invalid_item", message: "quantity must be >= 1" };
    }

    const available = this.getItemCount(itemId);
    if (available < quantity) {
      return {
        ok: false,
        status: "insufficient_quantity",
        message: `need ${quantity}, have ${available}`,
      };
    }

    let remaining = quantity;
    const toRemove: number[] = [];

    for (let i = 0; i < this.items.size(); i++) {
      const item = this.items[i];
      if (item.itemId === itemId) {
        if (item.quantity <= remaining) {
          remaining -= item.quantity;
          toRemove.push(i);
        } else {
          item.quantity -= remaining;
          remaining = 0;
        }
        if (remaining <= 0) break;
      }
    }

    // Remove empty stacks (iterate backwards to preserve indices)
    for (let i = toRemove.size() - 1; i >= 0; i--) {
      this.items.remove(toRemove[i]);
    }

    this.dirty = true;
    itemsRemoved.add(quantity);
    this.logger?.info(`Removed ${quantity}x ${itemId}`);
    return { ok: true, status: "success" };
  }

  /**
   * Remove a specific item instance by instance ID.
   */
  removeInstance(instanceId: string): InventoryResult {
    for (let i = 0; i < this.items.size(); i++) {
      if (this.items[i].instanceId === instanceId) {
        const removed = this.items[i];
        this.items.remove(i);
        this.dirty = true;
        itemsRemoved.add(removed.quantity);
        this.logger?.info(`Removed instance ${instanceId}`);
        return { ok: true, status: "success", item: removed };
      }
    }
    return { ok: false, status: "item_not_found", message: `instance ${instanceId} not found` };
  }

  /**
   * Check if the player has at least `quantity` of an item.
   */
  hasItem(itemId: string, quantity = 1): boolean {
    return this.getItemCount(itemId) >= quantity;
  }

  /**
   * Get total quantity of a specific item across all stacks.
   */
  getItemCount(itemId: string): number {
    let count = 0;
    for (const item of this.items) {
      if (item.itemId === itemId) {
        count += item.quantity;
      }
    }
    return count;
  }

  /**
   * Get a specific item instance by instance ID.
   */
  getInstance(instanceId: string): ItemInstance | undefined {
    for (const item of this.items) {
      if (item.instanceId === instanceId) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Get all instances of a specific item type.
   */
  getItemInstances(itemId: string): ItemInstance[] {
    const result: ItemInstance[] = [];
    for (const item of this.items) {
      if (item.itemId === itemId) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Get all items in the inventory.
   */
  getAllItems(): ItemInstance[] {
    const result: ItemInstance[] = [];
    for (const item of this.items) {
      result.push(item);
    }
    return result;
  }

  /**
   * Get items filtered by category (requires registry lookup).
   */
  getItemsByCategory(category: string): ItemInstance[] {
    const result: ItemInstance[] = [];
    for (const item of this.items) {
      const def = this.registry.get(item.itemId);
      if (def && def.category === category) {
        result.push(item);
      }
    }
    return result;
  }

  // --------------------------------------------------------------------------
  // Slot Management
  // --------------------------------------------------------------------------

  /**
   * Get the current number of occupied slots.
   */
  getUsedSlots(): number {
    return this.items.size();
  }

  /**
   * Get the maximum slot capacity.
   */
  getMaxSlots(): number {
    return this.maxSlots;
  }

  /**
   * Get number of available (empty) slots.
   */
  getAvailableSlots(): number {
    return this.maxSlots - this.items.size();
  }

  /**
   * Expand the inventory capacity.
   */
  expandSlots(additionalSlots: number): void {
    if (additionalSlots > 0) {
      this.maxSlots += additionalSlots;
      this.dirty = true;
      this.logger?.info(`Expanded to ${this.maxSlots} slots (+${additionalSlots})`);
    }
  }

  /**
   * Set the maximum slot count directly.
   */
  setMaxSlots(maxSlots: number): void {
    if (maxSlots >= 1) {
      this.maxSlots = maxSlots;
      this.dirty = true;
    }
  }

  // --------------------------------------------------------------------------
  // Transfer
  // --------------------------------------------------------------------------

  /**
   * Transfer an item from this inventory to another player's inventory.
   */
  transferTo(target: InventoryStore, itemId: string, quantity = 1): TransferResult {
    const def = this.registry.get(itemId);
    if (!def) {
      return { ok: false, status: "invalid_item", message: `unknown item: ${itemId}` };
    }
    if (def.tradeable === false) {
      return { ok: false, status: "not_tradeable", message: `${itemId} is not tradeable` };
    }

    // Remove from source
    const removeResult = this.removeItem(itemId, quantity);
    if (!removeResult.ok) {
      return { ok: false, status: removeResult.status, message: removeResult.message };
    }

    // Add to target
    const addResult = target.addItem(itemId, quantity);
    if (!addResult.ok) {
      // Rollback: re-add to source
      this.addItem(itemId, quantity);
      return { ok: false, status: addResult.status, message: `target: ${addResult.message}` };
    }

    this.logger?.info(`Transferred ${quantity}x ${itemId} to player ${target.getPlayerId()}`);
    return {
      ok: true,
      status: "success",
      targetItem: addResult.item,
    };
  }

  // --------------------------------------------------------------------------
  // Metadata
  // --------------------------------------------------------------------------

  /**
   * Update metadata on a specific item instance.
   */
  setInstanceMetadata(instanceId: string, metadata: Record<string, unknown>): InventoryResult {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      return { ok: false, status: "item_not_found", message: `instance ${instanceId} not found` };
    }
    instance.metadata = metadata;
    this.dirty = true;
    return { ok: true, status: "success", item: instance };
  }

  /**
   * Merge additional metadata fields into an item instance.
   */
  updateInstanceMetadata(instanceId: string, updates: Map<string, unknown>): InventoryResult {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      return { ok: false, status: "item_not_found", message: `instance ${instanceId} not found` };
    }
    const existing = instance.metadata ?? {};
    updates.forEach((value, key) => {
      (existing as Record<string, unknown>)[key] = value;
    });
    instance.metadata = existing;
    this.dirty = true;
    return { ok: true, status: "success", item: instance };
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  /**
   * Get the player ID this inventory belongs to.
   */
  getPlayerId(): number {
    return this.playerId;
  }

  /**
   * Whether the inventory has unsaved changes.
   */
  isDirty(): boolean {
    return this.dirty;
  }

  /**
   * Get total item count across all stacks.
   */
  getTotalItemCount(): number {
    let total = 0;
    for (const item of this.items) {
      total += item.quantity;
    }
    return total;
  }

  /**
   * Clear all items from the inventory.
   */
  clearAll(): void {
    this.items = [];
    this.dirty = true;
    this.logger?.info("Inventory cleared.");
  }

  /**
   * Sort inventory by category, then rarity, then item ID.
   */
  sort(): void {
    const rarityOrder = new Map<string, number>();
    rarityOrder.set("common", 0);
    rarityOrder.set("uncommon", 1);
    rarityOrder.set("rare", 2);
    rarityOrder.set("epic", 3);
    rarityOrder.set("legendary", 4);
    rarityOrder.set("mythic", 5);

    this.items.sort((a, b) => {
      const defA = this.registry.get(a.itemId);
      const defB = this.registry.get(b.itemId);
      if (!defA || !defB) return a.itemId < b.itemId;

      // Category first
      if (defA.category !== defB.category) {
        return defA.category < defB.category;
      }
      // Then rarity (higher rarity first)
      const rarA = rarityOrder.get(defA.rarity) ?? 0;
      const rarB = rarityOrder.get(defB.rarity) ?? 0;
      if (rarA !== rarB) {
        return rarA > rarB;
      }
      // Then alphabetical by item ID
      return a.itemId < b.itemId;
    });

    this.dirty = true;
  }

  /**
   * Generate a unique instance ID.
   * Uses HttpService in Roblox or a fallback for tests.
   */
  private generateId(): string {
    const [ok, result] = pcall(() => {
      const HttpService = game.GetService("HttpService") as HttpService;
      return HttpService.GenerateGUID(false);
    });
    if (ok && result) {
      return result as string;
    }
    // Fallback: timestamp + random-ish suffix
    return `${os.time()}_${math.floor(math.random() * 100000)}`;
  }
}
