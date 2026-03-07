import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuth = vi.fn();
const mockFlagCreate = vi.fn();
const mockFlagUpdate = vi.fn();
const mockFlagDelete = vi.fn();
const mockFlagFindMany = vi.fn();
const mockFlagFindUnique = vi.fn();
const mockGameFindUnique = vi.fn();
const mockAudit = vi.fn();
const mockAuditFlagCreate = vi.fn();
const mockAuditFlagDelete = vi.fn();
const mockAuditFlagKill = vi.fn();
const mockAuditFlagSync = vi.fn();
const mockBridgeSync = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    featureFlag: {
      create: (...a: unknown[]) => mockFlagCreate(...a),
      update: (...a: unknown[]) => mockFlagUpdate(...a),
      delete: (...a: unknown[]) => mockFlagDelete(...a),
      findMany: (...a: unknown[]) => mockFlagFindMany(...a),
      findUnique: (...a: unknown[]) => mockFlagFindUnique(...a),
    },
    game: {
      findUnique: (...a: unknown[]) => mockGameFindUnique(...a),
    },
  },
}));

vi.mock("@/lib/authorize", () => ({
  checkPermission: (...a: unknown[]) => mockAuth(...a),
}));

vi.mock("@/lib/audit", () => ({
  audit: (...a: unknown[]) => mockAudit(...a),
  auditFlagCreate: (...a: unknown[]) => mockAuditFlagCreate(...a),
  auditFlagDelete: (...a: unknown[]) => mockAuditFlagDelete(...a),
  auditFlagKill: (...a: unknown[]) => mockAuditFlagKill(...a),
  auditFlagSync: (...a: unknown[]) => mockAuditFlagSync(...a),
}));

vi.mock("@/lib/high-risk", async () => {
  const actual = await vi.importActual<typeof import("@/lib/high-risk")>("@/lib/high-risk");
  return actual;
});

vi.mock("@/lib/featureflags-bridge", () => ({
  bridgeSyncFeatureFlagsToRoblox: (...a: unknown[]) => mockBridgeSync(...a),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  getFlags,
  createFlag,
  updateFlag,
  toggleFlagEnvironment,
  deleteFlag,
  killFlag,
  unkillFlag,
  updateRollout,
} from "./actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN = {
  user: { id: "admin-1", name: "Admin", email: "a@t.com", role: "ADMIN" },
};

function fakeFlag(overrides: Record<string, unknown> = {}) {
  return {
    id: "f1",
    key: "test_flag",
    name: "Test Flag",
    description: null,
    gameId: null,
    enabledDev: false,
    enabledStage: false,
    enabledProd: false,
    rolloutPercentage: 100,
    segments: null,
    startsAt: null,
    endsAt: null,
    isKilled: false,
    killedAt: null,
    killedById: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    value: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("flags/actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockBridgeSync.mockResolvedValue({ ok: true });
    mockFlagFindMany.mockResolvedValue([]);
  });

  // ── getFlags ────────────────────────────────────────────────────────────

  describe("getFlags", () => {
    it("throws when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(getFlags()).rejects.toThrow("Unauthorized");
    });

    it("returns all flags without gameId filter", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindMany.mockResolvedValue([fakeFlag()]);

      const result = await getFlags();
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("test_flag");
    });

    it("filters by gameId when provided", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindMany.mockResolvedValue([]);

      await getFlags({ gameId: "game-1" });

      expect(mockFlagFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ gameId: "game-1" }, { gameId: null }] },
        })
      );
    });
  });

  // ── createFlag ──────────────────────────────────────────────────────────

  describe("createFlag", () => {
    it("throws when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(createFlag({ key: "x", name: "X" })).rejects.toThrow("Unauthorized");
    });

    it("rejects invalid key format (uppercase)", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      await expect(createFlag({ key: "BadKey", name: "X" })).rejects.toThrow("Key must start");
    });

    it("rejects key starting with number", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      await expect(createFlag({ key: "1_bad", name: "X" })).rejects.toThrow("Key must start");
    });

    it("creates flag, audits, and syncs to Roblox", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagCreate.mockResolvedValue(fakeFlag());

      const result = await createFlag({ key: "new_flag", name: "New Flag" });

      expect(result.key).toBe("test_flag");
      expect(mockAuditFlagCreate).toHaveBeenCalledWith("admin-1", "test_flag", expect.anything());
      expect(mockBridgeSync).toHaveBeenCalled();
    });

    it("passes gameId to prisma when provided", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagCreate.mockResolvedValue(fakeFlag({ gameId: "g1" }));

      await createFlag({ key: "scoped_flag", name: "Scoped", gameId: "g1" });

      expect(mockFlagCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ gameId: "g1" }),
        })
      );
    });
  });

  // ── updateFlag ──────────────────────────────────────────────────────────

  describe("updateFlag", () => {
    it("throws when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(updateFlag("f1", { name: "X" })).rejects.toThrow("Unauthorized");
    });

    it("checks env-specific permission for enabledDev", async () => {
      // First call (flags:create) succeeds, second (flags:toggle:dev) fails
      mockAuth.mockResolvedValueOnce(ADMIN).mockResolvedValueOnce(null);
      await expect(updateFlag("f1", { enabledDev: true })).rejects.toThrow(
        "Insufficient permissions to modify dev"
      );
    });

    it("checks env-specific permission for enabledProd", async () => {
      mockAuth.mockResolvedValueOnce(ADMIN).mockResolvedValueOnce(null);
      await expect(updateFlag("f1", { enabledProd: true })).rejects.toThrow(
        "Insufficient permissions to modify production"
      );
    });

    it("updates flag name without env checks", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindUnique.mockResolvedValue(fakeFlag());
      mockFlagUpdate.mockResolvedValue(fakeFlag({ name: "Renamed" }));

      const result = await updateFlag("f1", { name: "Renamed" });
      expect(result.name).toBe("Renamed");
      expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "flag.update" }));
    });
  });

  // ── toggleFlagEnvironment ───────────────────────────────────────────────

  describe("toggleFlagEnvironment", () => {
    it("throws when unauthorized for dev", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(toggleFlagEnvironment("f1", "dev", true)).rejects.toThrow(
        "Insufficient permissions"
      );
    });

    it("throws when flag not found", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindUnique.mockResolvedValue(null);
      await expect(toggleFlagEnvironment("f1", "dev", true)).rejects.toThrow("Flag not found");
    });

    it("requires high-risk confirmation for prod toggles", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindUnique.mockResolvedValue(fakeFlag());

      await expect(
        toggleFlagEnvironment("f1", "prod", true, { reason: "test reason here" })
      ).rejects.toThrow("Confirmation must match");
    });

    it("toggles prod with valid confirmation", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      const flag = fakeFlag();
      mockFlagFindUnique.mockResolvedValue(flag);
      mockFlagUpdate.mockResolvedValue(fakeFlag({ enabledProd: true }));

      const result = await toggleFlagEnvironment("f1", "prod", true, {
        reason: "Deploying feature to production",
        confirmation: "toggle prod test_flag on",
      });

      expect(result.enabledProd).toBe(true);
    });

    it("toggles dev without confirmation", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindUnique.mockResolvedValue(fakeFlag());
      mockFlagUpdate.mockResolvedValue(fakeFlag({ enabledDev: true }));

      const result = await toggleFlagEnvironment("f1", "dev", true);
      expect(result.enabledDev).toBe(true);
    });
  });

  // ── deleteFlag ──────────────────────────────────────────────────────────

  describe("deleteFlag", () => {
    it("throws when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(deleteFlag("f1")).rejects.toThrow("Forbidden");
    });

    it("deletes flag, audits, and syncs", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindUnique.mockResolvedValue(fakeFlag());
      mockFlagDelete.mockResolvedValue({});

      await deleteFlag("f1");

      expect(mockFlagDelete).toHaveBeenCalledWith({ where: { id: "f1" } });
      expect(mockAuditFlagDelete).toHaveBeenCalledWith("admin-1", "test_flag", expect.anything());
      expect(mockBridgeSync).toHaveBeenCalled();
    });
  });

  // ── killFlag ────────────────────────────────────────────────────────────

  describe("killFlag", () => {
    it("throws when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(killFlag("f1")).rejects.toThrow("Forbidden");
    });

    it("throws when flag not found", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindUnique.mockResolvedValue(null);
      await expect(
        killFlag("f1", {
          reason: "Emergency kill reason",
          confirmation: "kill test_flag",
        })
      ).rejects.toThrow("Flag not found");
    });

    it("requires confirmation text", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindUnique.mockResolvedValue(fakeFlag());
      await expect(killFlag("f1", { reason: "Emergency kill reason" })).rejects.toThrow(
        "Confirmation must match"
      );
    });

    it("kills flag with valid confirmation", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindUnique.mockResolvedValue(fakeFlag());
      mockFlagUpdate.mockResolvedValue(fakeFlag({ isKilled: true, killedAt: new Date() }));

      const result = await killFlag("f1", {
        reason: "Emergency kill reason",
        confirmation: "kill test_flag",
      });

      expect(result.isKilled).toBe(true);
      expect(mockAuditFlagKill).toHaveBeenCalledWith(
        "admin-1",
        "test_flag",
        true,
        expect.any(String)
      );
    });
  });

  // ── unkillFlag ──────────────────────────────────────────────────────────

  describe("unkillFlag", () => {
    it("requires confirmation text", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindUnique.mockResolvedValue(fakeFlag({ isKilled: true }));

      await expect(unkillFlag("f1", { reason: "Back to normal operation" })).rejects.toThrow(
        "Confirmation must match"
      );
    });

    it("unkills flag with valid confirmation", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindUnique.mockResolvedValue(fakeFlag({ isKilled: true }));
      mockFlagUpdate.mockResolvedValue(fakeFlag({ isKilled: false, killedAt: null }));

      const result = await unkillFlag("f1", {
        reason: "Back to normal operation",
        confirmation: "unkill test_flag",
      });

      expect(result.isKilled).toBe(false);
      expect(mockAuditFlagKill).toHaveBeenCalledWith(
        "admin-1",
        "test_flag",
        false,
        expect.any(String)
      );
    });
  });

  // ── updateRollout ───────────────────────────────────────────────────────

  describe("updateRollout", () => {
    it("throws when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(updateRollout("f1", { rolloutPercentage: 50 })).rejects.toThrow("Forbidden");
    });

    it("rejects negative percentage", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      await expect(updateRollout("f1", { rolloutPercentage: -1 })).rejects.toThrow(
        "Rollout percentage must be between 0 and 100"
      );
    });

    it("rejects percentage over 100", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      await expect(updateRollout("f1", { rolloutPercentage: 101 })).rejects.toThrow(
        "Rollout percentage must be between 0 and 100"
      );
    });

    it("updates rollout percentage and syncs", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindUnique.mockResolvedValue(fakeFlag());
      mockFlagUpdate.mockResolvedValue(fakeFlag({ rolloutPercentage: 75 }));

      const result = await updateRollout("f1", { rolloutPercentage: 75 });
      expect(result.rolloutPercentage).toBe(75);
      expect(mockBridgeSync).toHaveBeenCalled();
    });

    it("accepts segments and schedule", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockFlagFindUnique.mockResolvedValue(fakeFlag());
      const start = new Date("2026-04-01");
      const end = new Date("2026-05-01");
      mockFlagUpdate.mockResolvedValue(
        fakeFlag({ segments: ["beta"], startsAt: start, endsAt: end })
      );

      const result = await updateRollout("f1", {
        segments: ["beta"],
        startsAt: start,
        endsAt: end,
      });

      expect(result.segments).toEqual(["beta"]);
    });
  });
});
