# Modules: Inventory

Base item and slot inventory system with DataStore persistence (`@rbx/inventory`). **Status: Implemented** (57 tests).

## Purpose

- Item registry with categories, rarities, and stack limits.
- Per-player inventory with slot capacity and auto-stacking.
- Player-to-player transfers with tradeability checks and rollback.
- DataStore persistence with auto-save and dirty tracking.

## Core rules

- Items are defined as static `ItemDefinition` templates; instances carry per-item state.
- Auto-stacking: `addItem()` merges into existing stacks before creating new ones.
- Capacity enforced by both slot count (`maxSlots`) and total item count (`maxTotalItems`).
- Transfers validate the `tradeable` flag and auto-rollback if the target inventory is full.

## Data model

- `ItemDefinition` — `id`, `name`, `description?`, `category`, `rarity`, `maxStack`, `tradeable?`, `droppable?`, `tags?`.
- `ItemInstance` — `instanceId` (UUID), `itemId`, `quantity`, `acquiredAt`, `metadata?`.
- `InventoryData` — `playerId`, `items[]`, `maxSlots`, `version`.
- `ItemCategory` — `"weapon" | "armor" | "consumable" | "material" | "currency" | "egg" | "tool" | "quest" | "misc"`.
- `ItemRarity` — `"common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic"`.

## Public API

### ItemRegistry

| Method                                                      | Description               |
| ----------------------------------------------------------- | ------------------------- |
| `register(def)` / `registerAll(defs)`                       | Register item definitions |
| `get(id)` / `has(id)`                                       | Lookup by ID              |
| `getByCategory(cat)` / `getByRarity(rar)` / `getByTag(tag)` | Filtered lookups          |

### InventoryStore (per-player)

| Method                                   | Description                           |
| ---------------------------------------- | ------------------------------------- |
| `addItem(itemId, qty, metadata?)`        | Add items with auto-stacking          |
| `removeItem(itemId, qty)`                | Remove by item type                   |
| `removeInstance(instanceId)`             | Remove specific instance              |
| `hasItem(itemId, qty)`                   | Quantity check                        |
| `getItemCount(itemId)`                   | Total across all stacks               |
| `getAllItems()`                          | All instances                         |
| `getUsedSlots()` / `getAvailableSlots()` | Capacity queries                      |
| `expandSlots(n)`                         | Increase capacity                     |
| `transferTo(target, itemId, qty)`        | Transfer with tradeability + rollback |
| `sort()`                                 | Sort by category → rarity → ID        |

### Factory

```ts
const inv = createInventoryService({
  defaultMaxSlots: 50,
  maxTotalItems: 500,
  items: [
    { id: "sword_iron", name: "Iron Sword", category: "weapon", rarity: "common", maxStack: 1 },
    {
      id: "potion_hp",
      name: "Health Potion",
      category: "consumable",
      rarity: "common",
      maxStack: 99,
    },
  ],
});
```

## Security

- **`tradeable` flag** — non-tradeable items are rejected by `transferTo()`.
- **Transfer rollback** — items re-added to source if target is full.
- **UUID instance IDs** — `HttpService.GenerateGUID` with fallback.
- **Capacity limits** — both slot count and total item count enforced.

## Config

| Key                | Default                | Description                  |
| ------------------ | ---------------------- | ---------------------------- |
| `datastoreName`    | `"PlayerInventory_v1"` | DataStore name               |
| `defaultMaxSlots`  | `50`                   | Starting slot capacity       |
| `maxTotalItems`    | `500`                  | Global item cap              |
| `autoSaveInterval` | `60`                   | Auto-save interval (seconds) |

## Observability

- `inventory_items_added` / `inventory_items_removed`
- `inventory_save_attempts` / `inventory_save_failures`
- `inventory_load_attempts`
