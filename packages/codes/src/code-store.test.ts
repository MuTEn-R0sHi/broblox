/**
 * CodeStore Tests
 *
 * Comprehensive tests for code registration, redemption,
 * expiry, use-limits, per-player limits, and status management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RedeemableCode, CodeRedemptionRecord, CodesConfig } from "./types";

// LuaTuple is a roblox-ts compiler global not available under vitest's tsconfig
declare type LuaTuple<T extends unknown[]> = T & { readonly LUA_TUPLE: never };

// ---------------------------------------------------------------------------
// Roblox globals stub
// ---------------------------------------------------------------------------

type StoreCallback = (old: unknown) => unknown;

function createMockDataStore() {
  const data = new Map<string, unknown>();
  return {
    GetAsync: vi.fn(
      (key: string) => [data.get(key), undefined] as unknown as LuaTuple<[unknown, unknown]>
    ),
    SetAsync: vi.fn((key: string, value: unknown) => {
      data.set(key, value);
    }),
    UpdateAsync: vi.fn((key: string, callback: StoreCallback) => {
      const old = data.get(key);
      const result = callback(old);
      data.set(key, result);
      return result;
    }),
    _data: data,
  };
}

// Polyfill roblox-ts array .size() for Node/vitest
const proto = Array.prototype as unknown as Record<string, unknown>;
if (!proto.size) {
  proto.size = function (this: unknown[]) {
    return this.length;
  };
}

let mockTime = 1000;

function setupGlobals() {
  mockTime = 1000;
  const store = createMockDataStore();

  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = { time: vi.fn(() => mockTime) };
  g.math = { floor: Math.floor };
  g.string = { upper: (s: string) => s.toUpperCase() };
  g.pcall = (fn: () => void) => {
    try {
      fn();
      return [true];
    } catch {
      return [false];
    }
  };
  g.game = {
    GetService: (name: string) => {
      if (name === "DataStoreService") {
        return { GetDataStore: () => store };
      }
      throw new Error(`Unexpected service: ${name}`);
    },
  };

  return { store };
}

function teardownGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g.print;
  delete g.os;
  delete g.math;
  delete g.string;
  delete g.pcall;
  delete g.game;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCode(overrides?: Partial<RedeemableCode>): RedeemableCode {
  return {
    code: "FREECOINS",
    description: "Get 100 free coins",
    status: "ACTIVE",
    rewards: [{ type: "coins", label: "100 Coins", amount: 100 }],
    maxUses: 0,
    perPlayerLimit: 1,
    expiresAt: 0,
    createdAt: 900,
    useCount: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CodeStore", () => {
  let store: ReturnType<typeof createMockDataStore>;

  beforeEach(() => {
    vi.resetModules();
    const mocks = setupGlobals();
    store = mocks.store;
  });

  afterEach(() => {
    teardownGlobals();
    vi.restoreAllMocks();
  });

  async function getCodeStore(cfg?: CodesConfig) {
    const mod = await import("./code-store");
    return new mod.CodeStore(cfg);
  }

  // ====================================================================
  // Registration
  // ====================================================================

  describe("registerCode", () => {
    it("registers a code and uppercases the key", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ code: "lowerCase" }));
      expect(cs.getCode("LOWERCASE")).toBeDefined();
      expect(cs.getCode("lowercase")).toBeDefined();
    });

    it("overwrites a code with the same key", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ code: "DUP", description: "Original" }));
      cs.registerCode(makeCode({ code: "DUP", description: "Updated" }));
      expect(cs.getCode("DUP")?.description).toBe("Updated");
    });
  });

  describe("registerCodes", () => {
    it("registers multiple codes", async () => {
      const cs = await getCodeStore();
      cs.registerCodes([makeCode({ code: "A" }), makeCode({ code: "B" }), makeCode({ code: "C" })]);
      expect(cs.getAllCodes()).toHaveLength(3);
    });
  });

  describe("unregisterCode", () => {
    it("removes a registered code", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ code: "DEL" }));
      expect(cs.unregisterCode("del")).toBe(true);
      expect(cs.getCode("DEL")).toBeUndefined();
    });

    it("returns false for non-existent code", async () => {
      const cs = await getCodeStore();
      expect(cs.unregisterCode("NOPE")).toBe(false);
    });
  });

  describe("getAllCodes", () => {
    it("returns empty array when nothing is registered", async () => {
      const cs = await getCodeStore();
      expect(cs.getAllCodes()).toHaveLength(0);
    });

    it("returns all registered codes", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ code: "X" }));
      cs.registerCode(makeCode({ code: "Y" }));
      const all = cs.getAllCodes();
      expect(all).toHaveLength(2);
    });
  });

  describe("setCodeStatus", () => {
    it("updates the status of a registered code", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ code: "STAT" }));
      expect(cs.setCodeStatus("stat", "DISABLED")).toBe(true);
      expect(cs.getCode("STAT")?.status).toBe("DISABLED");
    });

    it("returns false for non-existent code", async () => {
      const cs = await getCodeStore();
      expect(cs.setCodeStatus("NOPE", "DISABLED")).toBe(false);
    });
  });

  // ====================================================================
  // Redemption — Success
  // ====================================================================

  describe("redeemCode — success", () => {
    it("redeems a valid code and returns rewards", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode());
      const result = cs.redeemCode(100, "freecoins");

      expect(result.success).toBe(true);
      expect(result.status).toBe("SUCCESS");
      expect(result.rewards).toHaveLength(1);
      expect(result.rewards![0].amount).toBe(100);
    });

    it("persists redemption record in DataStore", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode());
      cs.redeemCode(100, "FREECOINS");

      expect(store.UpdateAsync).toHaveBeenCalledWith("codes_100", expect.any(Function));
    });

    it("increments global use count", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ code: "CNT", perPlayerLimit: 5 }));
      cs.redeemCode(100, "CNT");
      cs.redeemCode(100, "CNT");

      expect(cs.getCode("CNT")?.useCount).toBe(2);
    });

    it("fires onRedeem callback", async () => {
      const onRedeem = vi.fn();
      const cs = await getCodeStore({ onRedeem });
      cs.registerCode(makeCode());
      cs.redeemCode(42, "FREECOINS");

      expect(onRedeem).toHaveBeenCalledWith(42, "FREECOINS", [
        { type: "coins", label: "100 Coins", amount: 100 },
      ]);
    });
  });

  // ====================================================================
  // Redemption — Failures
  // ====================================================================

  describe("redeemCode — failures", () => {
    it("rejects an invalid code", async () => {
      const cs = await getCodeStore();
      const result = cs.redeemCode(100, "DOESNOTEXIST");

      expect(result.success).toBe(false);
      expect(result.status).toBe("INVALID_CODE");
    });

    it("rejects a disabled code", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ code: "OFF", status: "DISABLED" }));
      const result = cs.redeemCode(100, "OFF");

      expect(result.success).toBe(false);
      expect(result.status).toBe("DISABLED");
    });

    it("rejects an explicitly expired code", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ code: "OLD", status: "EXPIRED" }));
      const result = cs.redeemCode(100, "OLD");

      expect(result.success).toBe(false);
      expect(result.status).toBe("EXPIRED");
    });

    it("auto-expires a code past its expiresAt", async () => {
      const cs = await getCodeStore();
      // expiresAt = 500, os.time() = 1000 → expired
      cs.registerCode(makeCode({ code: "TTL", expiresAt: 500 }));
      const result = cs.redeemCode(100, "TTL");

      expect(result.success).toBe(false);
      expect(result.status).toBe("EXPIRED");
      // Auto-sets status
      expect(cs.getCode("TTL")?.status).toBe("EXPIRED");
    });

    it("rejects when global max uses reached", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ code: "LIMITED", maxUses: 1, useCount: 1 }));
      const result = cs.redeemCode(100, "LIMITED");

      expect(result.success).toBe(false);
      expect(result.status).toBe("MAX_USES_REACHED");
    });

    it("rejects when per-player limit reached", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ code: "ONCE", perPlayerLimit: 1 }));

      const first = cs.redeemCode(100, "ONCE");
      expect(first.success).toBe(true);

      const second = cs.redeemCode(100, "ONCE");
      expect(second.success).toBe(false);
      expect(second.status).toBe("ALREADY_REDEEMED");
    });

    it("allows multiple redemptions up to perPlayerLimit", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ code: "MULTI", perPlayerLimit: 3 }));

      expect(cs.redeemCode(100, "MULTI").success).toBe(true);
      expect(cs.redeemCode(100, "MULTI").success).toBe(true);
      expect(cs.redeemCode(100, "MULTI").success).toBe(true);
      expect(cs.redeemCode(100, "MULTI").success).toBe(false);
    });
  });

  // ====================================================================
  // Expiry Edge Cases
  // ====================================================================

  describe("expiry edge cases", () => {
    it("does not expire a code with expiresAt=0", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ expiresAt: 0 }));
      const result = cs.redeemCode(100, "FREECOINS");
      expect(result.success).toBe(true);
    });

    it("allows redemption before expiry", async () => {
      const cs = await getCodeStore();
      // mockTime = 1000, expiresAt = 2000 → still valid
      cs.registerCode(makeCode({ expiresAt: 2000 }));
      const result = cs.redeemCode(100, "FREECOINS");
      expect(result.success).toBe(true);
    });

    it("rejects at exact expiry boundary", async () => {
      const cs = await getCodeStore();
      // mockTime = 1000, expiresAt = 1000 → expired (>= check)
      cs.registerCode(makeCode({ expiresAt: 1000 }));
      const result = cs.redeemCode(100, "FREECOINS");
      expect(result.success).toBe(false);
      expect(result.status).toBe("EXPIRED");
    });
  });

  // ====================================================================
  // Player Records
  // ====================================================================

  describe("getPlayerRecords", () => {
    it("returns empty array for new player", async () => {
      const cs = await getCodeStore();
      const records = cs.getPlayerRecords(999);
      expect(records).toEqual([]);
    });

    it("returns redemption records after code use", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode());
      cs.redeemCode(100, "FREECOINS");

      const records = cs.getPlayerRecords(100);
      expect(records).toHaveLength(1);
      expect(records[0].code).toBe("FREECOINS");
      expect(records[0].redeemedAt).toBe(1000);
    });
  });

  describe("hasPlayerRedeemed", () => {
    it("returns false when player has not redeemed", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode());
      expect(cs.hasPlayerRedeemed(100, "FREECOINS")).toBe(false);
    });

    it("returns true after redemption", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode());
      cs.redeemCode(100, "FREECOINS");
      expect(cs.hasPlayerRedeemed(100, "FREECOINS")).toBe(true);
    });

    it("is case-insensitive", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode());
      cs.redeemCode(100, "freecoins");
      expect(cs.hasPlayerRedeemed(100, "FreeCoins")).toBe(true);
    });
  });

  // ====================================================================
  // Configuration
  // ====================================================================

  describe("config", () => {
    it("uses default config when none provided", async () => {
      const cs = await getCodeStore();
      // Should have created store with default name
      expect(store.GetAsync).toBeDefined();
    });

    it("uses custom datastore name", async () => {
      const customStore = createMockDataStore();
      const g = globalThis as unknown as Record<string, unknown>;
      (g.game as { GetService: (name: string) => unknown }).GetService = (name: string) => {
        if (name === "DataStoreService") {
          return {
            GetDataStore: (dsName: string) => {
              expect(dsName).toBe("MyCodes");
              return customStore;
            },
          };
        }
        throw new Error(`Unexpected service: ${name}`);
      };

      await getCodeStore({ datastoreName: "MyCodes" });
    });

    it("disables logging when enableLogging is false", async () => {
      const cs = await getCodeStore({ enableLogging: false });
      const printFn = (globalThis as unknown as Record<string, unknown>).print as ReturnType<
        typeof vi.fn
      >;
      printFn.mockClear();

      cs.registerCode(makeCode());
      cs.redeemCode(100, "FREECOINS");

      // Logger uses print under the hood, shouldn't be called
      expect(printFn).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // Multi-player isolation
  // ====================================================================

  describe("multi-player isolation", () => {
    it("different players can redeem the same code", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode());

      expect(cs.redeemCode(100, "FREECOINS").success).toBe(true);
      expect(cs.redeemCode(200, "FREECOINS").success).toBe(true);
      expect(cs.redeemCode(300, "FREECOINS").success).toBe(true);
    });

    it("per-player limits are isolated per player", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ perPlayerLimit: 1 }));

      expect(cs.redeemCode(100, "FREECOINS").success).toBe(true);
      expect(cs.redeemCode(100, "FREECOINS").success).toBe(false); // already used
      expect(cs.redeemCode(200, "FREECOINS").success).toBe(true); // different player
    });

    it("global limit applies across players", async () => {
      const cs = await getCodeStore();
      cs.registerCode(makeCode({ maxUses: 2 }));

      expect(cs.redeemCode(100, "FREECOINS").success).toBe(true);
      expect(cs.redeemCode(200, "FREECOINS").success).toBe(true);
      expect(cs.redeemCode(300, "FREECOINS").success).toBe(false); // global limit
      expect(cs.redeemCode(300, "FREECOINS").status).toBe("MAX_USES_REACHED");
    });
  });

  // ====================================================================
  // Multiple rewards
  // ====================================================================

  describe("multiple rewards", () => {
    it("returns all rewards on successful redemption", async () => {
      const cs = await getCodeStore();
      cs.registerCode(
        makeCode({
          rewards: [
            { type: "coins", label: "500 Coins", amount: 500 },
            { type: "gems", label: "10 Gems", amount: 10 },
            { type: "item", label: "Exclusive Hat", assetId: "hat_001" },
          ],
        })
      );

      const result = cs.redeemCode(100, "FREECOINS");
      expect(result.success).toBe(true);
      expect(result.rewards).toHaveLength(3);
      expect(result.rewards![2].assetId).toBe("hat_001");
    });
  });
});
