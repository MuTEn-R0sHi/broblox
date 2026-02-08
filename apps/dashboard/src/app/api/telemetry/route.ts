import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkAuth, validateApiKey, checkRateLimit, getRateLimitKey } from "@/lib/authorize";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    // Prisma: P2021 = table does not exist
    (error as { code?: string }).code === "P2021"
  );
}

const telemetryEventSchema = z.object({
  category: z.string().min(1),
  name: z.string().min(1),
  level: z.enum(["debug", "info", "warn", "error"]),
  timestamp: z.number(),
  clock: z.number(),
  context: z
    .object({
      traceId: z.string().optional(),
      spanId: z.string().optional(),
      serverId: z.string().optional(),
      placeId: z.number().optional(),
      playerId: z.number().optional(),
      sessionId: z.string().optional(),
      tags: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const batchSchema = z.object({
  events: z.array(telemetryEventSchema).min(1).max(100),
});

/**
 * POST /api/telemetry
 * Ingest a batch of telemetry events from game servers.
 */
export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(getRateLimitKey(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { events } = batchSchema.parse(body);

    const data: Prisma.TelemetryEventCreateManyInput[] = events.map((e) => ({
      category: e.category,
      name: e.name,
      level: e.level,
      timestamp: e.timestamp,
      clock: e.clock,
      traceId: e.context?.traceId,
      spanId: e.context?.spanId,
      serverId: e.context?.serverId,
      placeId: e.context?.placeId ? BigInt(e.context.placeId) : null,
      playerId: e.context?.playerId ? BigInt(e.context.playerId) : null,
      sessionId: e.context?.sessionId,
      data: e.data as Prisma.InputJsonValue,
    }));

    const result = await prisma.telemetryEvent.createMany({ data });

    return NextResponse.json({ ingested: result.count }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          error: "Telemetry database is not initialized",
          hint: "Run `pnpm prisma db push` for the dashboard database.",
        },
        { status: 503 }
      );
    }
    console.error("Failed to ingest telemetry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/telemetry
 * Query recent telemetry events (for dashboard display).
 */
export async function GET(request: NextRequest) {
  // Accept either API key (game servers) or dashboard session (browser)
  if (!validateApiKey(request)) {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!checkRateLimit(getRateLimitKey(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const searchParams = request.nextUrl.searchParams;
  const parsedLimit = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(100, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 50));
  const category = searchParams.get("category");
  const level = searchParams.get("level");
  const since = searchParams.get("since"); // ISO 8601

  const where: Prisma.TelemetryEventWhereInput = {};
  if (category) where.category = category;
  if (level) where.level = level;
  if (since) {
    const sinceDate = new Date(since);
    if (Number.isNaN(sinceDate.getTime())) {
      return NextResponse.json({ error: "Invalid 'since' date" }, { status: 400 });
    }
    where.ingestedAt = { gte: sinceDate };
  }

  try {
    const events = await prisma.telemetryEvent.findMany({
      where,
      orderBy: { ingestedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      events: events.map((e) => ({
        ...e,
        placeId: e.placeId?.toString(),
        playerId: e.playerId?.toString(),
      })),
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          error: "Telemetry database is not initialized",
          hint: "Run `pnpm prisma db push` for the dashboard database.",
        },
        { status: 503 }
      );
    }
    console.error("Failed to query telemetry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
