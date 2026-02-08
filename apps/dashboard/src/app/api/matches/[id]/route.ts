import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  requireApiPermission,
  validateApiKey,
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/authorize";

// Schema for updating match
const updateMatchSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ERRORED"]).optional(),
  outcome: z.enum(["TEAM_A_WIN", "TEAM_B_WIN", "DRAW", "CANCELLED", "INCOMPLETE"]).optional(),
  teamAScore: z.number().optional(),
  teamBScore: z.number().optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  durationSecs: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Schema for adding players
const addPlayersSchema = z.object({
  players: z.array(
    z.object({
      playerId: z.number(),
      playerName: z.string().optional(),
      team: z.string().optional(),
    })
  ),
});

// Schema for updating player stats
const updatePlayerSchema = z.object({
  playerId: z.number(),
  kills: z.number().optional(),
  deaths: z.number().optional(),
  assists: z.number().optional(),
  score: z.number().optional(),
  isWinner: z.boolean().optional(),
  leftAt: z.string().datetime().optional(),
  stats: z.record(z.string(), z.unknown()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/matches/[id]
 * Get match details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!validateApiKey(request)) {
    const authResult = await requireApiPermission("view:matches");
    if (authResult instanceof Response) return authResult;
  }

  if (!checkRateLimit(getRateLimitKey(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      players: {
        orderBy: [{ team: "asc" }, { score: "desc" }],
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  return NextResponse.json({
    match: {
      ...match,
      placeId: match.placeId?.toString(),
      players: match.players.map((p) => ({
        ...p,
        playerId: p.playerId.toString(),
      })),
    },
  });
}

/**
 * PATCH /api/matches/[id]
 * Update match status/scores (called by game servers)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(getRateLimitKey(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateMatchSchema.parse(body);

    const match = await prisma.match.update({
      where: { id },
      data: {
        status: data.status,
        outcome: data.outcome,
        teamAScore: data.teamAScore,
        teamBScore: data.teamBScore,
        durationSecs: data.durationSecs,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
        endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
      },
    });

    return NextResponse.json({ match });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to update match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/matches/[id]
 * Add players or update player stats
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(getRateLimitKey(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await params;
  const action = request.nextUrl.searchParams.get("action");

  try {
    const body = await request.json();

    if (action === "addPlayers") {
      const data = addPlayersSchema.parse(body);

      await prisma.matchPlayer.createMany({
        data: data.players.map((p) => ({
          matchId: id,
          playerId: BigInt(p.playerId),
          playerName: p.playerName,
          team: p.team,
        })),
        skipDuplicates: true,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "updatePlayer") {
      const data = updatePlayerSchema.parse(body);

      await prisma.matchPlayer.update({
        where: {
          matchId_playerId: {
            matchId: id,
            playerId: BigInt(data.playerId),
          },
        },
        data: {
          kills: data.kills,
          deaths: data.deaths,
          assists: data.assists,
          score: data.score,
          isWinner: data.isWinner,
          leftAt: data.leftAt ? new Date(data.leftAt) : undefined,
          stats: data.stats as Prisma.InputJsonValue | undefined,
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to process action:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
