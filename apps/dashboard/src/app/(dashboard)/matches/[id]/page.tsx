import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Clock,
  Server,
  Trophy,
  Target,
  Skull,
  Swords,
  Medal,
  Calendar,
} from "lucide-react";
import type { MatchStatus, MatchOutcome } from "@prisma/client";

interface MatchDetailPageProps {
  params: Promise<{ id: string }>;
}

function getStatusBadge(status: MatchStatus) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary">Pending</Badge>;
    case "IN_PROGRESS":
      return <Badge variant="warning">In Progress</Badge>;
    case "COMPLETED":
      return <Badge variant="success">Completed</Badge>;
    case "CANCELLED":
      return <Badge variant="outline">Cancelled</Badge>;
    case "ERRORED":
      return <Badge variant="destructive">Errored</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getOutcomeText(outcome: MatchOutcome | null): string {
  if (!outcome) return "In Progress";
  switch (outcome) {
    case "TEAM_A_WIN":
      return "Team A Victory";
    case "TEAM_B_WIN":
      return "Team B Victory";
    case "DRAW":
      return "Draw";
    case "CANCELLED":
      return "Match Cancelled";
    case "INCOMPLETE":
      return "Match Incomplete";
    default:
      return outcome;
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatDateTime(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = await params;

  let match;
  try {
    match = await prisma.match.findUnique({
      where: { id },
      include: {
        players: {
          orderBy: [{ team: "asc" }, { score: "desc" }],
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch match:", error);
    notFound();
  }

  if (!match) {
    notFound();
  }

  const teamAPlayers = match.players.filter((p) => p.team === "A");
  const teamBPlayers = match.players.filter((p) => p.team === "B");
  const unassignedPlayers = match.players.filter((p) => !p.team);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/matches">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Match Details</h1>
            {getStatusBadge(match.status)}
          </div>
          <p className="text-muted-foreground font-mono text-sm">{match.matchId}</p>
        </div>
      </div>

      {/* Match Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Game Mode</CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{match.gameMode}</div>
            {match.mapName && <p className="text-xs text-muted-foreground">{match.mapName}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Final Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {match.teamAScore} - {match.teamBScore}
            </div>
            <p className="text-xs text-muted-foreground">{getOutcomeText(match.outcome)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(match.durationSecs)}</div>
            <p className="text-xs text-muted-foreground">{match.players.length} players</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono truncate">{match.serverId?.slice(0, 16) ?? "-"}</div>
            <p className="text-xs text-muted-foreground">
              Place: {match.placeId?.toString() ?? "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="font-medium">{formatDateTime(match.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Started</p>
              <p className="font-medium">{formatDateTime(match.startedAt)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ended</p>
              <p className="font-medium">{formatDateTime(match.endedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Team A */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Team A</span>
              {match.outcome === "TEAM_A_WIN" && (
                <Badge variant="success">
                  <Medal className="h-3 w-3 mr-1" />
                  Winner
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Score: {match.teamAScore} • {teamAPlayers.length} players
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <PlayerTable players={teamAPlayers} />
          </CardContent>
        </Card>

        {/* Team B */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Team B</span>
              {match.outcome === "TEAM_B_WIN" && (
                <Badge variant="success">
                  <Medal className="h-3 w-3 mr-1" />
                  Winner
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Score: {match.teamBScore} • {teamBPlayers.length} players
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <PlayerTable players={teamBPlayers} />
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Players (FFA modes) */}
      {unassignedPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Players</CardTitle>
            <CardDescription>{unassignedPlayers.length} participants</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <PlayerTable players={unassignedPlayers} />
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {match.metadata && (
        <Card>
          <CardHeader>
            <CardTitle>Match Metadata</CardTitle>
            <CardDescription>Additional match configuration and data</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="rounded-lg bg-muted p-4 text-sm overflow-auto">
              {JSON.stringify(match.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface PlayerTableProps {
  players: {
    id: string;
    playerId: bigint;
    playerName: string | null;
    isWinner: boolean;
    kills: number;
    deaths: number;
    assists: number;
    score: number;
  }[];
}

function PlayerTable({ players }: PlayerTableProps) {
  if (players.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">No players in this team</div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead className="text-center">
            <span title="Kills">
              <Target className="h-4 w-4 inline" />
            </span>
          </TableHead>
          <TableHead className="text-center">
            <span title="Deaths">
              <Skull className="h-4 w-4 inline" />
            </span>
          </TableHead>
          <TableHead className="text-center">A</TableHead>
          <TableHead className="text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => (
          <TableRow key={player.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {player.isWinner && <Trophy className="h-4 w-4 text-yellow-500" />}
                <div>
                  <p className="font-medium">{player.playerName ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">ID: {player.playerId.toString()}</p>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-center font-medium">{player.kills}</TableCell>
            <TableCell className="text-center">{player.deaths}</TableCell>
            <TableCell className="text-center">{player.assists}</TableCell>
            <TableCell className="text-right font-bold">{player.score}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
