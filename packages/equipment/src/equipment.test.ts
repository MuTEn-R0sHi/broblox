/**
 * @broblox/equipment — GearRegistry + EquipmentStore tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GearRegistry } from "./gear-registry";
import { EquipmentStore } from "./equipment-store";
import type { GearDefinition, EquipmentData } from "./types";

// ── Test Gear Definitions ─────────────────────────────────────────────────

const RUNNING_SHOES: GearDefinition = {
  id: "running_shoes",
  name: "Running Shoes",
  rarity: "uncommon",
  slot: "feet",
  modifiers: [{ stat: "speed", flat: 2 }],
  price: 50,
};

const BOUNCY_BOOTS: GearDefinition = {
  id: "bouncy_boots",
  name: "Bouncy Boots",
  rarity: "rare",
  slot: "feet",
  modifiers: [{ stat: "jump", flat: 5 }],
  price: 100,
};

const FEATHER_CAPE: GearDefinition = {
  id: "feather_cape",
  name: "Feather Cape",
  rarity: "rare",
  slot: "back",
  modifiers: [
    { stat: "jump", flat: 3 },
    { stat: "speed", flat: 1 },
  ],
  price: 120,
};

const CHAMPION_ARMOR: GearDefinition = {
  id: "champion_armor",
  name: "Champion Armor",
  rarity: "legendary",
  slot: "body",
  modifiers: [
    { stat: "speed", flat: 3 },
    { stat: "jump", flat: 3 },
    { stat: "stamina", flat: 3 },
  ],
  levelRequirement: 10,
  price: 500,
};

const ENDURANCE_BAND: GearDefinition = {
  id: "endurance_band",
  name: "Endurance Band",
  rarity: "uncommon",
  slot: "accessory1",
  modifiers: [{ stat: "stamina", flat: 5 }],
  price: 80,
};

const ALL_GEAR = [RUNNING_SHOES, BOUNCY_BOOTS, FEATHER_CAPE, CHAMPION_ARMOR, ENDURANCE_BAND];

// ============================================================================
// GearRegistry Tests
// ============================================================================

describe("GearRegistry", () => {
  let registry: GearRegistry;

  beforeEach(() => {
    registry = new GearRegistry();
  });

  it("registers gear and retrieves by ID", () => {
    registry.register(RUNNING_SHOES);
    expect(registry.get("running_shoes")).toEqual(RUNNING_SHOES);
    expect(registry.count()).toBe(1);
  });

  it("registerAll registers multiple gear", () => {
    registry.registerAll(ALL_GEAR);
    expect(registry.count()).toBe(5);
    expect(registry.has("bouncy_boots")).toBe(true);
    expect(registry.has("unknown_item")).toBe(false);
  });

  it("throws on duplicate registration", () => {
    registry.register(RUNNING_SHOES);
    expect(() => registry.register(RUNNING_SHOES)).toThrow('Duplicate gear ID "running_shoes"');
  });

  it("returns undefined for unknown ID", () => {
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("getAll returns all registered gear", () => {
    registry.registerAll(ALL_GEAR);
    const all = registry.getAll();
    expect(all).toHaveLength(5);
  });

  it("getBySlot filters by slot", () => {
    registry.registerAll(ALL_GEAR);
    const feetGear = registry.getBySlot("feet");
    expect(feetGear).toHaveLength(2);
    expect(feetGear.map((g) => g.id).sort()).toEqual(["bouncy_boots", "running_shoes"]);
  });
});

// ============================================================================
// EquipmentStore Tests
// ============================================================================

describe("EquipmentStore", () => {
  let registry: GearRegistry;
  let store: EquipmentStore;

  beforeEach(() => {
    registry = new GearRegistry();
    registry.registerAll(ALL_GEAR);
    store = new EquipmentStore(123, registry);
  });

  // ── Ownership ────────────────────────────────────────────────────────

  describe("ownership", () => {
    it("grants and checks gear ownership", () => {
      expect(store.ownsGear("running_shoes")).toBe(false);
      const result = store.grantGear("running_shoes");
      expect(result.ok).toBe(true);
      expect(store.ownsGear("running_shoes")).toBe(true);
    });

    it("fails to grant unknown gear", () => {
      const result = store.grantGear("nonexistent");
      expect(result.ok).toBe(false);
      expect(result.status).toBe("gear_not_found");
    });

    it("fails to grant already-owned gear", () => {
      store.grantGear("running_shoes");
      const result = store.grantGear("running_shoes");
      expect(result.ok).toBe(false);
      expect(result.status).toBe("already_owned");
    });

    it("getOwnedGear returns all owned gear IDs", () => {
      store.grantGear("running_shoes");
      store.grantGear("feather_cape");
      const owned = store.getOwnedGear();
      expect(owned.sort()).toEqual(["feather_cape", "running_shoes"]);
    });
  });

  // ── Equip / Unequip ─────────────────────────────────────────────────

  describe("equip/unequip", () => {
    beforeEach(() => {
      store.grantGear("running_shoes");
      store.grantGear("bouncy_boots");
      store.grantGear("feather_cape");
      store.grantGear("endurance_band");
    });

    it("equips gear into the correct slot", () => {
      const result = store.equip("running_shoes");
      expect(result.ok).toBe(true);
      expect(store.getEquipped("feet")).toBe("running_shoes");
    });

    it("replaces gear in the same slot", () => {
      store.equip("running_shoes");
      const result = store.equip("bouncy_boots");
      expect(result.ok).toBe(true);
      expect(store.getEquipped("feet")).toBe("bouncy_boots");
    });

    it("fails to equip unknown gear", () => {
      const result = store.equip("nonexistent");
      expect(result.ok).toBe(false);
      expect(result.status).toBe("gear_not_found");
    });

    it("fails to equip unowned gear", () => {
      const result = store.equip("champion_armor");
      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_owned");
    });

    it("fails to equip already-equipped gear", () => {
      store.equip("running_shoes");
      const result = store.equip("running_shoes");
      expect(result.ok).toBe(false);
      expect(result.status).toBe("already_equipped");
    });

    it("unequips gear from a slot", () => {
      store.equip("running_shoes");
      const result = store.unequip("feet");
      expect(result.ok).toBe(true);
      expect(store.getEquipped("feet")).toBeUndefined();
    });

    it("fails to unequip empty slot", () => {
      const result = store.unequip("feet");
      expect(result.ok).toBe(false);
      expect(result.status).toBe("slot_empty");
    });

    it("returns all equipped slots", () => {
      store.equip("running_shoes");
      store.equip("feather_cape");
      store.equip("endurance_band");
      const all = store.getAllEquipped();
      expect(all).toEqual({
        feet: "running_shoes",
        back: "feather_cape",
        accessory1: "endurance_band",
      });
    });
  });

  // ── Level Requirements ──────────────────────────────────────────────

  describe("level requirements", () => {
    beforeEach(() => {
      store.grantGear("champion_armor");
    });

    it("allows equip when level meets requirement", () => {
      const result = store.equip("champion_armor", 10);
      expect(result.ok).toBe(true);
    });

    it("allows equip when level exceeds requirement", () => {
      const result = store.equip("champion_armor", 50);
      expect(result.ok).toBe(true);
    });

    it("rejects equip when level is too low", () => {
      const result = store.equip("champion_armor", 5);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("level_too_low");
    });

    it("allows equip when no playerLevel is provided (no check)", () => {
      const result = store.equip("champion_armor");
      expect(result.ok).toBe(true);
    });
  });

  // ── Stat Computation ────────────────────────────────────────────────

  describe("stat computation", () => {
    beforeEach(() => {
      store.grantGear("running_shoes");
      store.grantGear("feather_cape");
      store.grantGear("endurance_band");
      store.grantGear("champion_armor");
    });

    it("returns zero bonuses with no gear equipped", () => {
      const bonuses = store.computeBonuses();
      expect(bonuses.size).toBe(0);
    });

    it("computes single-stat bonus", () => {
      store.equip("running_shoes");
      expect(store.getStatBonus("speed")).toBe(2);
      expect(store.getStatBonus("jump")).toBe(0);
    });

    it("computes multi-stat bonus from single gear", () => {
      store.equip("feather_cape");
      expect(store.getStatBonus("speed")).toBe(1);
      expect(store.getStatBonus("jump")).toBe(3);
    });

    it("stacks bonuses from multiple gear", () => {
      store.equip("running_shoes"); // speed +2
      store.equip("feather_cape"); // speed +1, jump +3
      store.equip("endurance_band"); // stamina +5

      expect(store.getStatBonus("speed")).toBe(3);
      expect(store.getStatBonus("jump")).toBe(3);
      expect(store.getStatBonus("stamina")).toBe(5);
    });

    it("computeBonuses returns full stat map", () => {
      store.equip("running_shoes");
      store.equip("feather_cape");
      const bonuses = store.computeBonuses();
      expect(bonuses.get("speed")).toBe(3);
      expect(bonuses.get("jump")).toBe(3);
    });

    it("removing gear removes its bonuses", () => {
      store.equip("running_shoes");
      store.equip("feather_cape");
      expect(store.getStatBonus("speed")).toBe(3);

      store.unequip("feet"); // Remove running_shoes
      expect(store.getStatBonus("speed")).toBe(1); // Only feather_cape remains
    });

    it("replacing gear updates bonuses", () => {
      store.equip("running_shoes"); // speed +2
      expect(store.getStatBonus("speed")).toBe(2);

      store.grantGear("bouncy_boots");
      store.equip("bouncy_boots"); // replaces running_shoes: jump +5, speed +0
      expect(store.getStatBonus("speed")).toBe(0);
      expect(store.getStatBonus("jump")).toBe(5);
    });

    it("getGearModifiers returns modifiers for a gear ID", () => {
      const mods = store.getGearModifiers("champion_armor");
      expect(mods).toHaveLength(3);
    });

    it("getGearModifiers returns empty for unknown gear", () => {
      const mods = store.getGearModifiers("nonexistent");
      expect(mods).toHaveLength(0);
    });
  });

  // ── Serialization ───────────────────────────────────────────────────

  describe("serialization", () => {
    it("serializes to EquipmentData", () => {
      store.grantGear("running_shoes");
      store.grantGear("feather_cape");
      store.equip("running_shoes");

      const data = store.serialize();
      expect(data.ownedGear.sort()).toEqual(["feather_cape", "running_shoes"]);
      expect(data.equipped).toEqual({ feet: "running_shoes" });
    });

    it("loads from EquipmentData", () => {
      const data: EquipmentData = {
        ownedGear: ["running_shoes", "feather_cape"],
        equipped: { feet: "running_shoes", back: "feather_cape" },
      };

      store.loadFrom(data);
      expect(store.ownsGear("running_shoes")).toBe(true);
      expect(store.ownsGear("feather_cape")).toBe(true);
      expect(store.getEquipped("feet")).toBe("running_shoes");
      expect(store.getEquipped("back")).toBe("feather_cape");
    });

    it("skips unknown gear IDs on load", () => {
      const data: EquipmentData = {
        ownedGear: ["running_shoes", "deleted_item"],
        equipped: { feet: "running_shoes", back: "deleted_item" },
      };

      store.loadFrom(data);
      expect(store.ownsGear("running_shoes")).toBe(true);
      expect(store.ownsGear("deleted_item")).toBe(false);
      expect(store.getEquipped("feet")).toBe("running_shoes");
      expect(store.getEquipped("back")).toBeUndefined();
    });

    it("skips equipped gear that is not owned", () => {
      const data: EquipmentData = {
        ownedGear: [],
        equipped: { feet: "running_shoes" },
      };

      store.loadFrom(data);
      expect(store.getEquipped("feet")).toBeUndefined();
    });

    it("round-trips correctly", () => {
      store.grantGear("running_shoes");
      store.grantGear("feather_cape");
      store.grantGear("endurance_band");
      store.equip("running_shoes");
      store.equip("feather_cape");

      const serialized = store.serialize();

      const store2 = new EquipmentStore(456, registry);
      store2.loadFrom(serialized);

      expect(store2.serialize()).toEqual(serialized);
      expect(store2.getStatBonus("speed")).toBe(store.getStatBonus("speed"));
    });
  });

  // ── Dirty Tracking ──────────────────────────────────────────────────

  describe("dirty tracking", () => {
    it("starts clean", () => {
      expect(store.isDirty()).toBe(false);
    });

    it("marks dirty on grant", () => {
      store.grantGear("running_shoes");
      expect(store.isDirty()).toBe(true);
    });

    it("marks dirty on equip", () => {
      store.grantGear("running_shoes");
      store.clearDirty();
      store.equip("running_shoes");
      expect(store.isDirty()).toBe(true);
    });

    it("marks dirty on unequip", () => {
      store.grantGear("running_shoes");
      store.equip("running_shoes");
      store.clearDirty();
      store.unequip("feet");
      expect(store.isDirty()).toBe(true);
    });

    it("clearDirty resets the flag", () => {
      store.grantGear("running_shoes");
      expect(store.isDirty()).toBe(true);
      store.clearDirty();
      expect(store.isDirty()).toBe(false);
    });

    it("loadFrom clears dirty flag", () => {
      store.grantGear("running_shoes");
      expect(store.isDirty()).toBe(true);
      store.loadFrom({ ownedGear: ["running_shoes"], equipped: {} });
      expect(store.isDirty()).toBe(false);
    });
  });

  // ── Events ──────────────────────────────────────────────────────────

  describe("events", () => {
    it("fires equip event", () => {
      store.grantGear("running_shoes");

      const events: Array<{ gearId: string; equipped: boolean }> = [];
      store.onEquipChanged((e) => events.push({ gearId: e.gearId, equipped: e.equipped }));

      store.equip("running_shoes");
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ gearId: "running_shoes", equipped: true });
    });

    it("fires unequip event", () => {
      store.grantGear("running_shoes");
      store.equip("running_shoes");

      const events: Array<{ gearId: string; equipped: boolean }> = [];
      store.onEquipChanged((e) => events.push({ gearId: e.gearId, equipped: e.equipped }));

      store.unequip("feet");
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ gearId: "running_shoes", equipped: false });
    });

    it("fires event when replacing gear in same slot", () => {
      store.grantGear("running_shoes");
      store.grantGear("bouncy_boots");
      store.equip("running_shoes");

      const events: Array<{ gearId: string; equipped: boolean }> = [];
      store.onEquipChanged((e) => events.push({ gearId: e.gearId, equipped: e.equipped }));

      store.equip("bouncy_boots");
      // Only the new equip event fires (the replaced item is implicitly unequipped)
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ gearId: "bouncy_boots", equipped: true });
    });

    it("does not fire events on failed operations", () => {
      const events: Array<unknown> = [];
      store.onEquipChanged((e) => events.push(e));

      store.equip("nonexistent");
      store.unequip("feet");
      expect(events).toHaveLength(0);
    });
  });
});
