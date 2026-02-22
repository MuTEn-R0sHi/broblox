import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFindMany = vi.fn();
const mockUpdateMany = vi.fn();
const mockBridgeRevoke = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    mute: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

vi.mock("@/lib/moderation-bridge", () => ({
  bridgeRevokeMuteToRoblox: (...args: unknown[]) => mockBridgeRevoke(...args),
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
  return new NextRequest("http://localhost:3000/api/jobs/expire-mutes", {
    method: "POST",
    headers,
  });
}

const CRON_SECRET = "test-cron-secret-abc";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/jobs/expire-mutes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
  });

  it("rejects requests without Authorization header", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects requests with incorrect secret", async () => {
    const res = await POST(makeRequest({ secret: "bad-secret" }));
    expect(res.status).toBe(401);
  });

  it("returns { expired: 0, bridgeFailed: 0 } when no mutes are expired", async () => {
    mockFindMany.mockResolvedValue([]);

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.expired).toBe(0);
    expect(json.bridgeFailed).toBe(0);
    expect(mockUpdateMany).not.toHaveBeenCalled();
    expect(mockBridgeRevoke).not.toHaveBeenCalled();
  });

  it("bulk-updates expired mutes to isActive=false", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "mute-1",
        playerId: BigInt(111),
        gameId: null,
        issuedById: "mod-1",
        game: null,
      },
      {
        id: "mute-2",
        playerId: BigInt(222),
        gameId: null,
        issuedById: "mod-1",
        game: null,
      },
    ]);
    mockUpdateMany.mockResolvedValue({ count: 2 });
    mockBridgeRevoke.mockResolvedValue({ ok: true });

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(200);

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["mute-1", "mute-2"] } },
        data: { isActive: false },
      })
    );

    const json = await res.json();
    expect(json.expired).toBe(2);
  });

  it("bridges each expired mute to Roblox", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "mute-1",
        playerId: BigInt(111),
        gameId: "game-1",
        issuedById: "mod-1",
        game: { universeIdProd: BigInt(888) },
      },
    ]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockBridgeRevoke.mockResolvedValue({ ok: true });

    await POST(makeRequest({ secret: CRON_SECRET }));

    expect(mockBridgeRevoke).toHaveBeenCalledWith(
      expect.objectContaining({
        muteId: "mute-1",
        revokedById: "mod-1",
        universeId: 888,
      })
    );
  });

  it("uses undefined universeId when game is null", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "mute-1",
        playerId: BigInt(111),
        gameId: null,
        issuedById: "mod-1",
        game: null,
      },
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
      {
        id: "mute-1",
        playerId: BigInt(111),
        gameId: null,
        issuedById: "mod-1",
        game: null,
      },
      {
        id: "mute-2",
        playerId: BigInt(222),
        gameId: null,
        issuedById: "mod-2",
        game: null,
      },
    ]);
    mockUpdateMany.mockResolvedValue({ count: 2 });
    mockBridgeRevoke
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: "Bridge offline" });

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

  it("queries only active non-permanent mutes with expiresAt lte now", async () => {
    mockFindMany.mockResolvedValue([]);

    await POST(makeRequest({ secret: CRON_SECRET }));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          isPermanent: false,
          expiresAt: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      })
    );
  });
});
