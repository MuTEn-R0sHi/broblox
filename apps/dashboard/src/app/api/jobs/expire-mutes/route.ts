import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronSecret } from "@/lib/authorize";
import { bridgeRevokeMuteToRoblox } from "@/lib/moderation-bridge";

/**
 * POST /api/jobs/expire-mutes
 *
 * Finds all active temporary mutes whose `expiresAt` has passed, marks them as
 * inactive in the database (`isActive = false`), and publishes a revocation
 * signal to the Roblox DataStore so live game servers lift the restriction.
 *
 * Authentication: `Authorization: Bearer <CRON_SECRET>`
 *
 * Intended to be triggered every 5 minutes. Safe to call multiple times —
 * `isActive = true` guards against double-processing.
 */
export async function POST(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    // 1. Find all active, non-permanent mutes that have crossed their expiry.
    const expired = await prisma.mute.findMany({
      where: {
        isActive: true,
        isPermanent: false,
        expiresAt: { lte: now },
      },
      select: {
        id: true,
        playerId: true,
        gameId: true,
        issuedById: true,
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

    // 2. Bulk-update all expired mutes to inactive.
    await prisma.mute.updateMany({
      where: { id: { in: expired.map((m) => m.id) } },
      data: { isActive: false },
    });

    // 3. Bridge each expired mute to Roblox so live servers lift the restriction.
    let bridgeFailed = 0;
    for (const mute of expired) {
      const universeId =
        typeof mute.game?.universeIdProd === "bigint"
          ? Number(mute.game.universeIdProd)
          : undefined;

      const result = await bridgeRevokeMuteToRoblox({
        muteId: mute.id,
        playerId: mute.playerId,
        revokedById: mute.issuedById,
        revokedAt: now,
        universeId,
      });

      if (!result.ok) {
        bridgeFailed++;
        console.warn(`[expire-mutes] Bridge failed for mute ${mute.id}: ${result.error}`);
      }
    }

    return NextResponse.json({ expired: expired.length, bridgeFailed });
  } catch (error) {
    console.error("[expire-mutes] Job failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
