# Modules: Cosmetics

A reusable cosmetics/appearance system (`@broblox/cosmetics`). **Status: Implemented** (26 tests).

## Purpose

- Manage cosmetic ownership, equip rules, and replication.
- Keep it performant across devices.

## Core rules

- Ownership is server authoritative.
- Equip is a server-approved request.
- Cosmetics never grant gameplay advantage in competitive modes unless explicitly designed and audited.

## Data model

- `ownedCosmetics[]` — cosmetic IDs owned by the player
- `equippedCosmetics` — map of slots → cosmetic IDs
- Slot validation enforced server-side via `CosmeticRegistry`

## Security

- Client requests equip.
- Server validates ownership + slot rules + game mode restrictions.
- Rate limit equip changes.

## Performance

- Avoid spawning many replicated instances per cosmetic.
- Prefer compact replicated state (slot ids) + client renders visuals.

## Config/flags

- `cosmetics.enabled`
- `cosmetics.restrictedInRanked`

## Observability

- `cosmetics.equip_requested`
- `cosmetics.equip_applied`
- `security.cosmetics_invalid_equip`
