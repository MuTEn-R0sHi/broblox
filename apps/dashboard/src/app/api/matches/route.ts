import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireApiPermission } from "@/lib/authorize";

// Schema for creating a match
const createMatchSchema = z.object({
  matchId: z.string().min(1),
  serverId: z.string().optional(),
  placeId: z.number().optional(),
  gameMode: z.string().min(1),
  mapName: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// API key validation (simple header-based auth for game servers)
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  // In production, compare against secure stored keys
  return apiKey === process.env.GAME_SERVER_API_KEY;
}

/**
 * GET /api/matches
 * List matches with optional filters
 */
export async function GET(request: NextRequest) {
  // Allow either a server API key or an authenticated dashboard user.
  if (!validateApiKey(request)) {
    const authResult = await requireApiPermission("view:matches");
    if (authResult instanceof Response) return authResult;
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const status = searchParams.get("status");
  const gameMode = searchParams.get("gameMode");
  const playerId = searchParams.get("playerId");

  const where: Prisma.MatchWhereInput = {};

  if (status) {
    where.status = status as Prisma.EnumMatchStatusFilter;
  }

  if (gameMode) {
    where.gameMode = gameMode;
  }

  if (playerId) {
    where.players = {
      some: { playerId: BigInt(playerId) },
    };
  }

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { players: true } },
      },
    }),
    prisma.match.count({ where }),
  ]);

  return NextResponse.json({
    matches: matches.map((m) => ({
      ...m,
      placeId: m.placeId?.toString(),
      playerCount: m._count.players,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * POST /api/matches
 * Create a new match (called by game servers)
 */
export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createMatchSchema.parse(body);

    // Check if match already exists
    const existing = await prisma.match.findUnique({
      where: { matchId: data.matchId },
    });

    if (existing) {
      return NextResponse.json({ error: "Match already exists", match: existing }, { status: 409 });
    }

    const match = await prisma.match.create({
      data: {
        matchId: data.matchId,
        serverId: data.serverId,
        placeId: data.placeId ? BigInt(data.placeId) : null,
        gameMode: data.gameMode,
        mapName: data.mapName,
        metadata: data.metadata as Prisma.InputJsonValue,
        status: "PENDING",
      },
    });

    return NextResponse.json({ match }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to create match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
