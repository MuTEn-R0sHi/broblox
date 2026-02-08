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
    telemetryEvent: {
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
  getRateLimitKey: () => "test",
}));

// Import handlers *after* mocking
import { POST, GET } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  method: string,
  opts: { body?: unknown; headers?: Record<string, string>; searchParams?: Record<string, string> }
): NextRequest {
  const url = new URL("http://localhost:3000/api/telemetry");
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

const API_KEY = "test-api-key-123";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/telemetry", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("GAME_SERVER_API_KEY", API_KEY);
  });

  it("rejects requests without an API key", async () => {
    const req = makeRequest("POST", { body: { events: [] } });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("rejects requests with a wrong API key", async () => {
    const req = makeRequest("POST", {
      body: { events: [] },
      headers: { "x-api-key": "wrong" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body (empty events array)", async () => {
    const req = makeRequest("POST", {
      body: { events: [] },
      headers: { "x-api-key": API_KEY },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid request body");
  });

  it("returns 400 for malformed event schema", async () => {
    const req = makeRequest("POST", {
      body: { events: [{ bad: true }] },
      headers: { "x-api-key": API_KEY },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("ingests valid events and returns 201", async () => {
    mockCreateMany.mockResolvedValue({ count: 2 });

    const events = [
      {
        category: "gameplay",
        name: "level_up",
        level: "info",
        timestamp: 1700000000,
        clock: 123,
        data: { newLevel: 5 },
      },
      {
        category: "system",
        name: "heartbeat",
        level: "debug",
        timestamp: 1700000001,
        clock: 124,
        context: { serverId: "s1", traceId: "t1" },
      },
    ];

    const req = makeRequest("POST", {
      body: { events },
      headers: { "x-api-key": API_KEY },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.ingested).toBe(2);
    expect(mockCreateMany).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when createMany throws", async () => {
    mockCreateMany.mockRejectedValue(new Error("DB failure"));

    const req = makeRequest("POST", {
      body: {
        events: [{ category: "x", name: "y", level: "info", timestamp: 1, clock: 1 }],
      },
      headers: { "x-api-key": API_KEY },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/telemetry", () => {
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

  it("returns events with default params", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "1",
        category: "gameplay",
        name: "test",
        level: "info",
        timestamp: 1,
        clock: 1,
        placeId: BigInt(123),
        playerId: BigInt(456),
        ingestedAt: new Date(),
      },
    ]);

    const req = makeRequest("GET", { headers: { "x-api-key": API_KEY } });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.events).toHaveLength(1);
    // BigInt serialized as string
    expect(json.events[0].placeId).toBe("123");
    expect(json.events[0].playerId).toBe("456");
  });

  it("passes filter params to prisma", async () => {
    mockFindMany.mockResolvedValue([]);

    const req = makeRequest("GET", {
      headers: { "x-api-key": API_KEY },
      searchParams: { category: "system", level: "error", limit: "10" },
    });

    await GET(req);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: "system",
          level: "error",
        }),
        take: 10,
      })
    );
  });
});
