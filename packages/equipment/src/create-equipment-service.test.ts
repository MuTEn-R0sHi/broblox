/**
 * @broblox/equipment — createEquipmentService factory tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEquipmentService } from "./create-equipment-service";
import type { GearDefinition } from "./types";

const GEAR: GearDefinition[] = [
  {
    id: "running_shoes",
    name: "Running Shoes",
    rarity: "uncommon",
    slot: "feet",
    modifiers: [{ stat: "speed", flat: 2 }],
    price: 50,
  },
  {
    id: "feather_cape",
    name: "Feather Cape",
    rarity: "rare",
    slot: "back",
    modifiers: [
      { stat: "jump", flat: 3 },
      { stat: "speed", flat: 1 },
    ],
    price: 120,
  },
];

describe("createEquipmentService", () => {
  it("creates a handle with Service, registry, and store access", () => {
    const handle = createEquipmentService({ gear: GEAR });

    expect(handle.Service).toBeDefined();
    expect(handle.getGearRegistry).toBeDefined();
    expect(handle.getEquipmentStore).toBeDefined();
    expect(handle.initPlayer).toBeDefined();
    expect(handle.cleanupPlayer).toBeDefined();
  });

  it("registers gear on init", () => {
    const handle = createEquipmentService({ gear: GEAR });
    handle.Service.onInit?.();

    const registry = handle.getGearRegistry();
    expect(registry.count()).toBe(2);
    expect(registry.has("running_shoes")).toBe(true);
    expect(registry.has("feather_cape")).toBe(true);
  });

  it("initializes a player store", () => {
    const handle = createEquipmentService({ gear: GEAR });
    handle.Service.onInit?.();

    const store = handle.initPlayer(100);
    expect(store).toBeDefined();
    expect(handle.getEquipmentStore(100)).toBe(store);
  });

  it("cleans up a player store", () => {
    const handle = createEquipmentService({ gear: GEAR });
    handle.Service.onInit?.();

    handle.initPlayer(100);
    expect(handle.getEquipmentStore(100)).toBeDefined();

    handle.cleanupPlayer(100);
    expect(handle.getEquipmentStore(100)).toBeUndefined();
  });

  it("wires onPlayerRemoving callback", () => {
    let removingCb: ((player: Player) => void) | undefined;

    const handle = createEquipmentService({
      gear: GEAR,
      onPlayerRemoving: (cb) => {
        removingCb = cb;
      },
    });

    handle.Service.onInit?.();

    // Simulate adding a player
    handle.initPlayer(200);
    expect(handle.getEquipmentStore(200)).toBeDefined();

    // Simulate onPlayerRemoving being called
    expect(removingCb).toBeDefined();
    removingCb!({ UserId: 200 } as Player);
    expect(handle.getEquipmentStore(200)).toBeUndefined();
  });

  it("wires onPlayerAdded callback", () => {
    let addedCb: ((player: Player) => void) | undefined;

    const handle = createEquipmentService({
      gear: GEAR,
      onPlayerAdded: (cb) => {
        addedCb = cb;
      },
    });

    handle.Service.onInit?.();
    handle.Service.onStart?.();

    expect(addedCb).toBeDefined();
    addedCb!({ UserId: 300 } as Player);
    expect(handle.getEquipmentStore(300)).toBeDefined();
  });

  it("destroys all stores on onDestroy", () => {
    const handle = createEquipmentService({ gear: GEAR });
    handle.Service.onInit?.();

    handle.initPlayer(100);
    handle.initPlayer(200);
    expect(handle.getEquipmentStore(100)).toBeDefined();
    expect(handle.getEquipmentStore(200)).toBeDefined();

    handle.Service.onDestroy?.();
    expect(handle.getEquipmentStore(100)).toBeUndefined();
    expect(handle.getEquipmentStore(200)).toBeUndefined();
  });
});
