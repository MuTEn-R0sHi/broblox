import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { auth } from "@/lib/auth";
import { hasPermission, type Role } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import {
  User,
  ShieldAlert,
  VolumeX,
  Swords,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

interface PlayerDetailPageProps {
  params: Promise<{ id: string }>;
}

function getBanStatusColor(status: string): "destructive" | "secondary" | "warning" | "success" {
  switch (status) {
    case "ACTIVE":
      return "destructive";
    case "EXPIRED":
      return "secondary";
    case "REVOKED":
      return "success";
    default:
      return "secondary";
  }
}

export default async function PlayerDetailPage({ params }: PlayerDetailPageProps) {
  await requirePermission("view:players");

  const { id } = await params;

  // Validate numeric Roblox user ID
  if (!/^\d+$/.test(id)) notFound();
  const playerId = BigInt(id);

  const session = await auth();
  const role = (session?.user as { role?: Role })?.role ?? "VIEWER";
  const canModerate = hasPermission(role, "moderation:ban");

  // Fetch all player data in parallel
  const [bans, mutes, appeals, matchPlayers] = await Promise.all([
    prisma.ban.findMany({
      where: { playerId },
      include: {
        issuedBy: { select: { name: true } },
        game: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mute.findMany({
      where: { playerId },
      include: {
        issuedBy: { select: { name: true } },
        game: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.appeal.findMany({
      where: { playerId },
      include: {
        ban: { select: { reason: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.matchPlayer.findMany({
      where: { playerId },
      include: {
        match: {
          select: {
            matchId: true,
            gameMode: true,
            mapName: true,
            status: true,
            outcome: true,
            startedAt: true,
            endedAt: true,
            game: { select: { name: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 25,
    }),
  ]);

  // Derive display name from the most recent record
  const displayName =
    bans[0]?.playerName ??
    mutes[0]?.playerName ??
    matchPlayers[0]?.playerName ??
    appeals[0]?.playerName ??
    null;

  const activeBans = bans.filter((b) => b.status === "ACTIVE");
  const activeMutes = mutes.filter((m) => m.isActive);
  const pendingAppeals = appeals.filter((a) => a.status === "PENDING");

  const totalMatches = matchPlayers.length;
  const totalKills = matchPlayers.reduce((s, mp) => s + mp.kills, 0);
  const totalDeaths = matchPlayers.reduce((s, mp) => s + mp.deaths, 0);
  const wins = matchPlayers.filter((mp) => mp.isWinner).length;

  return (
    <div className="space-y-8">
      {/* Back link + header */}
      <div className="flex items-start gap-4">
        <Link href="/players" className="mt-1.5">
          <ArrowLeft className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {displayName ?? "Unknown Player"}
              </h1>
              <p className="text-muted-foreground">Roblox User ID: {id}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`https://www.roblox.com/users/${id}/profile`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
          >
            Roblox Profile <ExternalLink className="h-3 w-3" />
          </a>
          {canModerate && (
            <>
              <Link
                href={`/moderation/bans/new?playerId=${id}&playerName=${encodeURIComponent(displayName ?? "")}`}
              >
                <Button variant="destructive" size="sm">
                  Ban Player
                </Button>
              </Link>
              <Link
                href={`/moderation/mutes/new?playerId=${id}&playerName=${encodeURIComponent(displayName ?? "")}`}
              >
                <Button variant="outline" size="sm">
                  Mute Player
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{activeBans.length}</p>
                <p className="text-xs text-muted-foreground">
                  Active ban{activeBans.length !== 1 ? "s" : ""} ({bans.length} total)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <VolumeX className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{activeMutes.length}</p>
                <p className="text-xs text-muted-foreground">
                  Active mute{activeMutes.length !== 1 ? "s" : ""} ({mutes.length} total)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Swords className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalMatches}</p>
                <p className="text-xs text-muted-foreground">
                  Match{totalMatches !== 1 ? "es" : ""} ({wins}W / {totalMatches - wins}L)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{pendingAppeals.length}</p>
                <p className="text-xs text-muted-foreground">
                  Pending appeal{pendingAppeals.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ban History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" />
            Ban History ({bans.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bans on record.</p>
          ) : (
            <div className="divide-y">
              {bans.map((ban) => (
                <div key={ban.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getBanStatusColor(ban.status)}>{ban.status}</Badge>
                        <Badge variant="outline">{ban.type}</Badge>
                        {ban.game && <Badge variant="secondary">{ban.game.name}</Badge>}
                        {!ban.game && <Badge variant="secondary">Global</Badge>}
                      </div>
                      <p className="text-sm">{ban.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Issued by {ban.issuedBy.name ?? "Unknown"} ·{" "}
                        {formatDistanceToNow(ban.createdAt, { addSuffix: true })}
                        {ban.expiresAt && (
                          <> · Expires {format(ban.expiresAt, "MMM d, yyyy 'at' h:mm a")}</>
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/moderation/bans/${ban.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mute History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <VolumeX className="h-4 w-4" />
            Mute History ({mutes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mutes on record.</p>
          ) : (
            <div className="divide-y">
              {mutes.map((mute) => (
                <div key={mute.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={mute.isActive ? "warning" : "secondary"}>
                          {mute.isActive ? "ACTIVE" : "EXPIRED"}
                        </Badge>
                        <Badge variant="outline">{mute.type}</Badge>
                        {mute.game && <Badge variant="secondary">{mute.game.name}</Badge>}
                        {!mute.game && <Badge variant="secondary">Global</Badge>}
                      </div>
                      <p className="text-sm">{mute.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Issued by {mute.issuedBy.name ?? "Unknown"} ·{" "}
                        {formatDistanceToNow(mute.createdAt, {
                          addSuffix: true,
                        })}
                        {mute.isPermanent
                          ? " · Permanent"
                          : mute.expiresAt
                            ? ` · Expires ${format(mute.expiresAt, "MMM d, yyyy 'at' h:mm a")}`
                            : ` · ${mute.durationMinutes}m duration`}
                      </p>
                    </div>
                    <Link
                      href={`/moderation/mutes/${mute.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appeals */}
      {appeals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4" />
              Appeals ({appeals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {appeals.map((appeal) => (
                <div key={appeal.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            appeal.status === "PENDING"
                              ? "warning"
                              : appeal.status === "APPROVED"
                                ? "success"
                                : "destructive"
                          }
                        >
                          {appeal.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Ban: {appeal.ban.reason.slice(0, 60)}
                          {appeal.ban.reason.length > 60 ? "…" : ""}
                        </span>
                      </div>
                      <p className="text-sm">{appeal.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted{" "}
                        {formatDistanceToNow(appeal.createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <Link
                      href={`/moderation/appeals/${appeal.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Swords className="h-4 w-4" />
            Recent Matches ({totalMatches})
            {totalMatches > 0 && (
              <span className="text-xs font-normal text-muted-foreground ml-1">
                K/D: {totalKills}/{totalDeaths} (
                {totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matchPlayers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matches on record.</p>
          ) : (
            <div className="divide-y">
              {matchPlayers.map((mp) => (
                <div
                  key={mp.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={mp.isWinner ? "success" : "secondary"}>
                        {mp.isWinner ? "WIN" : "LOSS"}
                      </Badge>
                      <span className="text-sm font-medium">{mp.match.gameMode}</span>
                      {mp.match.mapName && (
                        <span className="text-xs text-muted-foreground">{mp.match.mapName}</span>
                      )}
                      {mp.match.game && (
                        <Badge variant="outline" className="text-xs">
                          {mp.match.game.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {mp.kills}K / {mp.deaths}D / {mp.assists}A · Score: {mp.score}
                      {mp.team && ` · Team ${mp.team}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {mp.match.startedAt
                        ? formatDistanceToNow(mp.match.startedAt, {
                            addSuffix: true,
                          })
                        : formatDistanceToNow(mp.joinedAt, {
                            addSuffix: true,
                          })}
                    </p>
                    <Link
                      href={`/matches/${mp.match.matchId}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
