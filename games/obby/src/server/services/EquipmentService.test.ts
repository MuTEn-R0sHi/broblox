/**
 * EquipmentService Integration Tests
 *
 * Tests gear catalog registration, per-player equipment stores,
 * equip/unequip flows, stat computation, and buy logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Player } from "./__test-helpers";

describe("EquipmentService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayerLifecycle: Record<string, ReturnType<typeof vi.fn>>;
  let playerAddedCbs: ((p: Player) => void)[];
  let playerRemovingCbs: ((p: Player) => void)[];
  let mockDataGetData: ReturnType<typeof vi.fn>;
  let mockDataSaveEquipmentState: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    playerAddedCbs = [];
    playerRemovingCbs = [];

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockDataGetData = vi.fn(() => ({
      ownedGear: [],
      equipped: {},
      coins: 500,
    }));

    mockDataSaveEquipmentState = vi.fn();

    mockPlayerLifecycle = {
      onPlayerAdded: vi.fn((cb: (p: Player) => void) => {
        playerAddedCbs.push(cb);
      }),
      onPlayerRemoving: vi.fn((cb: (p: Player) => void) => {
        playerRemovingCbs.push(cb);
      }),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
      Service: {},
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));

    vi.doMock("./DataService", () => ({
      DataService: {
        getData: mockDataGetData,
        saveEquipmentState: mockDataSaveEquipmentState,
      },
    }));
  });

  async function loadEquipmentService() {
    return import("./EquipmentService");
  }

  function makePlayer(userId = 42): Player {
    return { Name: "TestPlayer", UserId: userId } as unknown as Player;
  }

  // ─── Service initialization ──────────────────────────────────────────

  describe("service lifecycle", () => {
    it("exports EquipmentService with name", async () => {
      const mod = await loadEquipmentService();
      expect(mod.EquipmentService).toBeDefined();
    });

    it("exports getGearRegistry and getEquipmentStore", async () => {
      const mod = await loadEquipmentService();
      expect(typeof mod.getGearRegistry).toBe("function");
      expect(typeof mod.getEquipmentStore).toBe("function");
    });

    it("registers gear items on init", async () => {
      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();

      const registry = mod.getGearRegistry();
      expect(registry.count()).toBe(12);
    });

    it("has running_shoes in registry", async () => {
      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();

      const registry = mod.getGearRegistry();
      const shoes = registry.get("running_shoes");
      expect(shoes).toBeDefined();
      expect(shoes?.name).toBe("Running Shoes");
      expect(shoes?.slot).toBe("feet");
    });

    it("has champion_armor with level requirement", async () => {
      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();

      const registry = mod.getGearRegistry();
      const armor = registry.get("champion_armor");
      expect(armor).toBeDefined();
      expect(armor?.rarity).toBe("legendary");
      expect(armor?.levelRequirement).toBe(10);
    });
  });

  // ─── Player equipment stores ─────────────────────────────────────────

  describe("player stores", () => {
    it("creates equipment store on player join", async () => {
      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();
      mod.EquipmentService.onStart?.();

      const player = makePlayer();
      for (const cb of playerAddedCbs) cb(player);

      const store = mod.getEquipmentStore(player.UserId);
      expect(store).toBeDefined();
    });

    it("loads persisted data on player join", async () => {
      mockDataGetData.mockReturnValue({
        ownedGear: ["running_shoes", "bouncy_boots"],
        equipped: { feet: "running_shoes" },
        coins: 200,
      });

      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();
      mod.EquipmentService.onStart?.();

      const player = makePlayer();
      for (const cb of playerAddedCbs) cb(player);

      const store = mod.getEquipmentStore(player.UserId);
      expect(store).toBeDefined();
      expect(store!.ownsGear("running_shoes")).toBe(true);
      expect(store!.ownsGear("bouncy_boots")).toBe(true);
      expect(store!.getEquipped("feet")).toBe("running_shoes");
    });

    it("cleans up store on player removing", async () => {
      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();
      mod.EquipmentService.onStart?.();

      const player = makePlayer();
      for (const cb of playerAddedCbs) cb(player);
      expect(mod.getEquipmentStore(player.UserId)).toBeDefined();

      for (const cb of playerRemovingCbs) cb(player);
      expect(mod.getEquipmentStore(player.UserId)).toBeUndefined();
    });

    it("saves dirty equipment state on player removing", async () => {
      mockDataGetData.mockReturnValue({
        ownedGear: ["running_shoes"],
        equipped: {},
        coins: 200,
      });

      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();
      mod.EquipmentService.onStart?.();

      const player = makePlayer();
      for (const cb of playerAddedCbs) cb(player);

      // Equip to make dirty
      const store = mod.getEquipmentStore(player.UserId)!;
      store.equip("running_shoes");

      for (const cb of playerRemovingCbs) cb(player);

      expect(mockDataSaveEquipmentState).toHaveBeenCalledWith(
        player,
        expect.objectContaining({ feet: "running_shoes" })
      );
    });
  });

  // ─── Equip / Unequip flows ──────────────────────────────────────────

  describe("equip and unequip", () => {
    it("can equip owned gear", async () => {
      mockDataGetData.mockReturnValue({
        ownedGear: ["running_shoes"],
        equipped: {},
        coins: 200,
      });

      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();
      mod.EquipmentService.onStart?.();

      const player = makePlayer();
      for (const cb of playerAddedCbs) cb(player);

      const store = mod.getEquipmentStore(player.UserId)!;
      const result = store.equip("running_shoes");
      expect(result.ok).toBe(true);
      expect(store.getEquipped("feet")).toBe("running_shoes");
    });

    it("cannot equip unowned gear", async () => {
      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();
      mod.EquipmentService.onStart?.();

      const player = makePlayer();
      for (const cb of playerAddedCbs) cb(player);

      const store = mod.getEquipmentStore(player.UserId)!;
      const result = store.equip("running_shoes");
      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_owned");
    });

    it("can unequip from slot", async () => {
      mockDataGetData.mockReturnValue({
        ownedGear: ["running_shoes"],
        equipped: { feet: "running_shoes" },
        coins: 200,
      });

      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();
      mod.EquipmentService.onStart?.();

      const player = makePlayer();
      for (const cb of playerAddedCbs) cb(player);

      const store = mod.getEquipmentStore(player.UserId)!;
      expect(store.getEquipped("feet")).toBe("running_shoes");

      const result = store.unequip("feet");
      expect(result.ok).toBe(true);
      expect(store.getEquipped("feet")).toBeUndefined();
    });

    it("gear swap replaces previous in same slot", async () => {
      mockDataGetData.mockReturnValue({
        ownedGear: ["running_shoes", "bouncy_boots"],
        equipped: { feet: "running_shoes" },
        coins: 200,
      });

      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();
      mod.EquipmentService.onStart?.();

      const player = makePlayer();
      for (const cb of playerAddedCbs) cb(player);

      const store = mod.getEquipmentStore(player.UserId)!;
      expect(store.getEquipped("feet")).toBe("running_shoes");

      const result = store.equip("bouncy_boots");
      expect(result.ok).toBe(true);
      expect(store.getEquipped("feet")).toBe("bouncy_boots");
    });
  });

  // ─── Stat bonuses ───────────────────────────────────────────────────

  describe("stat bonuses", () => {
    it("computes speed bonus from equipped gear", async () => {
      mockDataGetData.mockReturnValue({
        ownedGear: ["running_shoes"],
        equipped: { feet: "running_shoes" },
        coins: 200,
      });

      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();
      mod.EquipmentService.onStart?.();

      const player = makePlayer();
      for (const cb of playerAddedCbs) cb(player);

      const store = mod.getEquipmentStore(player.UserId)!;
      expect(store.getStatBonus("speed")).toBe(2);
      expect(store.getStatBonus("jump")).toBe(0);
    });

    it("stacks bonuses from multiple gear", async () => {
      mockDataGetData.mockReturnValue({
        ownedGear: ["sprint_trainers", "feather_cape", "champion_armor"],
        equipped: { feet: "sprint_trainers", back: "feather_cape", body: "champion_armor" },
        coins: 200,
      });

      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();
      mod.EquipmentService.onStart?.();

      const player = makePlayer();
      for (const cb of playerAddedCbs) cb(player);

      const store = mod.getEquipmentStore(player.UserId)!;
      // sprint_trainers: speed+4, stamina+2
      // feather_cape: jump+3, speed+1
      // champion_armor: speed+3, jump+3, stamina+3
      expect(store.getStatBonus("speed")).toBe(4 + 1 + 3);
      expect(store.getStatBonus("jump")).toBe(3 + 3);
      expect(store.getStatBonus("stamina")).toBe(2 + 3);
    });
  });

  // ─── Gear catalog ───────────────────────────────────────────────────

  describe("gear catalog", () => {
    it("has all 5 equip slots covered", async () => {
      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();

      const registry = mod.getGearRegistry();
      const allGear = registry.getAll();
      const slots = new Set(allGear.map((g: { slot: string }) => g.slot));

      expect(slots.has("feet")).toBe(true);
      expect(slots.has("back")).toBe(true);
      expect(slots.has("body")).toBe(true);
      expect(slots.has("accessory1")).toBe(true);
      expect(slots.has("accessory2")).toBe(true);
    });

    it("all gear items have at least one modifier", async () => {
      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();

      const registry = mod.getGearRegistry();
      for (const gear of registry.getAll()) {
        expect(gear.modifiers.length).toBeGreaterThan(0);
      }
    });

    it("all gear items have a price", async () => {
      const mod = await loadEquipmentService();
      mod.EquipmentService.onInit?.();

      const registry = mod.getGearRegistry();
      for (const gear of registry.getAll()) {
        expect(gear.price).toBeGreaterThan(0);
      }
    });
  });
});
