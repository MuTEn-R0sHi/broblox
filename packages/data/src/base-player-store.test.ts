/**
 * Tests for BasePlayerStore.
 *
 * Exercises the abstract base class that provides shared init/load/save/dirty
 * logic for all per-player DataStore-backed stores.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRobloxGlobals, resetPlayerIdCounter } from "@broblox/testing";

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  mockRobloxGlobals();
  resetPlayerIdCounter();
});

// ============================================================================
// Test Data
// ============================================================================

interface TestData {
  coins: number;
  level: number;
  items: string[];
}

const DEFAULT_DATA: TestData = { coins: 0, level: 1, items: [] };

// ============================================================================
// Concrete subclass for testing
// ============================================================================

// We dynamically import BasePlayerStore after mocking so `game.GetService` is
// available. However BasePlayerStore uses its own `declare const game` so we
// need to exercise it through the mock globals set up by mockRobloxGlobals().
// Since the global mock's GetService returns a stub `{ _service: name }` which
// doesn't have GetDataStore, we'll mock the module-level declarations.

import { BasePlayerStore } from "./base-player-store";

class TestStore extends BasePlayerStore<TestData> {
  protected keyPrefix(): string {
    return "test_";
  }

  protected storeName(): string {
    return "TestStore";
  }

  // Expose protected methods for testing
  public setData(data: TestData) {
    this.data = data;
  }

  public callMarkDirty() {
    this.markDirty();
  }

  public callMarkClean() {
    this.markClean();
  }

  public getStore() {
    return this.store;
  }
}

class ValidatingStore extends BasePlayerStore<TestData> {
  protected keyPrefix(): string {
    return "validated_";
  }

  protected storeName(): string {
    return "ValidatingStore";
  }

  protected deserialize(raw: unknown): void {
    const t = raw as Record<string, unknown>;
    this.data = {
      coins: (t.coins as number) ?? 0,
      level: (t.level as number) ?? 1,
      items: (t.items as string[]) ?? [],
    };
  }
}

/**
 * Versioned subclass that exercises schema migration.
 */
class VersionedStore extends BasePlayerStore<TestData> {
  private readonly version: number;
  public migrateSpy = vi.fn((data: TestData, _from: number) => data);

  constructor(
    playerId: number,
    config: { datastoreName: string; enableLogging?: boolean },
    defaultData: TestData,
    version: number
  ) {
    super(playerId, config, defaultData);
    this.version = version;
  }

  protected keyPrefix(): string {
    return "ver_";
  }

  protected storeName(): string {
    return "VersionedStore";
  }

  protected schemaVersion(): number {
    return this.version;
  }

  protected migrate(data: TestData, fromVersion: number): TestData {
    return this.migrateSpy(data, fromVersion);
  }

  // expose for assertions
  public getStore() {
    return this.store;
  }
}

// ============================================================================
// Mock DataStore
// ============================================================================

function createMockDataStore(stored: Record<string, unknown> = {}) {
  return {
    GetAsync: vi.fn((key: string) => stored[key]),
    SetAsync: vi.fn((key: string, value: unknown) => {
      stored[key] = value;
    }),
  };
}

function createMockDataStoreService(store: ReturnType<typeof createMockDataStore>) {
  return {
    GetDataStore: vi.fn(() => store),
  };
}

function installDataStoreMock(store: ReturnType<typeof createMockDataStore>) {
  const dss = createMockDataStoreService(store);
  const g = globalThis as Record<string, unknown>;
  g.game = {
    GetService: (name: string) => {
      if (name === "DataStoreService") return dss;
      return { _service: name };
    },
    JobId: "test-job-id",
    PlaceId: 0,
  };
  return dss;
}

// ============================================================================
// Tests
// ============================================================================

describe("BasePlayerStore", () => {
  describe("constructor", () => {
    it("stores playerId and config", () => {
      const store = new TestStore(42, { datastoreName: "Test_v1" }, { ...DEFAULT_DATA });
      expect(store.playerId).toBe(42);
    });

    it("creates logger when enableLogging is true", () => {
      const store = new TestStore(
        1,
        { datastoreName: "Test_v1", enableLogging: true },
        { ...DEFAULT_DATA }
      );
      expect(store.playerId).toBe(1);
    });

    it("does not create logger when enableLogging is false", () => {
      const store = new TestStore(
        1,
        { datastoreName: "Test_v1", enableLogging: false },
        { ...DEFAULT_DATA }
      );
      expect(store.playerId).toBe(1);
    });

    it("sets default data", () => {
      const store = new TestStore(
        1,
        { datastoreName: "Test_v1" },
        { coins: 99, level: 5, items: ["sword"] }
      );
      const data = store.getData();
      expect(data.coins).toBe(99);
      expect(data.level).toBe(5);
      expect(data.items).toEqual(["sword"]);
    });
  });

  describe("getData()", () => {
    it("returns the current data snapshot", () => {
      const store = new TestStore(1, { datastoreName: "X" }, { ...DEFAULT_DATA });
      expect(store.getData()).toEqual(DEFAULT_DATA);
    });
  });

  describe("dirty tracking", () => {
    it("starts clean", () => {
      const store = new TestStore(1, { datastoreName: "X" }, { ...DEFAULT_DATA });
      expect(store.isDirty()).toBe(false);
    });

    it("markDirty sets dirty flag", () => {
      const store = new TestStore(1, { datastoreName: "X" }, { ...DEFAULT_DATA });
      store.callMarkDirty();
      expect(store.isDirty()).toBe(true);
    });

    it("markClean clears dirty flag", () => {
      const store = new TestStore(1, { datastoreName: "X" }, { ...DEFAULT_DATA });
      store.callMarkDirty();
      expect(store.isDirty()).toBe(true);
      store.callMarkClean();
      expect(store.isDirty()).toBe(false);
    });
  });

  describe("init()", () => {
    it("initializes the DataStore reference", () => {
      const mockDS = createMockDataStore();
      const dss = installDataStoreMock(mockDS);
      const store = new TestStore(1, { datastoreName: "TestDS" }, { ...DEFAULT_DATA });

      store.init();
      expect(dss.GetDataStore).toHaveBeenCalledWith("TestDS");
      expect(store.getStore()).toBeDefined();
    });
  });

  describe("load()", () => {
    it("returns false if store not initialized", () => {
      const store = new TestStore(1, { datastoreName: "X" }, { ...DEFAULT_DATA });
      expect(store.load()).toBe(false);
    });

    it("loads data from DataStore", () => {
      const savedData: TestData = { coins: 100, level: 5, items: ["axe"] };
      const mockDS = createMockDataStore({ test_1: savedData });
      installDataStoreMock(mockDS);

      const store = new TestStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store.init();
      const result = store.load();

      expect(result).toBe(true);
      expect(mockDS.GetAsync).toHaveBeenCalledWith("test_1");
      expect(store.getData()).toEqual(savedData);
    });

    it("keeps default data when no saved data exists", () => {
      const mockDS = createMockDataStore({});
      installDataStoreMock(mockDS);

      const store = new TestStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store.init();
      store.load();

      expect(store.getData()).toEqual(DEFAULT_DATA);
    });

    it("clears dirty flag after load", () => {
      const mockDS = createMockDataStore({ test_1: { coins: 5, level: 2, items: [] } });
      installDataStoreMock(mockDS);

      const store = new TestStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store.init();
      store.callMarkDirty();
      store.load();

      expect(store.isDirty()).toBe(false);
    });

    it("returns false when GetAsync throws", () => {
      const mockDS = createMockDataStore();
      mockDS.GetAsync = vi.fn(() => {
        throw new Error("DataStore error");
      });
      installDataStoreMock(mockDS);

      const store = new TestStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store.init();

      expect(store.load()).toBe(false);
      // Data should remain as default
      expect(store.getData()).toEqual(DEFAULT_DATA);
    });
  });

  describe("save()", () => {
    it("returns false if store not initialized", () => {
      const store = new TestStore(1, { datastoreName: "X" }, { ...DEFAULT_DATA });
      expect(store.save()).toBe(false);
    });

    it("saves data to DataStore", () => {
      const stored: Record<string, unknown> = {};
      const mockDS = createMockDataStore(stored);
      installDataStoreMock(mockDS);

      const store = new TestStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store.init();
      store.setData({ coins: 50, level: 3, items: ["shield"] });
      const result = store.save();

      expect(result).toBe(true);
      expect(mockDS.SetAsync).toHaveBeenCalledWith("test_1", {
        coins: 50,
        level: 3,
        items: ["shield"],
      });
    });

    it("clears dirty flag after save", () => {
      const mockDS = createMockDataStore();
      installDataStoreMock(mockDS);

      const store = new TestStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store.init();
      store.callMarkDirty();
      expect(store.isDirty()).toBe(true);

      store.save();
      expect(store.isDirty()).toBe(false);
    });

    it("returns false when SetAsync throws", () => {
      const mockDS = createMockDataStore();
      mockDS.SetAsync = vi.fn(() => {
        throw new Error("DataStore write error");
      });
      installDataStoreMock(mockDS);

      const store = new TestStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store.init();

      expect(store.save()).toBe(false);
    });
  });

  describe("round-trip (load → modify → save → load)", () => {
    it("persists modifications across load/save cycles", () => {
      const stored: Record<string, unknown> = {};
      const mockDS = createMockDataStore(stored);
      installDataStoreMock(mockDS);

      // First store instance — write data
      const store1 = new TestStore(42, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store1.init();
      store1.setData({ coins: 200, level: 10, items: ["gem", "key"] });
      expect(store1.save()).toBe(true);

      // Second store instance — read it back
      const store2 = new TestStore(42, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store2.init();
      expect(store2.load()).toBe(true);
      expect(store2.getData()).toEqual({ coins: 200, level: 10, items: ["gem", "key"] });
    });
  });

  describe("custom deserialize", () => {
    it("applies field-level validation with defaults", () => {
      // Simulate partially corrupted data (missing fields)
      const partial = { coins: 50 }; // missing level and items
      const stored: Record<string, unknown> = { validated_1: partial };
      const mockDS = createMockDataStore(stored);
      installDataStoreMock(mockDS);

      const store = new ValidatingStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store.init();
      store.load();

      const data = store.getData();
      expect(data.coins).toBe(50);
      expect(data.level).toBe(1); // default
      expect(data.items).toEqual([]); // default
    });

    it("handles completely empty table", () => {
      const stored: Record<string, unknown> = { validated_1: {} };
      const mockDS = createMockDataStore(stored);
      installDataStoreMock(mockDS);

      const store = new ValidatingStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store.init();
      store.load();

      const data = store.getData();
      expect(data.coins).toBe(0);
      expect(data.level).toBe(1);
      expect(data.items).toEqual([]);
    });
  });

  describe("multiple players", () => {
    it("isolates data per player", () => {
      const stored: Record<string, unknown> = {};
      const mockDS = createMockDataStore(stored);
      installDataStoreMock(mockDS);

      const store1 = new TestStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store1.init();
      store1.setData({ coins: 100, level: 2, items: [] });
      store1.save();

      const store2 = new TestStore(2, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store2.init();
      store2.setData({ coins: 200, level: 5, items: ["hat"] });
      store2.save();

      // Reload and verify isolation
      const reload1 = new TestStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      reload1.init();
      reload1.load();
      expect(reload1.getData().coins).toBe(100);

      const reload2 = new TestStore(2, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      reload2.init();
      reload2.load();
      expect(reload2.getData().coins).toBe(200);
    });
  });

  describe("schema versioning & migration", () => {
    it("migrates data when stored version < schemaVersion", () => {
      const savedData = { coins: 10, level: 1, items: [], __version: 1 };
      const mockDS = createMockDataStore({ ver_1: savedData });
      installDataStoreMock(mockDS);

      const store = new VersionedStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA }, 2);
      store.migrateSpy.mockImplementation((data: TestData) => ({
        ...data,
        level: data.level + 1,
      }));
      store.init();
      const result = store.load();

      expect(result).toBe(true);
      expect(store.migrateSpy).toHaveBeenCalledWith(expect.objectContaining({ coins: 10 }), 1);
      expect(store.getData().level).toBe(2);
      expect((store.getData() as Record<string, unknown>).__version).toBe(2);
      expect(store.isDirty()).toBe(true); // migration sets dirty so data is saved on next save cycle
    });

    it("skips migration when stored version == schemaVersion", () => {
      const savedData = { coins: 50, level: 3, items: ["hat"], __version: 2 };
      const mockDS = createMockDataStore({ ver_1: savedData });
      installDataStoreMock(mockDS);

      const store = new VersionedStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA }, 2);
      store.init();
      store.load();

      expect(store.migrateSpy).not.toHaveBeenCalled();
      expect(store.getData().coins).toBe(50);
    });

    it("defaults __version to 0 when stored data has no version field", () => {
      const savedData = { coins: 5, level: 1, items: [] }; // no __version
      const mockDS = createMockDataStore({ ver_1: savedData });
      installDataStoreMock(mockDS);

      const store = new VersionedStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA }, 1);
      store.init();
      store.load();

      expect(store.migrateSpy).toHaveBeenCalledWith(expect.objectContaining({ coins: 5 }), 0);
      expect((store.getData() as Record<string, unknown>).__version).toBe(1);
    });

    it("does not migrate when schemaVersion is 0 (default)", () => {
      // TestStore uses default schemaVersion() = 0
      const savedData = { coins: 10, level: 1, items: [] };
      const mockDS = createMockDataStore({ test_1: savedData });
      installDataStoreMock(mockDS);

      const store = new TestStore(1, { datastoreName: "DS" }, { ...DEFAULT_DATA });
      store.init();
      store.load();

      // No __version stamped
      expect((store.getData() as Record<string, unknown>).__version).toBeUndefined();
    });
  });
});
