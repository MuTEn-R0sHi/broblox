# Modules: Obstacles

Pure-logic dynamic obstacle system — registry, runtime manager, movement behaviours, and position callbacks (`@broblox/obstacles`). **Status: Implemented** (41 tests).

## Purpose

- Define dynamic obstacle types (moving platforms, rotating beams, timed sequences, conveyors).
- Track per-instance runtime state (progress, direction, active/inactive).
- Drive obstacle movement each frame via a pure-logic update loop.
- Pure-logic: no Roblox API dependency — all position changes dispatched via callbacks.

## Core rules

- Obstacle definitions are registered once in an `ObstacleRegistry`; shared across all instances.
- Each world instance of an obstacle is tracked by an `ObstacleManager` with a unique instance key.
- Position changes are never applied directly — the manager calls `onUpdate` / `onToggle` callbacks that the game wires to its own CFrame/transparency systems.
- `moving_platform` obstacles oscillate (ping-pong) between origin and origin + distance.
- `rotating_beam` obstacles rotate continuously, wrapping via modulo.
- `timed_sequence` obstacles cycle between visible/hidden phases with configurable phase offsets for staggering.
- `conveyor` obstacles apply a constant push — no state changes needed.

## Data model

- `ObstacleBehaviour` — `"moving_platform" | "rotating_beam" | "timed_sequence" | "conveyor"`.
- `ObstacleDefinition` — static obstacle template: `id`, `displayName`, `behaviour`, `speed`, `distance`, `activeDuration`, `cooldownDuration`, `phaseOffset`, `tag`.
- `ObstacleInstanceState` — per-instance runtime: `definitionId`, `progress`, `direction`, `active`.

## Public API

### ObstacleRegistry

| Method          | Description                              |
| --------------- | ---------------------------------------- |
| `get(id)`       | Retrieve an obstacle definition by ID    |
| `getAll()`      | Get all registered definitions           |
| `getByTag(tag)` | Find definition by CollectionService tag |
| `has(id)`       | Check if an obstacle ID is registered    |
| `count()`       | Total registered definitions             |

### ObstacleManager

| Method                           | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| `addInstance(definitionId, key)` | Register a world obstacle instance             |
| `removeInstance(key)`            | Remove an obstacle instance                    |
| `instanceCount()`                | Active instance count                          |
| `getInstanceState(key)`          | Get current state of an instance               |
| `update(deltaSec)`               | Advance all obstacle timers — call every frame |

### Factory

```ts
import { createObstacleService } from "@broblox/obstacles";

const handle = createObstacleService({
  definitions: [
    {
      id: "slow_platform",
      displayName: "Slow Platform",
      behaviour: "moving_platform",
      speed: 5,
      distance: 20,
      tag: "ObstacleSlow",
    },
    {
      id: "fast_spinner",
      displayName: "Fast Spinner",
      behaviour: "rotating_beam",
      speed: 180,
      tag: "ObstacleSpinner",
    },
    {
      id: "vanishing_block",
      displayName: "Vanishing Block",
      behaviour: "timed_sequence",
      activeDuration: 3,
      cooldownDuration: 2,
      phaseOffset: 0.5,
      tag: "ObstacleVanish",
    },
  ],
  onUpdate: (instanceKey, progress, active) => {
    // Apply CFrame/transparency changes to the obstacle part
  },
  onToggle: (instanceKey, active) => {
    // Broadcast visibility change to clients
  },
});
```

## Behaviour Reference

| Behaviour         | Movement model                          | State updates                 | Callbacks              |
| ----------------- | --------------------------------------- | ----------------------------- | ---------------------- |
| `moving_platform` | Oscillates along axis at `speed`        | progress, direction ping-pong | `onUpdate`             |
| `rotating_beam`   | Rotates continuously at `speed` deg/sec | progress wraps [0, 1)         | `onUpdate`             |
| `timed_sequence`  | Cycles visible/hidden phases            | progress, active toggle       | `onUpdate`, `onToggle` |
| `conveyor`        | Constant push at `speed`                | None (stateless)              | `onUpdate`             |

## Game Integration (Obby)

The obby game wires the obstacles package via a wrapper service that:

1. Registers obstacle definitions in `onInit` with callbacks for CFrame updates.
2. Scans `CollectionService.GetTagged()` for each obstacle tag on start.
3. Calls `manager.addInstance()` for each tagged part found in the world.
4. Runs `RunService.Heartbeat` → `manager.update(dt)` every frame.
5. In the `onUpdate` callback, applies CFrame interpolation / transparency changes.
6. In the `onToggle` callback, sets `CanCollide` and `Transparency` on the part.

## Observability

- `onUpdate` callback — obstacle position changed (instanceKey, progress, active)
- `onToggle` callback — timed_sequence obstacle visibility changed (instanceKey, active)

## Testing

- 41 unit tests across 3 test files (registry, manager, service factory).
- Covers: registration, duplicate detection, all 4 behaviours, ping-pong boundaries, phase offsets, callback invocations.
