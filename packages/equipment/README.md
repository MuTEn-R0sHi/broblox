# @broblox/equipment

Gear equipment system with stat modifiers for Roblox games.

## Features

- **Gear Registry** — Define gear items with stat modifiers, slots, rarity, and level requirements
- **Per-Player Equipment Store** — Equip/unequip gear into named slots with validation
- **Stat Computation** — Compute total stat bonuses from all equipped gear
- **Ownership Tracking** — Grant/check gear ownership before equipping
- **Event System** — Callbacks for equip/unequip events
- **Factory Pattern** — `createEquipmentService()` for easy game integration

## Usage

```ts
import { createEquipmentService } from "@broblox/equipment";

const handle = createEquipmentService({
  gear: [
    {
      id: "running_shoes",
      name: "Running Shoes",
      rarity: "uncommon",
      slot: "feet",
      modifiers: [{ stat: "speed", flat: 2 }],
      price: 50,
    },
    {
      id: "bouncy_boots",
      name: "Bouncy Boots",
      rarity: "rare",
      slot: "feet",
      modifiers: [{ stat: "jump", flat: 5 }],
      price: 100,
    },
  ],
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
});

export const EquipmentService = handle.Service;
export const getGearRegistry = () => handle.getGearRegistry();
export const getEquipmentStore = (playerId: number) => handle.getEquipmentStore(playerId);

// In your game logic:
const store = getEquipmentStore(player.UserId);
store.grantGear("running_shoes");
store.equip("running_shoes");

const speedBonus = store.getStatBonus("speed"); // 2
```
