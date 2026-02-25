import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Search, User, ShieldAlert, VolumeX, Swords } from "lucide-react";

interface PlayersPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  await requirePermission("view:players");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  // Search by Roblox ID (numeric) or player name
  const results: Array<{
    playerId: bigint;
    playerName: string | null;
    banCount: number;
    muteCount: number;
    matchCount: number;
    lastSeen: Date | null;
  }> = [];

  if (query) {
    const isNumeric = /^\d+$/.test(query);

    // Find distinct playerIds from bans, mutes, and match participation
    const playerIds = new Set<bigint>();
    const playerNames = new Map<bigint, string | null>();

    if (isNumeric) {
      const pid = BigInt(query);
      // Check if this player exists in any table
      const [ban, mute, mp] = await Promise.all([
        prisma.ban.findFirst({
          where: { playerId: pid },
          select: { playerId: true, playerName: true },
        }),
        prisma.mute.findFirst({
          where: { playerId: pid },
          select: { playerId: true, playerName: true },
        }),
        prisma.matchPlayer.findFirst({
          where: { playerId: pid },
          select: { playerId: true, playerName: true },
        }),
      ]);
      if (ban) {
        playerIds.add(ban.playerId);
        playerNames.set(ban.playerId, ban.playerName);
      }
      if (mute) {
        playerIds.add(mute.playerId);
        playerNames.set(mute.playerId, mute.playerName);
      }
      if (mp) {
        playerIds.add(mp.playerId);
        playerNames.set(mp.playerId, mp.playerName);
      }

      // Even if not found anywhere, allow viewing — they may just have no history
      if (playerIds.size === 0) {
        playerIds.add(pid);
        playerNames.set(pid, null);
      }
    } else {
      // Search by name across bans, mutes, match players
      const [bans, mutes, mps] = await Promise.all([
        prisma.ban.findMany({
          where: { playerName: { contains: query } },
          select: { playerId: true, playerName: true },
          take: 50,
        }),
        prisma.mute.findMany({
          where: { playerName: { contains: query } },
          select: { playerId: true, playerName: true },
          take: 50,
        }),
        prisma.matchPlayer.findMany({
          where: { playerName: { contains: query } },
          select: { playerId: true, playerName: true },
          take: 50,
        }),
      ]);

      for (const r of [...bans, ...mutes, ...mps]) {
        playerIds.add(r.playerId);
        if (r.playerName) playerNames.set(r.playerId, r.playerName);
      }
    }

    // Gather stats for each player
    for (const pid of playerIds) {
      const [banCount, muteCount, matchCount, lastMatch] = await Promise.all([
        prisma.ban.count({ where: { playerId: pid } }),
        prisma.mute.count({ where: { playerId: pid } }),
        prisma.matchPlayer.count({ where: { playerId: pid } }),
        prisma.matchPlayer.findFirst({
          where: { playerId: pid },
          orderBy: { joinedAt: "desc" },
          select: { joinedAt: true },
        }),
      ]);

      results.push({
        playerId: pid,
        playerName: playerNames.get(pid) ?? null,
        banCount,
        muteCount,
        matchCount,
        lastSeen: lastMatch?.joinedAt ?? null,
      });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Players</h1>
        <p className="text-muted-foreground">Search and view player history</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                type="text"
                defaultValue={query}
                placeholder="Search by Roblox User ID or player name..."
                className="w-full rounded-md border bg-background pl-10 pr-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" variant="default" size="sm">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {query && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No players found. Try a different Roblox User ID or name.
              </p>
            ) : (
              <div className="divide-y">
                {results.map((player) => (
                  <Link
                    key={player.playerId.toString()}
                    href={`/players/${player.playerId.toString()}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{player.playerName ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {player.playerId.toString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {player.banCount > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          {player.banCount} ban{player.banCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {player.muteCount > 0 && (
                        <Badge variant="warning" className="gap-1">
                          <VolumeX className="h-3 w-3" />
                          {player.muteCount} mute{player.muteCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {player.matchCount > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <Swords className="h-3 w-3" />
                          {player.matchCount} match{player.matchCount !== 1 ? "es" : ""}
                        </Badge>
                      )}
                      {player.lastSeen && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(player.lastSeen, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
