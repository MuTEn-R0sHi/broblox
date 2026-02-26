# @broblox/cosmetics

Cosmetic items, skins, and appearance customization.

## Purpose

This package provides a cosmetic item system:

- **Item definitions** — Skins, hats, trails, effects, emotes, accessories, titles
- **Ownership tracking** — Grant, revoke, and query cosmetic ownership
- **Equip slots** — Equip cosmetics to head, body, trail, effect, emote, or title slots
- **Per-player persistence** — DataStore-backed owned/equipped state

## Dependencies

- `@broblox/core` — Service lifecycle, logging
- `@broblox/observability` — Metrics and telemetry
- `@broblox/shared-types` — Rarity definitions and constants

## Architecture

### Registry → Store Pattern

1. **CosmeticRegistry** — Register cosmetic definitions with rarity, category, and tradeability
2. **CosmeticStore** — Per-player state: owned cosmetics, equipped slots
3. **`createCosmeticsService`** — Wires registry + per-player stores

### Equip System

Each player has typed equip slots (`head`, `body`, `trail`, `effect`, `emote_1`, `emote_2`, `title`). Equipping validates ownership and registry membership.

## Usage

```typescript
import { createCosmeticsService } from "@broblox/cosmetics";

const cosmetics = createCosmeticsService({
  cosmetics: [
    {
      id: "golden_crown",
      name: "Golden Crown",
      description: "A shiny crown",
      category: "hat",
      rarity: "legendary",
      tradeable: true,
      limited: false,
    },
  ],
  datastoreName: "Cosmetics",
});

// On player join
cosmetics.initPlayer(playerId);
const store = cosmetics.getCosmeticStore(playerId);
store.grant("golden_crown");
store.equip("golden_crown", "head");
```

## Related Docs

- [Module docs](../../docs/modules/cosmetics.md)
