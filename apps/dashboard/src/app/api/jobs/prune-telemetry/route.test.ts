import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDeleteEvents = vi.fn();
const mockDeleteMetrics = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    telemetryEvent: {
      deleteMany: (...args: unknown[]) => mockDeleteEvents(...args),
    },
    metricPoint: {
      deleteMany: (...args: unknown[]) => mockDeleteMetrics(...args),
    },
  },
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

function makeRequest(
  opts: {
    secret?: string;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const url = new URL("http://localhost:3000/api/jobs/prune-telemetry");
  if (opts.searchParams) {
    for (const [k, v] of Object.entries(opts.searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  const headers: Record<string, string> = {};
  if (opts.secret !== undefined) {
    headers["authorization"] = `Bearer ${opts.secret}`;
  }
  return new NextRequest(url, { method: "POST", headers });
}

const CRON_SECRET = "test-cron-secret-abc";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/jobs/prune-telemetry", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-22T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects requests without Authorization header", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects requests with incorrect secret", async () => {
    const res = await POST(makeRequest({ secret: "bad" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid retentionDays (zero)", async () => {
    const res = await POST(
      makeRequest({ secret: CRON_SECRET, searchParams: { retentionDays: "0" } })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid retentionDays (negative)", async () => {
    const res = await POST(
      makeRequest({ secret: CRON_SECRET, searchParams: { retentionDays: "-5" } })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-numeric retentionDays", async () => {
    const res = await POST(
      makeRequest({
        secret: CRON_SECRET,
        searchParams: { retentionDays: "bad" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("deletes events and metrics older than the default 90-day retention", async () => {
    mockDeleteEvents.mockResolvedValue({ count: 50 });
    mockDeleteMetrics.mockResolvedValue({ count: 120 });

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.retentionDays).toBe(90);
    expect(json.deletedEvents).toBe(50);
    expect(json.deletedMetrics).toBe(120);
    expect(json.cutoff).toBeDefined();
  });

  it("uses custom retentionDays when provided", async () => {
    mockDeleteEvents.mockResolvedValue({ count: 0 });
    mockDeleteMetrics.mockResolvedValue({ count: 0 });

    const res = await POST(
      makeRequest({ secret: CRON_SECRET, searchParams: { retentionDays: "30" } })
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.retentionDays).toBe(30);
  });

  it("uses the correct cutoff date (≈90 days before now)", async () => {
    mockDeleteEvents.mockResolvedValue({ count: 0 });
    mockDeleteMetrics.mockResolvedValue({ count: 0 });

    await POST(makeRequest({ secret: CRON_SECRET }));

    const eventsCall = mockDeleteEvents.mock.calls[0][0] as {
      where: { ingestedAt: { lt: Date } };
    };
    const cutoff = eventsCall.where.ingestedAt.lt;

    // The cutoff should be approximately 90 days ago
    const expectedCutoff = new Date("2026-02-22T12:00:00Z");
    expectedCutoff.setDate(expectedCutoff.getDate() - 90);
    expect(cutoff.getTime()).toBe(expectedCutoff.getTime());
  });

  it("runs both deletes in parallel (both mocks called)", async () => {
    mockDeleteEvents.mockResolvedValue({ count: 0 });
    mockDeleteMetrics.mockResolvedValue({ count: 0 });

    await POST(makeRequest({ secret: CRON_SECRET }));

    expect(mockDeleteEvents).toHaveBeenCalledTimes(1);
    expect(mockDeleteMetrics).toHaveBeenCalledTimes(1);
  });

  it("caps retentionDays at 3650 (10 years)", async () => {
    mockDeleteEvents.mockResolvedValue({ count: 0 });
    mockDeleteMetrics.mockResolvedValue({ count: 0 });

    const res = await POST(
      makeRequest({
        secret: CRON_SECRET,
        searchParams: { retentionDays: "99999" },
      })
    );
    const json = await res.json();
    expect(json.retentionDays).toBe(3650);
  });

  it("returns 500 when prisma throws", async () => {
    mockDeleteEvents.mockRejectedValue(new Error("DB error"));
    mockDeleteMetrics.mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    expect(res.status).toBe(500);
  });

  it("passes lt cutoff to both tables", async () => {
    mockDeleteEvents.mockResolvedValue({ count: 10 });
    mockDeleteMetrics.mockResolvedValue({ count: 5 });

    await POST(makeRequest({ secret: CRON_SECRET }));

    expect(mockDeleteEvents).toHaveBeenCalledWith({
      where: { ingestedAt: { lt: expect.any(Date) } },
    });
    expect(mockDeleteMetrics).toHaveBeenCalledWith({
      where: { ingestedAt: { lt: expect.any(Date) } },
    });
  });

  it("response includes cutoff ISO string", async () => {
    mockDeleteEvents.mockResolvedValue({ count: 0 });
    mockDeleteMetrics.mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest({ secret: CRON_SECRET }));
    const json = await res.json();

    expect(typeof json.cutoff).toBe("string");
    expect(new Date(json.cutoff).getFullYear()).toBe(2025); // 90 days before Feb 2026
  });
});
