# Modules: Hazards

Pure-logic environmental hazard system — registry, runtime manager, timed toggles, and damage callbacks (`@broblox/hazards`). **Status: Implemented** (37 tests).

## Purpose

- Define environmental hazard types (lava, fire jets, poison, spikes, crumbling platforms).
- Track per-instance active/inactive state with timed toggles.
- Per-player immunity windows to prevent frame-by-frame damage.
- Pure-logic: no Roblox API dependency — all effects dispatched via callbacks.

## Core rules

- Hazard definitions are registered once in a `HazardRegistry`; shared across all instances.
- Each world instance of a hazard is tracked by a `HazardManager` with a unique instance key.
- Damage is never applied directly — the manager calls `onDamage` / `onKill` callbacks that the game wires to its own systems (Humanoid, DataService, remotes).
- `timed_burst` hazards cycle between active/inactive based on `activeDuration` / `cooldownDuration`.
- `crumbling` platforms break after touch (activeDuration delay), then respawn after cooldownDuration.
- Immunity windows prevent repeated damage within `tickInterval` or `cooldownDuration`.

## Data model

- `HazardBehaviour` — `"instant_kill" | "damage_zone" | "timed_burst" | "crumbling" | "contact_damage"`.
- `HazardDefinition` — static hazard template: `id`, `displayName`, `behaviour`, `damage`, `tickInterval`, `activeDuration`, `cooldownDuration`, `tag`.
- `HazardInstanceState` — per-instance runtime: `definitionId`, `active`, `nextToggleAt`, `broken`.
- `PlayerHazardState` — per-player immunity: `immuneUntil` (os.clock timestamp).

## Public API

### HazardRegistry

| Method          | Description                              |
| --------------- | ---------------------------------------- |
| `get(id)`       | Retrieve a hazard definition by ID       |
| `getAll()`      | Get all registered definitions           |
| `getByTag(tag)` | Find definition by CollectionService tag |
| `has(id)`       | Check if a hazard ID is registered       |
| `count()`       | Total registered definitions             |

### HazardManager

| Method                             | Description                              |
| ---------------------------------- | ---------------------------------------- |
| `addInstance(definitionId, key)`   | Register a world hazard instance         |
| `removeInstance(key)`              | Remove a hazard instance                 |
| `instanceCount()`                  | Active instance count                    |
| `update(deltaSec)`                 | Advance timers — call every heartbeat    |
| `processTouch(playerId, key, now)` | Handle player touching a hazard instance |
| `isImmune(playerId, key, now)`     | Check if player is immune to an instance |

### Factory

```ts
import { createHazardService } from "@broblox/hazards";

const handle = createHazardService({
  definitions: [
    {
      id: "lava_floor",
      displayName: "Lava",
      behaviour: "instant_kill",
      damage: 0,
      tag: "HazardLava",
    },
    {
      id: "fire_jet",
      displayName: "Fire Jet",
      behaviour: "timed_burst",
      damage: 25,
      activeDuration: 2,
      cooldownDuration: 3,
      tickInterval: 0.5,
      tag: "HazardFireJet",
    },
  ],
  onDamage: (playerId, damage, hazardId) => {
    // Wire to Humanoid.TakeDamage, return true if player died
    return humanoid.Health <= 0;
  },
  onKill: (playerId, hazardId) => {
    DataService.incrementDeaths(player);
  },
  onToggle: (instanceKey, active) => {
    // Broadcast toggle state to clients (visual effects)
  },
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
});
```

## Behaviour Reference

| Behaviour        | Damage model                | Toggle        | Immunity                  |
| ---------------- | --------------------------- | ------------- | ------------------------- |
| `instant_kill`   | Always kills on contact     | None          | None (instant)            |
| `damage_zone`    | `damage` per `tickInterval` | None          | `tickInterval` window     |
| `timed_burst`    | `damage` while active       | on/off cycle  | `tickInterval` window     |
| `crumbling`      | No damage (fall kills)      | break/respawn | N/A                       |
| `contact_damage` | `damage` on touch           | None          | `cooldownDuration` window |

## Game Integration (Obby)

The obby game wires the hazards package via a wrapper service that:

1. Calls `Humanoid.TakeDamage()` in `onDamage`, fires `HazardDamage` remote for UI feedback.
2. Calls `DataService.incrementDeaths()` in `onKill`.
3. Broadcasts `HazardToggle` remote to all clients in `onToggle`.
4. Scans `CollectionService.GetTagged()` for each hazard tag on start.
5. Connects `BasePart.Touched` → `manager.processTouch()` for each tagged part.
6. Runs `RunService.Heartbeat` → `manager.update(dt)` every frame.
7. Calls `initPlayer` on player join via `PlayerLifecycleService`.

## Observability

- `onDamage` callback — player took hazard damage (playerId, damage, hazardId)
- `onKill` callback — player killed by hazard (playerId, hazardId)
- `onToggle` callback — hazard instance state changed (instanceKey, active)
