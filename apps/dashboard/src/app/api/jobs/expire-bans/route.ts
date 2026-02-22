import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronSecret } from "@/lib/authorize";
import { bridgeRevokeBanToRoblox, generateBridgeId } from "@/lib/moderation-bridge";

/**
 * POST /api/jobs/expire-bans
 *
 * Finds all ACTIVE temporary bans whose `expiresAt` has passed, marks them as
 * EXPIRED in the database, and publishes a revocation signal to the Roblox
 * DataStore so live game servers invalidate their cached ban records.
 *
 * Authentication: `Authorization: Bearer <CRON_SECRET>`
 *
 * Intended to be triggered by a scheduled cron (e.g. every 5 minutes).
 * Safe to call multiple times — uses `status = ACTIVE` as a guard against
 * double-processing.
 */
export async function POST(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    // 1. Find all ACTIVE bans that have now passed their expiry time.
    const expired = await prisma.ban.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: { lte: now },
      },
      select: {
        id: true,
        playerId: true,
        gameId: true,
        game: {
          select: {
            universeIdProd: true,
          },
        },
      },
    });

    if (expired.length === 0) {
      return NextResponse.json({ expired: 0, bridgeFailed: 0 });
    }

    // 2. Bulk-update all expired bans to EXPIRED status.
    await prisma.ban.updateMany({
      where: { id: { in: expired.map((b) => b.id) } },
      data: { status: "EXPIRED" },
    });

    // 3. Bridge each expired ban to Roblox so live servers invalidate caches.
    let bridgeFailed = 0;
    for (const ban of expired) {
      const universeId =
        typeof ban.game?.universeIdProd === "bigint" ? Number(ban.game.universeIdProd) : undefined;

      const result = await bridgeRevokeBanToRoblox({
        banId: ban.id,
        playerId: ban.playerId,
        revokedById: generateBridgeId(), // system actor — no real user ID
        revokeReason: "Ban expired",
        revokedAt: now,
        universeId,
      });

      if (!result.ok) {
        bridgeFailed++;
        console.warn(`[expire-bans] Bridge failed for ban ${ban.id}: ${result.error}`);
      }
    }

    return NextResponse.json({ expired: expired.length, bridgeFailed });
  } catch (error) {
    console.error("[expire-bans] Job failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
