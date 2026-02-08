# @rbx/gacha

Gacha / loot box system with weighted drops and pity timers.

## Purpose

This package implements a gacha (egg hatching) system:

- **Egg definitions** — Named loot containers with weighted drop tables
- **Weighted random** — Configurable rarity weights per egg
- **Pity system** — Guaranteed rare drops after N unlucky hatches
- **Per-player tracking** — Hatch counts and pity counters in DataStore

## Dependencies

- `@rbx/core` — Service lifecycle, logging
- `@rbx/observability` — Metrics and telemetry
- `@rbx/shared-types` — Rarity definitions

## Architecture

### Registry → Store Pattern

1. **EggRegistry** — Register egg definitions (loot tables, pity thresholds, costs)
2. **GachaStore** — Per-player state: hatch counts, pity counters
3. **`createGachaService`** — Wires registry + per-player stores

### Hatch Flow

1. Player requests hatch → `store.hatch(eggId, currencyBalance)`
2. Store validates currency and egg availability
3. Weighted random selects from loot table (or pity guarantees a rare)
4. Result returned, pity counter resets or increments
5. `onHatch` callbacks fire with result

### Rarity Tiers

`common` → `uncommon` → `rare` → `epic` → `legendary` → `mythic`

## Usage

```typescript
import { createGachaService } from "@rbx/gacha";

const gacha = createGachaService({
  eggs: [
    {
      id: "basic_egg",
      name: "Basic Egg",
      description: "A common egg",
      cost: 100,
      currency: "coins",
      lootTable: [
        { itemId: "cat", rarity: "common", weight: 70 },
        { itemId: "dog", rarity: "rare", weight: 25 },
        { itemId: "dragon", rarity: "legendary", weight: 5 },
      ],
      pityThreshold: 50,
      pityRarity: "legendary",
      enabled: true,
      maxHatches: 0,
    },
  ],
  datastoreName: "Gacha",
});

// On player join
gacha.initPlayer(playerId);
const store = gacha.getGachaStore(playerId);
const result = store.hatch("basic_egg", 500);
```

## Related Docs

- [Module docs](../../docs/modules/gacha.md)
