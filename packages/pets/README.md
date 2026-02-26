# @broblox/pets

Pet system with hatching, equipping, leveling, evolution, and abilities.

## Purpose

This package provides a complete pet system:

- **Species definitions** — Stats, abilities, elements, rarity, evolution paths
- **Pet instances** — Unique pets per player with level, XP, nickname
- **Equip slots** — Configurable max equipped pets (default 3)
- **Leveling & XP** — Auto level-up with growth rate curves
- **Evolution** — Transform pets at required levels
- **Stat bonuses** — Effective stats scale with level and ability multipliers
- **Per-player persistence** — DataStore-backed pet collections

## Dependencies

- `@broblox/core` — Service lifecycle, logging
- `@broblox/observability` — Metrics and telemetry
- `@broblox/shared-types` — Rarity definitions

## Architecture

### Registry → Store Pattern

1. **PetRegistry** — Register species definitions (stats, abilities, evolution)
2. **PetStore** — Per-player collection: pet instances, equip state, leveling
3. **`createPetService`** — Wires registry + per-player stores

### Progression Flow

1. Player acquires a pet → `store.addPet(speciesId)` creates unique instance
2. Earn XP → `store.addXp(instanceId, amount)` auto-levels
3. Abilities unlock at specific levels
4. Evolution available when `evolveLevel` is reached → `store.evolvePet(instanceId)`

### Stats System

`getEffectiveStats(instanceId)` returns `PetStats` (`power`, `speed`, `stamina`, `luck`) with level scaling and ability multipliers applied.

## Usage

```typescript
import { createPetService } from "@broblox/pets";

const pets = createPetService({
  pets: [
    {
      id: "fire_cat",
      name: "Fire Cat",
      rarity: "rare",
      element: "fire",
      baseStats: { power: 10, speed: 8, stamina: 6, luck: 4 },
      maxLevel: 50,
      baseXp: 100,
      growthRate: 1.15,
      abilities: [
        [
          5,
          {
            id: "flame_boost",
            name: "Flame Boost",
            description: "...",
            multiplier: 1.2,
            stat: "power",
          },
        ],
      ],
      evolvesInto: "inferno_cat",
      evolveLevel: 25,
    },
  ],
  datastoreName: "Pets",
  maxEquipped: 3,
});

// On player join
pets.initPlayer(playerId);
const store = pets.getPetStore(playerId);
store.addPet("fire_cat", "Whiskers");
```

## Related Docs

- [Module docs](../../docs/modules/pets.md)
