import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronSecret } from "@/lib/authorize";
import {
  bridgeSyncFeatureFlagsToRoblox,
  type DashboardFeatureFlagRecord,
} from "@/lib/featureflags-bridge";

/**
 * POST /api/jobs/sync-flag-schedules
 *
 * Automatically enables and disables feature flags according to their
 * `startsAt` / `endsAt` schedule fields, then bridges the updated state to
 * the Roblox DataStore so it takes effect on live game servers.
 *
 * Rules:
 *  - A flag with `startsAt <= now` and (`endsAt > now` OR no `endsAt`) is
 *    activated for all environments (dev, stage, prod).
 *  - A flag with `endsAt <= now` is deactivated for all environments.
 *  - Killed flags (`isKilled = true`) are never re-activated by this job.
 *
 * Authentication: `Authorization: Bearer <CRON_SECRET>`
 *
 * Safe to call multiple times — idempotent for flags already in the correct
 * state. Intended to run every 5–15 minutes.
 */
export async function POST(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    // 1. Find flags whose scheduled start window has arrived (activate).
    //    Only non-killed flags. `startsAt: { lte: now }` excludes null rows.
    const toActivate = await prisma.featureFlag.findMany({
      where: {
        isKilled: false,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: {
        id: true,
        key: true,
        rolloutPercentage: true,
        isKilled: true,
        value: true,
      },
    });

    // 2. Find flags whose scheduled end window has passed (deactivate).
    //    `endsAt: { lte: now }` excludes null rows.
    const toDeactivate = await prisma.featureFlag.findMany({
      where: {
        endsAt: { lte: now },
      },
      select: {
        id: true,
        key: true,
        rolloutPercentage: true,
        isKilled: true,
        value: true,
      },
    });

    const activated = toActivate.length;
    const deactivated = toDeactivate.length;

    if (activated === 0 && deactivated === 0) {
      return NextResponse.json({ activated: 0, deactivated: 0, bridged: false });
    }

    // 3. Bulk-update flags in the DB.
    if (activated > 0) {
      await prisma.featureFlag.updateMany({
        where: { id: { in: toActivate.map((f) => f.id) } },
        data: {
          enabledDev: true,
          enabledStage: true,
          enabledProd: true,
        },
      });
    }

    if (deactivated > 0) {
      await prisma.featureFlag.updateMany({
        where: { id: { in: toDeactivate.map((f) => f.id) } },
        data: {
          enabledDev: false,
          enabledStage: false,
          enabledProd: false,
        },
      });
    }

    // 4. Bridge the changed flags to Roblox.
    const flagsToSync: DashboardFeatureFlagRecord[] = [
      ...toActivate.map((f) => ({
        key: f.key,
        enabledDev: true,
        enabledStage: true,
        enabledProd: true,
        rolloutPercentage: f.rolloutPercentage,
        isKilled: f.isKilled,
        value: f.value,
      })),
      ...toDeactivate.map((f) => ({
        key: f.key,
        enabledDev: false,
        enabledStage: false,
        enabledProd: false,
        rolloutPercentage: f.rolloutPercentage,
        isKilled: f.isKilled,
        value: f.value,
      })),
    ];

    const bridgeResult = await bridgeSyncFeatureFlagsToRoblox({
      environments: ["dev", "stage", "prod"],
      flags: flagsToSync,
    });

    if (!bridgeResult.ok) {
      // Bridge failure is non-fatal — the DB is already updated.
      console.warn(`[sync-flag-schedules] Bridge sync failed: ${bridgeResult.error}`);
    }

    return NextResponse.json({
      activated,
      deactivated,
      bridged: bridgeResult.ok && !bridgeResult.skipped,
    });
  } catch (error) {
    console.error("[sync-flag-schedules] Job failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
