# @broblox/inventory

Base item and slot inventory system for Roblox games.

## Features

- **Item Registry** — Define item types with categories, rarities, tags, and stack sizes
- **Per-Player Inventory** — Stackable/non-stackable items with slot-based capacity
- **DataStore Persistence** — Save/load lifecycle with dirty tracking
- **Transfer System** — Move items between players with tradeability checks
- **Instance Metadata** — Custom data per item instance (enchantments, durability, etc.)
- **Sorting** — Sort by category → rarity → item ID
- **Observability** — Counter metrics for adds, removes, saves, loads

## Usage

```ts
import { ItemRegistry, InventoryStore } from "@broblox/inventory";

// 1. Define items
const registry = new ItemRegistry();
registry.registerAll([
  { id: "wood", name: "Wood", category: "material", rarity: "common", maxStack: 64 },
  { id: "iron_sword", name: "Iron Sword", category: "weapon", rarity: "uncommon", maxStack: 1 },
]);

// 2. Create per-player inventory
const inventory = new InventoryStore(player.UserId, registry, {
  defaultMaxSlots: 50,
  enableLogging: true,
});
inventory.init();
inventory.load();

// 3. Add / remove / query
inventory.addItem("wood", 10);
inventory.addItem("iron_sword", 1, { durability: 100 });
inventory.hasItem("wood", 5); // true
inventory.removeItem("wood", 3);
inventory.save();
```

## Architecture

- `ItemRegistry` — Static definitions, registered once at startup
- `InventoryStore` — Per-player mutable state, one instance per player
- Items are identified by `itemId` (type) and `instanceId` (unique instance)
- Stackable items merge into existing stacks up to `maxStack`
- Non-stackable items (`maxStack: 1`) always occupy one slot each
