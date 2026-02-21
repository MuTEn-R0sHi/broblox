import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateApiKey, checkRateLimit, getRateLimitKey } from "@/lib/authorize";

type Environment = "dev" | "stage" | "prod";

const envFieldMap = {
  dev: "enabledDev",
  stage: "enabledStage",
  prod: "enabledProd",
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ environment: string }> }
) {
  const { environment } = await params;

  // Validate environment
  if (!["dev", "stage", "prod"].includes(environment)) {
    return NextResponse.json({ error: "Invalid environment" }, { status: 400 });
  }

  // Timing-safe API key check
  if (!validateApiKey(request, "FLAGS_API_KEY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  if (!checkRateLimit(getRateLimitKey(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const env = environment as Environment;
  const field = envFieldMap[env];

  // Optional game scoping: ?gameId=<cuid> or ?universeId=<roblox_universe_id>
  // When provided, returns flags scoped to that game + global (null gameId) flags.
  // Game-specific flags shadow global flags with the same key.
  // When omitted, returns all flags (backward-compatible for single-game setups).
  const { searchParams } = request.nextUrl;
  const gameIdParam = searchParams.get("gameId");
  const universeIdParam = searchParams.get("universeId");

  let resolvedGameId: string | null = null;

  if (gameIdParam) {
    resolvedGameId = gameIdParam;
  } else if (universeIdParam) {
    // Resolve game by its Roblox universe ID for this environment
    const universeIdBigInt = BigInt(universeIdParam);
    const envUniverseField =
      env === "dev" ? "universeIdDev" : env === "stage" ? "universeIdStage" : "universeIdProd";
    const game = await prisma.game.findFirst({
      where: { [envUniverseField]: universeIdBigInt, isActive: true },
      select: { id: true },
    });
    resolvedGameId = game?.id ?? null;
  }

  // Build flag query
  const flagWhere = resolvedGameId ? { OR: [{ gameId: resolvedGameId }, { gameId: null }] } : {};

  const flags = await prisma.featureFlag.findMany({
    where: flagWhere,
    select: {
      key: true,
      gameId: true,
      [field]: true,
      value: true,
    },
  });

  // Merge: game-specific flags shadow global (null gameId) flags with the same key
  const globalEntries: Record<string, boolean | unknown> = {};
  const gameEntries: Record<string, boolean | unknown> = {};

  for (const flag of flags) {
    const enabled = flag[field] as boolean;
    const value = flag.value && enabled ? flag.value : enabled;
    if (flag.gameId) {
      gameEntries[flag.key] = value;
    } else {
      globalEntries[flag.key] = value;
    }
  }

  return NextResponse.json({
    environment: env,
    gameId: resolvedGameId,
    flags: { ...globalEntries, ...gameEntries },
    fetchedAt: new Date().toISOString(),
  });
}
