# Modules: Gacha

Gacha / loot box system with weighted drops and pity timers (`@broblox/gacha`). **Status: Implemented** (30 tests).

## Purpose

- Weighted random item drops from named egg containers.
- Pity system guaranteeing rare drops after N unlucky hatches.
- Per-player hatch counts and pity counter persistence.
- Reusable across games with different egg and loot table definitions.

## Core rules

- All hatching is server-authoritative.
- Weighted random uses cumulative weight selection.
- Pity counter increments on each hatch that doesn't yield the pity rarity.
- When pity threshold is reached, the next hatch guarantees the pity rarity.
- Currency deduction must be validated server-side before hatching.

## Data model

- `EggDefinition` — `id`, `name`, `cost`, `currency`, `lootTable: GachaWeight[]`, `pityThreshold`, `pityRarity`, `enabled`
- `GachaWeight` — `itemId`, `rarity`, `weight`
- `GachaPlayerData` — `hatchCounts: Map<eggId, count>`, `pityCounters: Map<eggId, count>`

## Security

- Client sends hatch request (intent only).
- Server verifies: egg exists, egg enabled, sufficient currency, max hatches not exceeded.
- Server performs weighted random; client cannot influence outcome.
- Rate limit hatch requests to prevent spam.

## Config/flags

- `gacha.enabled` (kill-switch)
- `gacha.eggs` (egg definitions with loot tables)

## Observability

- `gacha.hatch_requested` — hatch attempt
- `gacha.hatch_result` — hatch outcome with rarity
- `gacha.pity_triggered` — pity guarantee activated

## Rollout

- Dev: all eggs enabled
- Stage: canary with limited egg pool
- Prod: progressive rollout per egg
