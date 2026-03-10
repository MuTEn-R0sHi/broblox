# Modules: Equipment

Reusable gear & equipment slot system — registry, equip/unequip, stat modifiers, and rarity tiers (`@broblox/equipment`). **Status: Implemented** (54 tests).

## Purpose

- Typed gear definitions with rarity tiers (Common → Legendary).
- Per-player equipment slots with equip/unequip/swap operations.
- Stat modifier system (additive bonuses to speed, jump, stamina, etc.).
- Generic — works for any game that needs equippable items with stat effects.

## Core rules

- Gear definitions are registered once in a `GearRegistry`; shared across all players.
- Each player has an `EquipmentStore` — one gear per slot; slots are game-defined strings (e.g. `"feet"`, `"back"`, `"body"`).
- Equip operations validate ownership, slot match, level requirements, and duplicate prevention.
- Stat modifiers are summed at query time — no mutation of base player attributes.

## Data model

- `GearDefinition` — static gear template: `id`, `name`, `description?`, `rarity`, `slot`, `modifiers`, `levelRequirement?`, `price?`, `tags?`.
- `StatModifier` — `{ stat: string; flat: number }` — additive bonus applied when gear is equipped.
- `GearRarity` — `"common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic"`.
- `EquipmentData` — per-player serializable state: `{ equipped: Record<string, string>, ownedGear: string[] }` (slot → gearId map + owned list).
- `EquipmentResult` — operation result: `{ ok: boolean; status: EquipmentResultStatus }`.

## Public API

### GearRegistry

| Method              | Description                      |
| ------------------- | -------------------------------- |
| `register(def)`     | Register a gear definition       |
| `registerAll(defs)` | Register an array of definitions |
| `get(id)`           | Retrieve a definition by ID      |
| `getAll()`          | Get all registered definitions   |
| `getBySlot(slot)`   | Filter definitions by slot       |
| `has(id)`           | Check if a gear ID is registered |
| `count()`           | Total registered definitions     |

### EquipmentStore (per-player)

Constructed with `(playerId, registry)`. One instance per player, managed by the factory.

| Method                       | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| `loadFrom(data)`             | Hydrate from serialized `EquipmentData`                  |
| `serialize()`                | Export current state as `EquipmentData`                  |
| `grantGear(gearId)`          | Grant ownership of a gear item                           |
| `ownsGear(gearId)`           | Check if player owns a gear item                         |
| `getOwnedGear()`             | Get all owned gear IDs                                   |
| `equip(gearId, level?)`      | Equip a gear item (validates ownership, slot, level req) |
| `unequip(slot)`              | Remove gear from a slot                                  |
| `getEquipped(slot)`          | Get gear ID equipped in a slot                           |
| `getAllEquipped()`           | Get all equipped gear as `Record<string, string>`        |
| `computeBonuses()`           | Sum all stat modifiers from equipped gear                |
| `getStatBonus(stat)`         | Sum modifiers for a specific stat                        |
| `getGearModifiers(gearId)`   | Get modifiers for a specific gear item                   |
| `onEquipChanged(cb)`         | Subscribe to equip/unequip events                        |
| `isDirty()` / `clearDirty()` | Track unsaved changes                                    |

### Factory

```ts
import { createEquipmentService } from "@broblox/equipment";

const handle = createEquipmentService({
  gear: [
    {
      id: "speed_boots",
      name: "Speed Boots",
      rarity: "common",
      slot: "feet",
      modifiers: [{ stat: "speed", flat: 2 }],
      tags: ["speed"],
    },
    {
      id: "rocket_pack",
      name: "Rocket Pack",
      rarity: "rare",
      slot: "back",
      modifiers: [{ stat: "jump", flat: 5 }],
      tags: ["jump"],
    },
  ],
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
});

// handle.getGearRegistry()          → shared GearRegistry
// handle.getEquipmentStore(playerId) → per-player EquipmentStore
// handle.initPlayer(playerId)        → create store for player
// handle.cleanupPlayer(playerId)     → remove store on disconnect
```

## Config

| Key                | Required | Description                                     |
| ------------------ | -------- | ----------------------------------------------- |
| `gear`             | Yes      | Array of `GearDefinition` to register           |
| `onPlayerAdded`    | No       | Callback to wire player join → `initPlayer`     |
| `onPlayerRemoving` | No       | Callback to wire player leave → `cleanupPlayer` |

## Observability

- `GearEquipEvent` — player equipped/unequipped a gear item (`playerId`, `gearId`, `slot`, `equipped`, `timestamp`)
- Subscribe via `store.onEquipChanged(callback)`
