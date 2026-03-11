import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateMany = vi.fn();
const mockFindMany = vi.fn();
const mockCheckAuth = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    metricPoint: {
      createMany: (...args: unknown[]) => mockCreateMany(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

vi.mock("@/lib/authorize", () => ({
  checkAuth: (...args: unknown[]) => mockCheckAuth(...args),
  validateApiKey: (req: NextRequest) => {
    const apiKey = req.headers.get("x-api-key");
    const expected = process.env.GAME_SERVER_API_KEY;
    return !!apiKey && !!expected && apiKey === expected;
  },
  checkRateLimit: () => true,
  checkRateLimitAsync: () => Promise.resolve(true),
  getRateLimitKey: () => "test",
}));

import { POST, GET } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  method: string,
  opts: { body?: unknown; headers?: Record<string, string>; searchParams?: Record<string, string> }
): NextRequest {
  const url = new URL("http://localhost:3000/api/metrics");
  if (opts.searchParams) {
    for (const [k, v] of Object.entries(opts.searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(opts.headers ?? {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

const API_KEY = "test-api-key-456";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/metrics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("GAME_SERVER_API_KEY", API_KEY);
  });

  it("rejects requests without an API key", async () => {
    const req = makeRequest("POST", { body: { metrics: [] } });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects wrong API key", async () => {
    const req = makeRequest("POST", {
      body: { metrics: [] },
      headers: { "x-api-key": "wrong" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty metrics array", async () => {
    const req = makeRequest("POST", {
      body: { metrics: [] },
      headers: { "x-api-key": API_KEY },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid metric schema", async () => {
    const req = makeRequest("POST", {
      body: { metrics: [{ wrong: true }] },
      headers: { "x-api-key": API_KEY },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("ingests valid metrics and returns 201", async () => {
    mockCreateMany.mockResolvedValue({ count: 2 });

    const metrics = [
      { name: "fps", type: "gauge", value: 60, timestamp: 1700000000 },
      {
        name: "errors",
        type: "counter",
        value: 3,
        timestamp: 1700000001,
        labels: { server: "s1" },
      },
    ];

    const req = makeRequest("POST", {
      body: { metrics },
      headers: { "x-api-key": API_KEY },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.ingested).toBe(2);
    expect(mockCreateMany).toHaveBeenCalledTimes(1);
  });

  it("extracts serverId from labels", async () => {
    mockCreateMany.mockResolvedValue({ count: 1 });

    const req = makeRequest("POST", {
      body: {
        metrics: [
          {
            name: "latency",
            type: "histogram",
            value: 42,
            timestamp: 1,
            labels: { serverId: "abc" },
          },
        ],
      },
      headers: { "x-api-key": API_KEY },
    });

    await POST(req);

    const data = mockCreateMany.mock.calls[0][0].data as Array<{
      serverId: string | null;
    }>;
    expect(data[0].serverId).toBe("abc");
  });

  it("returns 500 when createMany throws", async () => {
    mockCreateMany.mockRejectedValue(new Error("DB down"));

    const req = makeRequest("POST", {
      body: {
        metrics: [{ name: "x", type: "counter", value: 1, timestamp: 1 }],
      },
      headers: { "x-api-key": API_KEY },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/metrics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("GAME_SERVER_API_KEY", API_KEY);
  });

  it("rejects requests without an API key", async () => {
    mockCheckAuth.mockResolvedValue(null);
    const req = makeRequest("GET", {});
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("allows access with valid session (no API key)", async () => {
    mockCheckAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    mockFindMany.mockResolvedValue([]);

    const req = makeRequest("GET", {});
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("returns metrics with defaults", async () => {
    mockFindMany.mockResolvedValue([
      { id: "1", name: "fps", type: "gauge", value: 60, ingestedAt: new Date() },
    ]);

    const req = makeRequest("GET", { headers: { "x-api-key": API_KEY } });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.metrics).toHaveLength(1);
    expect(json.metrics[0].name).toBe("fps");
  });

  it("passes filter params to prisma", async () => {
    mockFindMany.mockResolvedValue([]);

    const req = makeRequest("GET", {
      headers: { "x-api-key": API_KEY },
      searchParams: { name: "errors", limit: "25" },
    });

    await GET(req);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ name: "errors" }),
        take: 25,
      })
    );
  });

  it("clamps limit to max 500", async () => {
    mockFindMany.mockResolvedValue([]);

    const req = makeRequest("GET", {
      headers: { "x-api-key": API_KEY },
      searchParams: { limit: "9999" },
    });

    await GET(req);

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 500 }));
  });
});
