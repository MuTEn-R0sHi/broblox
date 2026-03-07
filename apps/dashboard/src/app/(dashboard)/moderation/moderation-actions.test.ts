import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuth = vi.fn();
const mockBanCreate = vi.fn();
const mockBanFindFirst = vi.fn();
const mockBanFindUnique = vi.fn();
const mockBanUpdate = vi.fn();
const mockEvidenceCreate = vi.fn();
const mockMuteCreate = vi.fn();
const mockMuteFindFirst = vi.fn();
const mockMuteFindUnique = vi.fn();
const mockMuteUpdate = vi.fn();
const mockAppealFindUnique = vi.fn();
const mockAppealUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    ban: {
      create: (...a: unknown[]) => mockBanCreate(...a),
      findFirst: (...a: unknown[]) => mockBanFindFirst(...a),
      findUnique: (...a: unknown[]) => mockBanFindUnique(...a),
      update: (...a: unknown[]) => mockBanUpdate(...a),
    },
    mute: {
      create: (...a: unknown[]) => mockMuteCreate(...a),
      findFirst: (...a: unknown[]) => mockMuteFindFirst(...a),
      findUnique: (...a: unknown[]) => mockMuteFindUnique(...a),
      update: (...a: unknown[]) => mockMuteUpdate(...a),
    },
    appeal: {
      findUnique: (...a: unknown[]) => mockAppealFindUnique(...a),
      update: (...a: unknown[]) => mockAppealUpdate(...a),
    },
    evidence: {
      create: (...a: unknown[]) => mockEvidenceCreate(...a),
    },
  },
}));

vi.mock("@/lib/authorize", () => ({
  checkPermission: (...a: unknown[]) => mockAuth(...a),
}));

const mockAuditBanCreate = vi.fn();
const mockAuditBanRevoke = vi.fn();
const mockAuditBanSync = vi.fn();
const mockAuditEvidenceCreate = vi.fn();
const mockAuditMuteCreate = vi.fn();
const mockAuditMuteRevoke = vi.fn();
const mockAuditMuteSync = vi.fn();
const mockAuditAppealResolve = vi.fn();

vi.mock("@/lib/audit", () => ({
  auditBanCreate: (...a: unknown[]) => mockAuditBanCreate(...a),
  auditBanRevoke: (...a: unknown[]) => mockAuditBanRevoke(...a),
  auditBanSync: (...a: unknown[]) => mockAuditBanSync(...a),
  auditEvidenceCreate: (...a: unknown[]) => mockAuditEvidenceCreate(...a),
  auditMuteCreate: (...a: unknown[]) => mockAuditMuteCreate(...a),
  auditMuteRevoke: (...a: unknown[]) => mockAuditMuteRevoke(...a),
  auditMuteSync: (...a: unknown[]) => mockAuditMuteSync(...a),
  auditAppealResolve: (...a: unknown[]) => mockAuditAppealResolve(...a),
}));

const mockBridgeCreateBan = vi.fn();
const mockBridgeRevokeBan = vi.fn();
const mockBridgeCreateMute = vi.fn();
const mockBridgeRevokeMute = vi.fn();

vi.mock("@/lib/moderation-bridge", () => ({
  bridgeCreateBanToRoblox: (...a: unknown[]) => mockBridgeCreateBan(...a),
  bridgeRevokeBanToRoblox: (...a: unknown[]) => mockBridgeRevokeBan(...a),
  bridgeCreateMuteToRoblox: (...a: unknown[]) => mockBridgeCreateMute(...a),
  bridgeRevokeMuteToRoblox: (...a: unknown[]) => mockBridgeRevokeMute(...a),
}));

// Import all action functions after mocks
import { createBan } from "./bans/new/actions";
import { revokeBan, addEvidence } from "./bans/[id]/actions";
import { createMute } from "./mutes/new/actions";
import { revokeMute } from "./mutes/[id]/actions";
import { resolveAppeal } from "./appeals/[id]/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MODERATOR = {
  user: { id: "mod-1", name: "Mod", email: "m@t.com", role: "MODERATOR" },
};

// ---------------------------------------------------------------------------
// Tests — Bans
// ---------------------------------------------------------------------------

describe("moderation — bans", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockBridgeCreateBan.mockResolvedValue({ ok: true });
    mockBridgeRevokeBan.mockResolvedValue({ ok: true });
  });

  // ── createBan ───────────────────────────────────────────────────────────

  describe("createBan", () => {
    it("returns error when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      const result = await createBan({
        playerId: "123",
        type: "PERMANENT",
        reason: "Cheating in game",
      });
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error for invalid player ID", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      const result = await createBan({
        playerId: "not-a-number",
        type: "PERMANENT",
        reason: "Cheating in game",
      });
      expect(result.error).toBe("Invalid player ID");
    });

    it("returns error for short reason", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      const result = await createBan({ playerId: "123", type: "PERMANENT", reason: "bad" });
      expect(result.error).toBe("Reason must be at least 5 characters");
    });

    it("returns error when player already has an active ban", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockBanFindFirst.mockResolvedValue({ id: "existing-ban" });
      const result = await createBan({
        playerId: "123",
        type: "PERMANENT",
        reason: "Cheating in game",
      });
      expect(result.error).toBe("Player already has an active ban");
    });

    it("creates ban, audits, and syncs to Roblox", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockBanFindFirst.mockResolvedValue(null);
      mockBanCreate.mockResolvedValue({
        id: "ban-1",
        playerId: 123n,
        playerName: null,
        type: "PERMANENT",
        reason: "Cheating in game",
        internalNote: null,
        durationHours: null,
        expiresAt: null,
        createdAt: new Date(),
      });

      const result = await createBan({
        playerId: "123",
        type: "PERMANENT",
        reason: "Cheating in game",
      });

      expect(result.id).toBe("ban-1");
      expect(result.error).toBeUndefined();
      expect(mockAuditBanCreate).toHaveBeenCalledWith("mod-1", 123n, expect.anything());
      expect(mockBridgeCreateBan).toHaveBeenCalled();
    });

    it("calculates expiresAt for temporary bans", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockBanFindFirst.mockResolvedValue(null);
      mockBanCreate.mockResolvedValue({
        id: "ban-2",
        playerId: 456n,
        playerName: null,
        type: "TEMPORARY",
        reason: "Spamming in chat",
        internalNote: null,
        durationHours: 24,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      await createBan({
        playerId: "456",
        type: "TEMPORARY",
        reason: "Spamming in chat",
        durationHours: 24,
      });

      expect(mockBanCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "TEMPORARY",
            durationHours: 24,
            expiresAt: expect.any(Date),
          }),
        })
      );
    });

    it("returns warning when bridge sync fails", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockBanFindFirst.mockResolvedValue(null);
      mockBanCreate.mockResolvedValue({
        id: "ban-3",
        playerId: 789n,
        playerName: null,
        type: "PERMANENT",
        reason: "Exploiting game mechanics",
        internalNote: null,
        durationHours: null,
        expiresAt: null,
        createdAt: new Date(),
      });
      mockBridgeCreateBan.mockResolvedValue({ ok: false, error: "Network error" });

      const result = await createBan({
        playerId: "789",
        type: "PERMANENT",
        reason: "Exploiting game mechanics",
      });

      expect(result.id).toBe("ban-3");
      expect(result.error).toContain("failed to propagate");
    });
  });

  // ── revokeBan ───────────────────────────────────────────────────────────

  describe("revokeBan", () => {
    it("returns error when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      const result = await revokeBan("b1", "123", "Revoking the ban");
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error for short reason", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      const result = await revokeBan("b1", "123", "no");
      expect(result.error).toBe("Reason must be at least 3 characters");
    });

    it("returns error when ban not found", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockBanFindUnique.mockResolvedValue(null);
      const result = await revokeBan("b1", "123", "Revoking the ban");
      expect(result.error).toBe("Ban not found");
    });

    it("returns error when ban is not active", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockBanFindUnique.mockResolvedValue({ id: "b1", status: "REVOKED", playerId: 123n });
      const result = await revokeBan("b1", "123", "Revoking the ban");
      expect(result.error).toBe("Ban is not active");
    });

    it("revokes ban using DB playerId (IDOR protection)", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockBanFindUnique.mockResolvedValue({ id: "b1", status: "ACTIVE", playerId: 999n });
      mockBanUpdate.mockResolvedValue({ revokedAt: new Date() });

      const result = await revokeBan("b1", "attacker-supplied-id", "Revoking the ban");

      expect(result.success).toBe(true);
      // Audit uses DB playerId (999n), NOT the client-supplied value
      expect(mockAuditBanRevoke).toHaveBeenCalledWith("mod-1", 999n, "b1", "Revoking the ban");
    });
  });

  // ── addEvidence ─────────────────────────────────────────────────────────

  describe("addEvidence", () => {
    it("returns error when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      const result = await addEvidence("b1", {
        type: "text",
        content: "Evidence text",
      });
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error for short content", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      const result = await addEvidence("b1", { type: "text", content: "ab" });
      expect(result.error).toBe("Evidence content must be at least 3 characters");
    });

    it("returns error for oversized content", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      const result = await addEvidence("b1", {
        type: "text",
        content: "x".repeat(20_001),
      });
      expect(result.error).toBe("Evidence content is too large");
    });

    it("returns error for invalid evidence type", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      const result = await addEvidence("b1", {
        type: "invalid" as "text",
        content: "some evidence content",
      });
      expect(result.error).toBe("Invalid evidence type");
    });

    it("returns error when ban not found", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockBanFindUnique.mockResolvedValue(null);
      const result = await addEvidence("b1", { type: "text", content: "evidence here" });
      expect(result.error).toBe("Ban not found");
    });

    it("creates evidence and audits", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockBanFindUnique.mockResolvedValue({ id: "b1" });
      mockEvidenceCreate.mockResolvedValue({});

      const result = await addEvidence("b1", {
        type: "screenshot",
        content: "https://example.com/proof.png",
        description: "Screencap of exploit",
      });

      expect(result.success).toBe(true);
      expect(mockEvidenceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            banId: "b1",
            type: "screenshot",
            uploadedById: "mod-1",
          }),
        })
      );
      expect(mockAuditEvidenceCreate).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Mutes
// ---------------------------------------------------------------------------

describe("moderation — mutes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockBridgeCreateMute.mockResolvedValue({ ok: true });
    mockBridgeRevokeMute.mockResolvedValue({ ok: true });
  });

  // ── createMute ──────────────────────────────────────────────────────────

  describe("createMute", () => {
    it("returns error when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      const result = await createMute({
        playerId: "123",
        type: "CHAT",
        reason: "Abusive language in chat",
        durationMinutes: 30,
      });
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error for invalid player ID", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      const result = await createMute({
        playerId: "abc",
        type: "CHAT",
        reason: "Abusive language in chat",
        durationMinutes: 30,
      });
      expect(result.error).toBe("Invalid player ID");
    });

    it("returns error for short reason", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      const result = await createMute({
        playerId: "123",
        type: "CHAT",
        reason: "bad",
        durationMinutes: 30,
      });
      expect(result.error).toBe("Reason must be at least 5 characters");
    });

    it("returns error for invalid duration", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      const result = await createMute({
        playerId: "123",
        type: "CHAT",
        reason: "Abusive language in chat",
        durationMinutes: 0,
      });
      expect(result.error).toBe("Invalid duration");
    });

    it("returns error when player already has an active mute", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockMuteFindFirst.mockResolvedValue({ id: "existing-mute" });
      const result = await createMute({
        playerId: "123",
        type: "CHAT",
        reason: "Abusive language in chat",
        durationMinutes: 30,
      });
      expect(result.error).toBe("Player already has an active mute");
    });

    it("creates mute with expiry, audits, and syncs", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockMuteFindFirst.mockResolvedValue(null);
      mockMuteCreate.mockResolvedValue({
        id: "mute-1",
        playerId: 123n,
        type: "CHAT",
        reason: "Abusive language in chat",
        durationMinutes: 30,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await createMute({
        playerId: "123",
        type: "CHAT",
        reason: "Abusive language in chat",
        durationMinutes: 30,
      });

      expect(result.id).toBe("mute-1");
      expect(mockAuditMuteCreate).toHaveBeenCalled();
      expect(mockBridgeCreateMute).toHaveBeenCalled();
    });
  });

  // ── revokeMute ──────────────────────────────────────────────────────────

  describe("revokeMute", () => {
    it("returns error when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      const result = await revokeMute("m1", "123", "Revoking mute");
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error for short reason", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      const result = await revokeMute("m1", "123", "no");
      expect(result.error).toBe("Reason must be at least 3 characters");
    });

    it("returns error when mute not found", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockMuteFindUnique.mockResolvedValue(null);
      const result = await revokeMute("m1", "123", "Revoking mute");
      expect(result.error).toBe("Mute not found");
    });

    it("returns error when mute is not active", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockMuteFindUnique.mockResolvedValue({ id: "m1", isActive: false, playerId: 123n });
      const result = await revokeMute("m1", "123", "Revoking mute");
      expect(result.error).toBe("Mute is not active");
    });

    it("revokes mute using DB playerId (IDOR protection)", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockMuteFindUnique.mockResolvedValue({ id: "m1", isActive: true, playerId: 888n });
      mockMuteUpdate.mockResolvedValue({});

      const result = await revokeMute("m1", "attacker-id", "Revoking mute");

      expect(result.success).toBe(true);
      expect(mockAuditMuteRevoke).toHaveBeenCalledWith("mod-1", 888n, "m1", "Revoking mute");
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Appeals
// ---------------------------------------------------------------------------

describe("moderation — appeals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("resolveAppeal", () => {
    it("returns error when unauthorized", async () => {
      mockAuth.mockResolvedValue(null);
      const result = await resolveAppeal("a1", "b1", "APPROVED", "Appeal approved reason");
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error for short resolution text", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      const result = await resolveAppeal("a1", "b1", "APPROVED", "Ok");
      expect(result.error).toBe("Resolution must be at least 5 characters");
    });

    it("returns error when appeal not found", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockAppealFindUnique.mockResolvedValue(null);
      const result = await resolveAppeal(
        "a1",
        "b1",
        "APPROVED",
        "Approved after review of evidence"
      );
      expect(result.error).toBe("Appeal not found");
    });

    it("returns error when appeal already resolved", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockAppealFindUnique.mockResolvedValue({
        id: "a1",
        status: "APPROVED",
        banId: "b1",
        ban: { playerId: 123n },
      });
      const result = await resolveAppeal("a1", "b1", "DENIED", "Denied after review of evidence");
      expect(result.error).toBe("Appeal has already been resolved");
    });

    it("denies appeal without revoking ban", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockAppealFindUnique.mockResolvedValue({
        id: "a1",
        status: "PENDING",
        banId: "b1",
        ban: { playerId: 123n },
      });
      mockAppealUpdate.mockResolvedValue({});

      const result = await resolveAppeal("a1", "b1", "DENIED", "Insufficient evidence for appeal");

      expect(result.success).toBe(true);
      expect(mockBanUpdate).not.toHaveBeenCalled();
      expect(mockAuditAppealResolve).toHaveBeenCalledWith(
        "mod-1",
        "a1",
        "DENIED",
        "Insufficient evidence for appeal"
      );
    });

    it("approves appeal and revokes ban using DB banId (IDOR protection)", async () => {
      mockAuth.mockResolvedValue(MODERATOR);
      mockAppealFindUnique.mockResolvedValue({
        id: "a1",
        status: "PENDING",
        banId: "real-ban-id",
        ban: { playerId: 999n },
      });
      mockAppealUpdate.mockResolvedValue({});
      mockBanUpdate.mockResolvedValue({});

      const result = await resolveAppeal(
        "a1",
        "attacker-supplied-banId",
        "APPROVED",
        "Player has served time, appeal granted"
      );

      expect(result.success).toBe(true);
      // Ban update uses the DB banId, not client-supplied
      expect(mockBanUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "real-ban-id" } })
      );
      expect(mockAuditAppealResolve).toHaveBeenCalledWith(
        "mod-1",
        "a1",
        "APPROVED",
        expect.any(String)
      );
    });
  });
});
