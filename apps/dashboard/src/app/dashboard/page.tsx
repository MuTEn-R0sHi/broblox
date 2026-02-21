import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag, Users, Shield, Activity, Gamepad2, Trophy, ChevronRight } from "lucide-react";

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    // Prisma: P2021 = table does not exist
    (error as { code?: string }).code === "P2021"
  );
}

export default async function DashboardPage() {
  const { user } = await requirePermission("view:dashboard");

  // Fetch real stats from database
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  let dbNotInitialized = false;

  let games: Array<{
    id: string;
    name: string;
    universeIdDev: bigint | null;
    universeIdStage: bigint | null;
    universeIdProd: bigint | null;
    _count: { flags: number; matches: number; bans: number };
  }> = [];
  try {
    games = await prisma.game.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { flags: true, matches: true, bans: true } } },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      dbNotInitialized = true;
    } else {
      throw error;
    }
  }

  let flagCount = 0;
  let enabledFlagCount = 0;
  try {
    [flagCount, enabledFlagCount] = await Promise.all([
      prisma.featureFlag.count(),
      prisma.featureFlag.count({
        where: {
          OR: [{ enabledDev: true }, { enabledStage: true }, { enabledProd: true }],
        },
      }),
    ]);
  } catch (error) {
    if (isMissingTableError(error)) {
      dbNotInitialized = true;
    } else {
      throw error;
    }
  }

  let modActions = 0;
  try {
    modActions = await prisma.ban.count({ where: { createdAt: { gte: oneDayAgo } } });
  } catch (error) {
    if (isMissingTableError(error)) {
      dbNotInitialized = true;
      modActions = 0;
    } else {
      throw error;
    }
  }

  let uniquePlayers: Array<{ playerId: bigint | null }> = [];
  let activeServers: Array<{ serverId: string | null }> = [];
  let recentEvents: Array<{
    id: string;
    category: string;
    name: string;
    level: string;
    ingestedAt: Date;
    serverId: string | null;
  }> = [];

  try {
    [uniquePlayers, recentEvents, activeServers] = await Promise.all([
      prisma.telemetryEvent.groupBy({
        by: ["playerId"],
        where: {
          playerId: { not: null },
          ingestedAt: { gte: oneHourAgo },
        },
      }),
      prisma.telemetryEvent.findMany({
        where: { level: { in: ["info", "warn", "error"] } },
        orderBy: { ingestedAt: "desc" },
        take: 5,
      }),
      prisma.telemetryEvent.groupBy({
        by: ["serverId"],
        where: {
          serverId: { not: null },
          ingestedAt: { gte: oneHourAgo },
        },
      }),
    ]);
  } catch (error) {
    if (isMissingTableError(error)) {
      dbNotInitialized = true;
      uniquePlayers = [];
      recentEvents = [];
      activeServers = [];
    } else {
      throw error;
    }
  }

  const stats = [
    {
      name: "Games",
      value: games.length.toString(),
      description: "Registered experiences",
      icon: Gamepad2,
    },
    {
      name: "Feature Flags",
      value: flagCount.toString(),
      description: `${enabledFlagCount} enabled`,
      icon: Flag,
    },
    {
      name: "Active Players",
      value: uniquePlayers.length.toString(),
      description: "Last hour (all games)",
      icon: Users,
    },
    {
      name: "Active Servers",
      value: activeServers.length.toString(),
      description: "Last hour (all games)",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name ?? "Operator"}</p>
        {dbNotInitialized ? (
          <p className="text-sm text-muted-foreground">
            Database schema is not initialized. Run `pnpm prisma db push` against the connected
            database.
          </p>
        ) : null}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Games Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Games</h2>
          <Link
            href="/dashboard/games"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {games.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Gamepad2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No games registered yet.{" "}
                <Link href="/dashboard/games" className="underline hover:text-foreground">
                  Register your first game →
                </Link>
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => {
              const linkedEnvs = [
                game.universeIdDev ? "dev" : null,
                game.universeIdStage ? "stage" : null,
                game.universeIdProd ? "prod" : null,
              ].filter(Boolean);
              return (
                <Link key={game.id} href={`/dashboard/games/${game.id}`}>
                  <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="h-4 w-4 text-primary" />
                          <CardTitle className="text-sm">{game.name}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          {linkedEnvs.map((env) => (
                            <Badge key={env} variant="secondary" className="text-xs px-1.5">
                              {env}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Flag className="h-3 w-3" /> {game._count.flags} flags
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> {game._count.matches} matches
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" /> {game._count.bans} bans
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest telemetry events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No events yet. Connect game servers with HttpSink to see activity.
                </p>
              ) : (
                recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-4">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        event.level === "error"
                          ? "bg-red-500"
                          : event.level === "warn"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {event.category}:{event.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.ingestedAt.toLocaleString()}
                        {event.serverId ? ` · ${event.serverId.slice(0, 8)}` : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environments</CardTitle>
            <CardDescription>Current deployment status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="font-medium">Development</span>
                </div>
                <span className="text-sm text-muted-foreground">v0.1.0-dev</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="font-medium">Staging</span>
                </div>
                <span className="text-sm text-muted-foreground">v0.1.0</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="font-medium">Production</span>
                </div>
                <span className="text-sm text-muted-foreground">v0.1.0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
