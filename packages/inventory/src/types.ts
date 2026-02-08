/**
 * @rbx/inventory — Type Definitions
 *
 * Types for items, slots, inventories, and configuration.
 */

// ============================================================================
// Item Definitions
// ============================================================================

/** Rarity tiers for items */
export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

/** Item categories for filtering and organization */
export type ItemCategory =
  | "weapon"
  | "armor"
  | "consumable"
  | "material"
  | "currency"
  | "egg"
  | "tool"
  | "quest"
  | "misc";

/** Static definition of an item type (registered once, never mutated) */
export interface ItemDefinition {
  /** Unique item type identifier (e.g., "iron_sword") */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Optional description */
  description?: string;
  /** Category for filtering */
  category: ItemCategory;
  /** Rarity tier */
  rarity: ItemRarity;
  /** Maximum stack size (1 = non-stackable) */
  maxStack: number;
  /** Whether this item can be traded between players */
  tradeable?: boolean;
  /** Whether this item can be dropped/destroyed */
  droppable?: boolean;
  /** Optional metadata schema version for data migration */
  version?: number;
  /** Optional tags for flexible filtering */
  tags?: string[];
}

// ============================================================================
// Item Instances
// ============================================================================

/** A concrete item instance in a player's inventory */
export interface ItemInstance {
  /** Unique instance UUID */
  instanceId: string;
  /** Reference to the ItemDefinition.id */
  itemId: string;
  /** Current stack count (1 for non-stackable) */
  quantity: number;
  /** Unix timestamp when acquired */
  acquiredAt: number;
  /** Optional custom data (enchantments, durability, etc.) */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Inventory Structure
// ============================================================================

/** A player's full inventory state (serializable to DataStore) */
export interface InventoryData {
  /** Player user ID */
  playerId: number;
  /** All item instances */
  items: ItemInstance[];
  /** Maximum total slots (capacity) */
  maxSlots: number;
  /** Schema version for data migration */
  version: number;
}

// ============================================================================
// Operation Results
// ============================================================================

/** Result status codes for inventory operations */
export type InventoryResultStatus =
  | "success"
  | "inventory_full"
  | "item_not_found"
  | "insufficient_quantity"
  | "invalid_item"
  | "stack_overflow"
  | "not_tradeable"
  | "not_droppable"
  | "already_exists"
  | "datastore_error"
  | "unknown_error";

/** Result of an inventory operation */
export interface InventoryResult {
  /** Whether the operation succeeded */
  ok: boolean;
  /** Status code */
  status: InventoryResultStatus;
  /** Affected item instance (if applicable) */
  item?: ItemInstance;
  /** Human-readable message */
  message?: string;
}

/** Result of a transfer operation between players */
export interface TransferResult {
  ok: boolean;
  status: InventoryResultStatus;
  /** Instance moved from source */
  sourceItem?: ItemInstance;
  /** Instance added to target */
  targetItem?: ItemInstance;
  message?: string;
}

// ============================================================================
// Configuration
// ============================================================================

/** Inventory system configuration */
export interface InventoryConfig {
  /** DataStore name for persistence */
  datastoreName?: string;
  /** Default max slots for new players */
  defaultMaxSlots?: number;
  /** Enable debug logging */
  enableLogging?: boolean;
  /** Auto-save interval in seconds (0 = manual save only) */
  autoSaveInterval?: number;
  /** Maximum items across all stacks */
  maxTotalItems?: number;
}

/** Default configuration values */
export const DEFAULT_INVENTORY_CONFIG: Required<InventoryConfig> = {
  datastoreName: "PlayerInventory_v1",
  defaultMaxSlots: 50,
  enableLogging: false,
  autoSaveInterval: 60,
  maxTotalItems: 500,
};

/** Current inventory data schema version */
export const INVENTORY_DATA_VERSION = 1;
