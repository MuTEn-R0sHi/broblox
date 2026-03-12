# @broblox/obstacles

Reusable dynamic obstacle system for Roblox games built with roblox-ts.

## Features

- **Moving platforms** — oscillate between two positions at configurable speed
- **Rotating beams** — continuous rotation around an axis
- **Timed sequences** — appear/disappear on a cycle with phase offset support
- **Conveyors** — push players in a direction at constant speed
- **Pure-logic manager** — no Roblox API dependency, ideal for testing
- **Standard factory pattern** — `createObstacleService(config)` like all @broblox packages

## Usage

```ts
import { createObstacleService } from "@broblox/obstacles";

const { Service, getObstacleRegistry, getObstacleManager } = createObstacleService({
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
  onUpdate(instanceKey, progress, active) {
    // Apply CFrame/transparency changes to the obstacle part
  },
  onToggle(instanceKey, active) {
    // Broadcast visibility change to clients
  },
});
```
