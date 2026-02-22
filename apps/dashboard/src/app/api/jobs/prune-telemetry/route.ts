import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronSecret } from "@/lib/authorize";

const DEFAULT_RETENTION_DAYS = 90;
const MAX_RETENTION_DAYS = 3650; // 10 years — safety cap

/**
 * POST /api/jobs/prune-telemetry
 *
 * Deletes `TelemetryEvent` and `MetricPoint` rows older than the configured
 * retention window to prevent unbounded table growth.
 *
 * Query parameters:
 *  - `retentionDays` (optional, default 90) — rows older than this many days
 *    are deleted. Must be between 1 and 3650.
 *
 * Authentication: `Authorization: Bearer <CRON_SECRET>`
 *
 * Both tables are pruned in parallel. Intended to run once per day (e.g. at
 * 02:00 UTC) via a scheduled cron.
 */
export async function POST(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const rawRetention = parseInt(
    searchParams.get("retentionDays") ?? String(DEFAULT_RETENTION_DAYS),
    10
  );

  if (!Number.isFinite(rawRetention) || rawRetention < 1) {
    return NextResponse.json(
      { error: "retentionDays must be a positive integer" },
      { status: 400 }
    );
  }

  const retentionDays = Math.min(rawRetention, MAX_RETENTION_DAYS);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  try {
    const [eventsResult, metricsResult] = await Promise.all([
      prisma.telemetryEvent.deleteMany({
        where: { ingestedAt: { lt: cutoff } },
      }),
      prisma.metricPoint.deleteMany({
        where: { ingestedAt: { lt: cutoff } },
      }),
    ]);

    return NextResponse.json({
      retentionDays,
      cutoff: cutoff.toISOString(),
      deletedEvents: eventsResult.count,
      deletedMetrics: metricsResult.count,
    });
  } catch (error) {
    console.error("[prune-telemetry] Job failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
