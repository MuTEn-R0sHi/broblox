import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { hasPermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Gamepad2,
  Flag,
  Shield,
  Trophy,
  Activity,
  Users,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { getGame } from "../actions";
import { EditGameButton } from "./edit-game";

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requirePermission("games:view");

  const game = await getGame(id);
  if (!game) notFound();

  const canManage = hasPermission(user.role, "games:manage");
  const canDelete = hasPermission(user.role, "games:delete");
  const canViewFlags = hasPermission(user.role, "view:flags");
  const canViewMatches = hasPermission(user.role, "view:matches");
  const canViewMod = hasPermission(user.role, "moderation:view");

  // Pull scoped live stats
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [enabledFlagCount, activeBans, recentMatches, recentServers] = await Promise.all([
    prisma.featureFlag.count({
      where: {
        gameId: id,
        OR: [{ enabledDev: true }, { enabledStage: true }, { enabledProd: true }],
      },
    }),
    prisma.ban.count({
      where: { gameId: id, status: "ACTIVE" },
    }),
    prisma.match.count({
      where: { gameId: id, startedAt: { gte: oneDayAgo } },
    }),
    prisma.telemetryEvent.groupBy({
      by: ["serverId"],
      where: {
        placeId: game.placeIdProd ? BigInt(game.placeIdProd) : undefined,
        ingestedAt: { gte: oneHourAgo },
        serverId: { not: null },
      },
    }),
  ]);

  const envLinks: Array<{ label: string; universeId: string | null; placeId: string | null }> = [
    { label: "Dev", universeId: game.universeIdDev, placeId: game.placeIdDev },
    { label: "Stage", universeId: game.universeIdStage, placeId: game.placeIdStage },
    { label: "Prod", universeId: game.universeIdProd, placeId: game.placeIdProd },
  ];

  const linkedEnvCount = envLinks.filter((e) => e.universeId).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {game.iconUrl ? (
            <img src={game.iconUrl} alt={game.name} className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Gamepad2 className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{game.name}</h1>
              {game.isActive ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="outline" className="text-zinc-500">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground font-mono text-sm mt-0.5">{game.slug}</p>
            {game.description && (
              <p className="text-sm text-muted-foreground mt-1">{game.description}</p>
            )}
          </div>
        </div>
        <EditGameButton game={game} canManage={canManage} canDelete={canDelete} />
      </div>

      {/* Environment links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roblox Identifiers</CardTitle>
        </CardHeader>
        <CardContent>
          {linkedEnvCount === 0 && (
            <div className="flex items-center gap-2 text-yellow-500 text-sm mb-3">
              <AlertTriangle className="h-4 w-4" />
              <span>No Roblox universe IDs linked — flags and moderation bridges are inactive</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            {envLinks.map(({ label, universeId, placeId }) => (
              <div key={label} className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {label}
                </p>
                <div>
                  <p className="text-xs text-muted-foreground">Universe ID</p>
                  <p className="text-sm font-mono">
                    {universeId ? (
                      <a
                        href={`https://www.roblox.com/games/${universeId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        {universeId} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Place ID</p>
                  <p className="text-sm font-mono">
                    {placeId ?? <span className="text-muted-foreground">—</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Flags (this game)</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{game._count?.flags ?? 0}</div>
            <p className="text-xs text-muted-foreground">{enabledFlagCount} currently enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Matches (24h)</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentMatches}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Bans</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBans}</div>
            <p className="text-xs text-muted-foreground">In this game</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Live Servers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentServers.length}</div>
            <p className="text-xs text-muted-foreground">Seen last hour</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links to scoped sections */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canViewFlags && (
          <Link href={`/dashboard/flags?gameId=${id}`}>
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Flag className="h-4 w-4" /> Feature Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage flags scoped to {game.name} (+ global flags).
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {canViewMatches && (
          <Link href={`/dashboard/matches?gameId=${id}`}>
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4" /> Match History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View and filter matches for {game.name}.
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {canViewMod && (
          <Link href={`/dashboard/moderation?gameId=${id}`}>
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Moderation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Bans and mutes scoped to {game.name}.
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href={`/dashboard/players?gameId=${id}`}>
          <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Look up players seen in {game.name}.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/dashboard/audit?gameId=${id}`}>
          <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" /> Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Operator actions scoped to {game.name}.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* API usage hint */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Flags API Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Fetch flags scoped to this game from a Roblox game server using its universe ID:
          </p>
          <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs font-mono overflow-x-auto whitespace-pre">
            {`-- Fetch only flags for this game (plus global flags)
-- Replace <universeId> with this game's Roblox universe ID

local HttpService = game:GetService("HttpService")
local response = HttpService:RequestAsync({
    Url = "https://rbx-dashboard.vercel.app/api/flags/prod?universeId=<universeId>",
    Method = "GET",
    Headers = { ["x-api-key"] = "your-api-key" }
})
local data = HttpService:JSONDecode(response.Body)
-- data.flags → { key = enabled, ... } for this game only`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
