# Modules: Pets

Pet system with hatching, equipping, leveling, evolution, and abilities (`@broblox/pets`). **Status: Implemented** (45 tests).

## Purpose

- Collectible pet companions with unique instances per player.
- Level-up progression with XP curves and ability unlocks.
- Evolution system transforming pets at required levels.
- Equip slots limiting active pets (default 3).

## Core rules

- Pet instances are unique (UUID-based `instanceId`).
- All XP grants and evolution are server-authoritative.
- Equip/unequip validated server-side against ownership.
- Stats scale with level: `base × (1 + (level - 1) × growthRate)`.
- Abilities unlock at specific levels and apply stat multipliers.

## Data model

- `PetSpecies` — static template: `id`, `name`, `rarity`, `element`, `baseStats`, `maxLevel`, `abilities[]`, `evolvesInto?`
- `PetInstance` — per-player: `instanceId`, `speciesId`, `level`, `xp`, `equipped`, `locked`, `nickname?`
- `PetPlayerData` — collection: `pets[]`, `maxSlots`, `version`

## Security

- Client sends equip/unequip intents only.
- Server validates ownership, slot limits, and lock state.
- XP grants only from server-trusted sources.
- Evolution checks level requirement server-side.

## Config/flags

- `pets.enabled` (kill-switch)
- `pets.maxEquipped` (default 3)
- `pets.maxSlots` (default 100)

## Observability

- `pets.hatched` — new pet acquired
- `pets.level_up` — pet leveled up
- `pets.evolved` — pet evolved to new species
- `pets.equipped` / `pets.unequipped`
