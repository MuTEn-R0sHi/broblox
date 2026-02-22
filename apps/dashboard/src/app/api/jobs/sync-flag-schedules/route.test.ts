import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFindMany = vi.fn();
const mockUpdateMany = vi.fn();
const mockBridgeSync = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    featureFlag: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

vi.mock("@/lib/featureflags-bridge", () => ({
  bridgeSyncFeatureFlagsToRoblox: (...args: unknown[]) => mockBridgeSync(...args),
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

function makeFlag(id: string, key: string) {
  return {
    id,
    key,
    rolloutPercentage: 100,
    isKilled: false,
    value: null,
  };
}

function makeRequest(opts: { secret?: string } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (opts.secret !== undefined) {
    headers["authorization"] = `Bearer ${opts.secret}`;
  }
  return new NextRequest("http://localhost:3000/api/jobs/sync-flag-schedules", {
    method: "POST",
    headers,
  });
}

const CRON_SECRET = "test-cron-secret-abc";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/jobs/sync-flag-schedules", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
  });

  it("rejects requests without Authorization header", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects requests with incorrect secret", async () => {
    const res = await POST(makeRequest({ secret: "wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns zeros and no bridge when nothing to toggle", async () => {
    mockFindMany.mockResolvedValue([]);

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.activated).toBe(0);
    expect(json.deactivated).toBe(0);
    expect(json.bridged).toBe(false);
    expect(mockUpdateMany).not.toHaveBeenCalled();
    expect(mockBridgeSync).not.toHaveBeenCalled();
  });

  it("activates flags in their start window", async () => {
    // First call = toActivate, second call = toDeactivate (empty)
    mockFindMany.mockResolvedValueOnce([makeFlag("flag-1", "double-xp")]).mockResolvedValueOnce([]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockBridgeSync.mockResolvedValue({ ok: true });

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(200);

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["flag-1"] } },
        data: { enabledDev: true, enabledStage: true, enabledProd: true },
      })
    );

    const json = await res.json();
    expect(json.activated).toBe(1);
    expect(json.deactivated).toBe(0);
  });

  it("deactivates flags past their end window", async () => {
    // First call = toActivate (empty), second call = toDeactivate
    mockFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([makeFlag("flag-2", "old-event")]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockBridgeSync.mockResolvedValue({ ok: true });

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(200);

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["flag-2"] } },
        data: { enabledDev: false, enabledStage: false, enabledProd: false },
      })
    );

    const json = await res.json();
    expect(json.activated).toBe(0);
    expect(json.deactivated).toBe(1);
  });

  it("activates and deactivates in the same run", async () => {
    mockFindMany
      .mockResolvedValueOnce([makeFlag("flag-1", "new-event")])
      .mockResolvedValueOnce([makeFlag("flag-2", "old-event")]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockBridgeSync.mockResolvedValue({ ok: true });

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    const json = await res.json();

    expect(json.activated).toBe(1);
    expect(json.deactivated).toBe(1);
    expect(mockUpdateMany).toHaveBeenCalledTimes(2);
  });

  it("calls bridge with activated flags set to enabled=true", async () => {
    mockFindMany.mockResolvedValueOnce([makeFlag("flag-1", "double-xp")]).mockResolvedValueOnce([]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockBridgeSync.mockResolvedValue({ ok: true });

    await POST(makeRequest({ secret: CRON_SECRET }));

    expect(mockBridgeSync).toHaveBeenCalledWith(
      expect.objectContaining({
        environments: ["dev", "stage", "prod"],
        flags: expect.arrayContaining([
          expect.objectContaining({
            key: "double-xp",
            enabledDev: true,
            enabledStage: true,
            enabledProd: true,
          }),
        ]),
      })
    );
  });

  it("calls bridge with deactivated flags set to enabled=false", async () => {
    mockFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([makeFlag("flag-2", "old-event")]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockBridgeSync.mockResolvedValue({ ok: true });

    await POST(makeRequest({ secret: CRON_SECRET }));

    expect(mockBridgeSync).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: expect.arrayContaining([
          expect.objectContaining({
            key: "old-event",
            enabledDev: false,
            enabledStage: false,
            enabledProd: false,
          }),
        ]),
      })
    );
  });

  it("bridge failure is non-fatal — DB is updated, 200 returned", async () => {
    mockFindMany.mockResolvedValueOnce([makeFlag("flag-1", "event")]).mockResolvedValueOnce([]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockBridgeSync.mockResolvedValue({ ok: false, error: "Bridge down" });

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.activated).toBe(1);
    expect(json.bridged).toBe(false);
  });

  it("returns 500 when prisma throws", async () => {
    mockFindMany.mockRejectedValue(new Error("DB error"));

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(500);
  });

  it("queries for activated flags with correct shape", async () => {
    mockFindMany.mockResolvedValue([]);

    await POST(makeRequest({ secret: CRON_SECRET }));

    // First findMany call should filter by isKilled=false and startsAt
    const firstCall = mockFindMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(firstCall.where).toMatchObject({
      isKilled: false,
      startsAt: expect.objectContaining({ lte: expect.any(Date) }),
    });
  });
});
