import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuth = vi.fn();
const mockGameCreate = vi.fn();
const mockGameUpdate = vi.fn();
const mockGameDelete = vi.fn();
const mockGameFindMany = vi.fn();
const mockGameFindUnique = vi.fn();
const mockAudit = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    game: {
      create: (...a: unknown[]) => mockGameCreate(...a),
      update: (...a: unknown[]) => mockGameUpdate(...a),
      delete: (...a: unknown[]) => mockGameDelete(...a),
      findMany: (...a: unknown[]) => mockGameFindMany(...a),
      findUnique: (...a: unknown[]) => mockGameFindUnique(...a),
    },
  },
}));

vi.mock("@/lib/authorize", () => ({
  checkPermission: (...a: unknown[]) => mockAuth(...a),
}));

vi.mock("@/lib/audit", () => ({
  audit: (...a: unknown[]) => mockAudit(...a),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Import after mocks
import { getGames, getGame, getGameBySlug, createGame, updateGame, deleteGame } from "./actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN = {
  user: { id: "admin-1", name: "Admin", email: "a@t.com", role: "ADMIN" },
};

function fakeDbGame(overrides: Record<string, unknown> = {}) {
  return {
    id: "g1",
    name: "Test Game",
    slug: "test-game",
    description: null,
    iconUrl: null,
    universeIdDev: 12345n,
    universeIdStage: null,
    universeIdProd: 99999n,
    placeIdDev: null,
    placeIdStage: null,
    placeIdProd: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { flags: 0, bans: 0, matches: 0 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("games/actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ── getGames ────────────────────────────────────────────────────────────

  describe("getGames", () => {
    it("throws when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(getGames()).rejects.toThrow("Unauthorized");
    });

    it("returns serialized games with BigInt → string conversion", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameFindMany.mockResolvedValue([fakeDbGame()]);

      const result = await getGames();

      expect(result).toHaveLength(1);
      expect(result[0].universeIdDev).toBe("12345");
      expect(result[0].universeIdProd).toBe("99999");
      expect(result[0].universeIdStage).toBeNull();
    });

    it("returns empty array when no games exist", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameFindMany.mockResolvedValue([]);

      const result = await getGames();
      expect(result).toEqual([]);
    });

    it("includes aggregated _count stats", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameFindMany.mockResolvedValue([
        fakeDbGame({ _count: { flags: 5, bans: 2, matches: 10 } }),
      ]);

      const [game] = await getGames();
      expect(game._count).toEqual({ flags: 5, bans: 2, matches: 10 });
    });
  });

  // ── getGame ─────────────────────────────────────────────────────────────

  describe("getGame", () => {
    it("throws when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(getGame("g1")).rejects.toThrow("Unauthorized");
    });

    it("returns null for missing game", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameFindUnique.mockResolvedValue(null);

      expect(await getGame("missing")).toBeNull();
    });

    it("returns serialized game by ID", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameFindUnique.mockResolvedValue(fakeDbGame());

      const result = await getGame("g1");
      expect(result?.slug).toBe("test-game");
      expect(result?.universeIdDev).toBe("12345");
    });
  });

  // ── getGameBySlug ───────────────────────────────────────────────────────

  describe("getGameBySlug", () => {
    it("throws when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(getGameBySlug("test")).rejects.toThrow("Unauthorized");
    });

    it("finds game by slug", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameFindUnique.mockResolvedValue(fakeDbGame());

      const result = await getGameBySlug("test-game");
      expect(result?.slug).toBe("test-game");
      expect(mockGameFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: "test-game" } })
      );
    });
  });

  // ── createGame ──────────────────────────────────────────────────────────

  describe("createGame", () => {
    it("throws when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(createGame({ name: "X", slug: "x" })).rejects.toThrow("Forbidden");
    });

    it("rejects slug starting with a number", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      await expect(createGame({ name: "X", slug: "1abc" })).rejects.toThrow("Slug must start");
    });

    it("rejects uppercase slug", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      await expect(createGame({ name: "X", slug: "ABC" })).rejects.toThrow("Slug must start");
    });

    it("rejects slug with spaces", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      await expect(createGame({ name: "X", slug: "has space" })).rejects.toThrow("Slug must start");
    });

    it("rejects empty name", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      await expect(createGame({ name: "   ", slug: "valid" })).rejects.toThrow("Name is required");
    });

    it("creates game with proper BigInt parsing", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameCreate.mockResolvedValue(fakeDbGame());

      const result = await createGame({
        name: "New Game",
        slug: "new-game",
        universeIdDev: "12345",
      });

      expect(mockGameCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "New Game",
            slug: "new-game",
            universeIdDev: 12345n,
            createdById: "admin-1",
          }),
        })
      );
      expect(result.universeIdDev).toBe("12345");
    });

    it("treats empty BigInt string as null", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameCreate.mockResolvedValue(fakeDbGame({ universeIdDev: null }));

      await createGame({ name: "G", slug: "g", universeIdDev: "  " });

      expect(mockGameCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ universeIdDev: null }),
        })
      );
    });

    it("calls audit on create", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameCreate.mockResolvedValue(fakeDbGame());

      await createGame({ name: "Game", slug: "game" });

      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "admin-1", action: "game.create" })
      );
    });
  });

  // ── updateGame ──────────────────────────────────────────────────────────

  describe("updateGame", () => {
    it("throws when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(updateGame("g1", { name: "X" })).rejects.toThrow("Forbidden");
    });

    it("throws when game not found", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameFindUnique.mockResolvedValue(null);
      await expect(updateGame("g1", { name: "X" })).rejects.toThrow("Game not found");
    });

    it("updates game and audits", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameFindUnique.mockResolvedValue({
        name: "Old",
        slug: "old",
        universeIdDev: null,
        universeIdStage: null,
        universeIdProd: null,
      });
      mockGameUpdate.mockResolvedValue(fakeDbGame({ name: "Updated" }));

      const result = await updateGame("g1", { name: "Updated" });

      expect(result.name).toBe("Updated");
      expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "game.update" }));
    });

    it("handles isActive toggle", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameFindUnique.mockResolvedValue({
        name: "G",
        slug: "g",
        universeIdDev: null,
        universeIdStage: null,
        universeIdProd: null,
      });
      mockGameUpdate.mockResolvedValue(fakeDbGame({ isActive: false }));

      const result = await updateGame("g1", { isActive: false });
      expect(result.isActive).toBe(false);
    });
  });

  // ── deleteGame ──────────────────────────────────────────────────────────

  describe("deleteGame", () => {
    it("throws when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(deleteGame("g1")).rejects.toThrow("Forbidden");
    });

    it("throws when game not found", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameFindUnique.mockResolvedValue(null);
      await expect(deleteGame("g1")).rejects.toThrow("Game not found");
    });

    it("deletes game, audits, and revalidates", async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockGameFindUnique.mockResolvedValue({ slug: "test", name: "Test" });
      mockGameDelete.mockResolvedValue({});

      await deleteGame("g1");

      expect(mockGameDelete).toHaveBeenCalledWith({ where: { id: "g1" } });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "game.delete",
          target: "test",
          before: { name: "Test" },
        })
      );
    });
  });
});
