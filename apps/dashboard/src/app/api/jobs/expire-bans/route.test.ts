import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFindMany = vi.fn();
const mockUpdateMany = vi.fn();
const mockBridgeRevoke = vi.fn();
const mockGenerateBridgeId = vi.fn(() => "system-id");

vi.mock("@/lib/db", () => ({
  prisma: {
    ban: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

vi.mock("@/lib/moderation-bridge", () => ({
  bridgeRevokeBanToRoblox: (...args: unknown[]) => mockBridgeRevoke(...args),
  generateBridgeId: () => mockGenerateBridgeId(),
}));

vi.mock("@/lib/authorize", () => ({
  validateCronSecret: (req: NextRequest) => {
    const auth = req.headers.get("authorization");
    return auth === `Bearer ${process.env.CRON_SECRET}`;
  },
}));

import { POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(opts: { secret?: string } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (opts.secret !== undefined) {
    headers["authorization"] = `Bearer ${opts.secret}`;
  }
  return new NextRequest("http://localhost:3000/api/jobs/expire-bans", {
    method: "POST",
    headers,
  });
}

const CRON_SECRET = "test-cron-secret-abc";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/jobs/expire-bans", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
  });

  it("rejects requests without Authorization header", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects requests with incorrect secret", async () => {
    const res = await POST(makeRequest({ secret: "wrong-secret" }));
    expect(res.status).toBe(401);
  });

  it("returns { expired: 0, bridgeFailed: 0 } when no bans are expired", async () => {
    mockFindMany.mockResolvedValue([]);

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.expired).toBe(0);
    expect(json.bridgeFailed).toBe(0);
    expect(mockUpdateMany).not.toHaveBeenCalled();
    expect(mockBridgeRevoke).not.toHaveBeenCalled();
  });

  it("bulk-updates expired bans to EXPIRED status", async () => {
    mockFindMany.mockResolvedValue([
      { id: "ban-1", playerId: BigInt(111), gameId: null, game: null },
      { id: "ban-2", playerId: BigInt(222), gameId: null, game: null },
    ]);
    mockUpdateMany.mockResolvedValue({ count: 2 });
    mockBridgeRevoke.mockResolvedValue({ ok: true });

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(200);

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["ban-1", "ban-2"] } },
        data: { status: "EXPIRED" },
      })
    );

    const json = await res.json();
    expect(json.expired).toBe(2);
  });

  it("calls bridge for each expired ban", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "ban-1",
        playerId: BigInt(111),
        gameId: "game-1",
        game: { universeIdProd: BigInt(999) },
      },
    ]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockBridgeRevoke.mockResolvedValue({ ok: true });

    await POST(makeRequest({ secret: CRON_SECRET }));

    expect(mockBridgeRevoke).toHaveBeenCalledWith(
      expect.objectContaining({
        banId: "ban-1",
        revokeReason: "Ban expired",
        universeId: 999,
      })
    );
  });

  it("uses undefined universeId when game is null", async () => {
    mockFindMany.mockResolvedValue([
      { id: "ban-1", playerId: BigInt(111), gameId: null, game: null },
    ]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockBridgeRevoke.mockResolvedValue({ ok: true });

    await POST(makeRequest({ secret: CRON_SECRET }));

    expect(mockBridgeRevoke).toHaveBeenCalledWith(
      expect.objectContaining({ universeId: undefined })
    );
  });

  it("counts bridge failures but still returns 200", async () => {
    mockFindMany.mockResolvedValue([
      { id: "ban-1", playerId: BigInt(111), gameId: null, game: null },
      { id: "ban-2", playerId: BigInt(222), gameId: null, game: null },
    ]);
    mockUpdateMany.mockResolvedValue({ count: 2 });
    mockBridgeRevoke
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: "Bridge unavailable" });

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.expired).toBe(2);
    expect(json.bridgeFailed).toBe(1);
  });

  it("returns 500 when prisma throws", async () => {
    mockFindMany.mockRejectedValue(new Error("DB error"));

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(500);
  });

  it("queries only ACTIVE bans with expiresAt lte now", async () => {
    mockFindMany.mockResolvedValue([]);

    await POST(makeRequest({ secret: CRON_SECRET }));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          expiresAt: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      })
    );
  });
});
