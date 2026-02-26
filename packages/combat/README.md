# @broblox/combat

Server-authoritative combat systems for PvP games.

## Purpose

This package provides the core combat infrastructure for competitive PvP:

- **Weapon system** — Weapon definitions, stats, and behaviors
- **Hit validation** — Server-side raycast verification
- **Damage calculation** — Deterministic damage with modifiers
- **Cooldown management** — Server-authoritative cooldowns and ammo

## Dependencies

- `@broblox/core` — Logging, cleanup utilities
- `@broblox/shared-types` — Type definitions
- `@broblox/constants` — Game constants

## Architecture

### Server Authority

All combat outcomes are determined server-side:

1. Client sends **intent** (fire weapon, swing melee)
2. Server **validates** the action (cooldowns, ammo, state)
3. Server performs **hit detection** (raycast from player position)
4. Server calculates **damage** and applies to target
5. Server broadcasts **results** to relevant clients

### Hit Validation

```typescript
// Server validates hits by:
// 1. Checking weapon is valid and ready
// 2. Verifying player position is reasonable
// 3. Performing server-side raycast
// 4. Confirming target is valid and hittable
```

## Usage

```typescript
import { WeaponService, HitValidator } from "@broblox/combat";

// Register weapons
WeaponService.registerWeapon({
  id: "rifle",
  damage: 25,
  fireRate: 600, // RPM
  range: 200,
  spread: 0.02,
});

// Validate hits server-side
const result = HitValidator.validateHit(player, target, weaponId);
```

## Related Docs

- [Hit Validation Architecture](../../docs/architecture/hit-validation.md)
- [Phase 2 PvP Alpha](../../docs/roadmap/phase-2-pvp-alpha.md)
