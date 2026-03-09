# Modules: Equipment

Reusable gear & equipment slot system — registry, equip/unequip, stat modifiers, and rarity tiers (`@broblox/equipment`). **Status: Implemented** (54 tests).

## Purpose

- Typed gear definitions with rarity tiers (Common → Legendary).
- Per-player equipment slots with equip/unequip/swap operations.
- Stat modifier system (additive bonuses to speed, jump, stamina, etc.).
- Generic — works for any game that needs equippable items with stat effects.

## Core rules

- Gear definitions are registered once in a `GearRegistry`; shared across all players.
- Each player has an `EquipmentStore` with configurable slot limits (default: 8 slots).
- Equip operations validate ownership, slot capacity, and duplicate prevention.
- Stat modifiers are summed at query time — no mutation of base player attributes.

## Data model

- `GearDefinition` — static gear template: `id`, `displayName`, `description`, `rarity`, `statModifiers`, `tags`, `maxStack`.
- `StatModifier` — `{ stat: string; value: number }` — additive bonus applied when gear is equipped.
- `GearRarity` — `"common" | "uncommon" | "rare" | "epic" | "legendary"`.
- `EquipmentData` — per-player state: `equipped` array of gear IDs, `maxSlots`.
- `EquipmentResult` — operation result: `{ status: EquipmentResultStatus; message?: string }`.

## Public API

### GearRegistry

| Method           | Description                       |
| ---------------- | --------------------------------- |
| `register(def)`  | Register a gear definition        |
| `get(id)`        | Retrieve a definition by ID       |
| `getAll()`       | Get all registered definitions    |
| `getByRarity(r)` | Filter definitions by rarity tier |
| `getByTag(tag)`  | Filter definitions by tag         |
| `has(id)`        | Check if a gear ID is registered  |
| `count()`        | Total registered definitions      |

### EquipmentStore

| Method                         | Description                                    |
| ------------------------------ | ---------------------------------------------- |
| `equip(playerId, gearId)`      | Equip a gear item (validates registry + slots) |
| `unequip(playerId, gearId)`    | Remove a gear item from equipped slots         |
| `getEquipped(playerId)`        | Get all equipped gear IDs for a player         |
| `isEquipped(playerId, id)`     | Check if a specific gear is equipped           |
| `getStatBonuses(playerId)`     | Sum all stat modifiers from equipped gear      |
| `getStatBonus(playerId, stat)` | Sum modifiers for a specific stat              |
| `clearEquipment(playerId)`     | Unequip all gear                               |
| `initPlayer(playerId)`         | Initialize player equipment state              |
| `cleanupPlayer(playerId)`      | Remove player state on disconnect              |

### Factory

```ts
import { createEquipmentService } from "@broblox/equipment";

const handle = createEquipmentService({
  definitions: [
    {
      id: "speed_boots",
      displayName: "Speed Boots",
      rarity: "common",
      statModifiers: [{ stat: "speed", value: 2 }],
      tags: ["feet"],
    },
    {
      id: "rocket_pack",
      displayName: "Rocket Pack",
      rarity: "rare",
      statModifiers: [{ stat: "jump", value: 5 }],
      tags: ["back"],
    },
  ],
  maxSlots: 8,
  onEquip: (playerId, gearId) => {
    /* apply visuals */
  },
  onUnequip: (playerId, gearId) => {
    /* remove visuals */
  },
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
});
```

## Config

| Key        | Default | Description                            |
| ---------- | ------- | -------------------------------------- |
| `maxSlots` | `8`     | Maximum equipped gear slots per player |

## Observability

- `GearEquipEvent` — player equipped a gear item (playerId, gearId)
- `GearUnequipEvent` — player unequipped a gear item
- `EquipRejectedEvent` — equip failed (slot full, not registered, already equipped)
