import { prisma } from "@/lib/db";
import { MatchStatus, type Prisma } from "@prisma/client";
import { MatchesTable } from "./matches-table";
import { MatchFilters } from "./match-filters";

interface SearchParams {
  page?: string;
  status?: string;
  gameMode?: string;
  search?: string;
}

const PAGE_SIZE = 20;

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const status = params.status as MatchStatus | undefined;
  const gameMode = params.gameMode;
  const search = params.search;

  // Build where clause
  const where: Prisma.MatchWhereInput = {};

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

  // Fetch matches with pagination
  const [matches, totalCount, gameModes] = await Promise.all([
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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Match History</h1>
        <p className="text-muted-foreground">
          View and analyze completed matches across all game modes
        </p>
      </div>

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
    </div>
  );
}
