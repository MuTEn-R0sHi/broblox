import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkAuth, validateApiKey, checkRateLimitAsync, getRateLimitKey } from "@/lib/authorize";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const metricPointSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["counter", "gauge", "histogram"]),
  value: z.number(),
  timestamp: z.number(),
  labels: z.record(z.string(), z.string()).optional(),
});

const batchSchema = z.object({
  metrics: z.array(metricPointSchema).min(1).max(200),
});

/**
 * POST /api/metrics
 * Ingest a batch of metric points from game servers.
 */
export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimitAsync(getRateLimitKey(request)))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { metrics } = batchSchema.parse(body);

    // Extract serverId from labels if present
    const data: Prisma.MetricPointCreateManyInput[] = metrics.map((m) => ({
      name: m.name,
      type: m.type,
      value: m.value,
      timestamp: m.timestamp,
      labels: m.labels as Prisma.InputJsonValue,
      serverId: m.labels?.["server"] ?? m.labels?.["serverId"] ?? null,
    }));

    const result = await prisma.metricPoint.createMany({ data });

    return NextResponse.json({ ingested: result.count }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to ingest metrics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/metrics
 * Query metric aggregates (for dashboard charts).
 */
export async function GET(request: NextRequest) {
  // Accept either API key (game servers) or dashboard session (browser)
  if (!validateApiKey(request)) {
    const session = await checkAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!(await checkRateLimitAsync(getRateLimitKey(request)))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get("name");
  const since = searchParams.get("since"); // ISO 8601
  const parsedLimit = parseInt(searchParams.get("limit") ?? "100", 10);
  const limit = Math.min(500, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 100));

  const where: Prisma.MetricPointWhereInput = {};
  if (name) where.name = name;
  if (since) {
    const sinceDate = new Date(since);
    if (Number.isNaN(sinceDate.getTime())) {
      return NextResponse.json({ error: "Invalid 'since' date" }, { status: 400 });
    }
    where.ingestedAt = { gte: sinceDate };
  }

  const metrics = await prisma.metricPoint.findMany({
    where,
    orderBy: { ingestedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ metrics });
}
