# @broblox/hazards

Reusable environmental hazard system for Roblox games built with roblox-ts.

## Features

- **Hazard definitions** — lava, fire jets, poison zones, crumbling platforms, spike traps
- **Timed hazards** — automatic on/off cycling for fire jets and burst traps
- **Per-player immunity** — cooldown windows prevent rapid re-damage
- **Crumbling platforms** — break on touch, respawn after cooldown
- **Pure-logic manager** — no Roblox API dependency, ideal for testing
- **Standard factory pattern** — `createHazardService(config)` like all @broblox packages

## Usage

```ts
import { createHazardService } from "@broblox/hazards";

const { Service, getHazardRegistry, getHazardManager, initPlayer, cleanupPlayer } =
  createHazardService({
    definitions: [
      {
        id: "lava_floor",
        displayName: "Lava Floor",
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
        tag: "HazardFireJet",
      },
    ],
    onDamage(playerId, damage, hazardId) {
      /* apply to humanoid */
    },
    onKill(playerId, hazardId) {
      /* handle death */
    },
    onPlayerRemoving(cb) {
      PlayerLifecycleService.onPlayerRemoving(cb);
    },
  });
```
