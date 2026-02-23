import { prisma } from "@/lib/db";
import { MatchStatus, type Prisma, type Match, type MatchPlayer } from "@prisma/client";
import { MatchesTable } from "./matches-table";
import { MatchFilters } from "./match-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { requirePermission } from "@/lib/authorize";

type MatchWithPlayers = Match & {
  players: Pick<MatchPlayer, "playerId" | "playerName" | "team" | "isWinner">[];
  _count: { players: number };
};

interface SearchParams {
  page?: string;
  status?: string;
  gameMode?: string;
  search?: string;
  gameId?: string;
}

const PAGE_SIZE = 20;

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("view:matches");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const status = params.status as MatchStatus | undefined;
  const gameMode = params.gameMode;
  const search = params.search;
  const gameId = params.gameId;

  // Build where clause
  const where: Prisma.MatchWhereInput = {};

  if (gameId) {
    where.gameId = gameId;
  }

  if (status) {
    where.status = status;
  }

  if (gameMode) {
    where.gameMode = gameMode;
  }

  if (search) {
    where.OR = [
      { matchId: { contains: search } },
      { serverId: { contains: search } },
      { players: { some: { playerName: { contains: search } } } },
    ];
  }

  // Fetch matches with pagination - with error handling for missing tables
  let matches: MatchWithPlayers[] = [];
  let totalCount = 0;
  let gameModes: { gameMode: string }[] = [];
  let dbError: string | null = null;

  try {
    [matches, totalCount, gameModes] = await Promise.all([
      prisma.match.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          players: {
            select: {
              playerId: true,
              playerName: true,
              team: true,
              isWinner: true,
            },
          },
          _count: {
            select: { players: true },
          },
        },
      }),
      prisma.match.count({ where }),
      prisma.match.findMany({
        select: { gameMode: true },
        distinct: ["gameMode"],
      }),
    ]);
  } catch (error) {
    console.error("Failed to fetch matches:", error);
    dbError =
      error instanceof Error
        ? error.message
        : "Database query failed. The Match table may not exist yet.";
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Match History</h1>
        <p className="text-muted-foreground">
          View and analyze completed matches across all game modes
        </p>
      </div>

      {dbError ? (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Database Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              The Match table has not been created yet. Run database migrations to enable match
              history:
            </p>
            <pre className="mt-2 rounded bg-muted p-2 text-xs">pnpm prisma db push</pre>
          </CardContent>
        </Card>
      ) : (
        <>
          <MatchFilters
            currentStatus={status}
            currentGameMode={gameMode}
            currentSearch={search}
            gameModes={gameModes.map((m) => m.gameMode)}
          />

          <MatchesTable
            matches={matches}
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
          />
        </>
      )}
    </div>
  );
}
