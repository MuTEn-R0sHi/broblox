"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Eye, Users, Trophy, Clock } from "lucide-react";
import type { Match, MatchPlayer, MatchStatus, MatchOutcome } from "@prisma/client";

type MatchWithPlayers = Match & {
  players: Pick<MatchPlayer, "playerId" | "playerName" | "team" | "isWinner">[];
  _count: { players: number };
};

interface MatchesTableProps {
  matches: MatchWithPlayers[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
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

function _getOutcomeBadge(outcome: MatchOutcome | null) {
  if (!outcome) return null;

  switch (outcome) {
    case "TEAM_A_WIN":
      return <Badge variant="default">Team A Won</Badge>;
    case "TEAM_B_WIN":
      return <Badge variant="default">Team B Won</Badge>;
    case "DRAW":
      return <Badge variant="secondary">Draw</Badge>;
    case "CANCELLED":
      return <Badge variant="outline">Cancelled</Badge>;
    case "INCOMPLETE":
      return <Badge variant="destructive">Incomplete</Badge>;
    default:
      return null;
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function MatchesTable({ matches, currentPage, totalPages, totalCount }: MatchesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/matches?${params.toString()}`);
  };

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No matches found</h3>
          <p className="text-muted-foreground text-sm">
            Try adjusting your filters or check back later
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base font-medium flex items-center justify-between">
            <span>{totalCount.toLocaleString()} matches</span>
            <span className="text-sm font-normal text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match ID</TableHead>
                <TableHead>Game Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>
                  <Users className="h-4 w-4" />
                </TableHead>
                <TableHead>
                  <Clock className="h-4 w-4" />
                </TableHead>
                <TableHead>Started</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => (
                <TableRow key={match.id}>
                  <TableCell className="font-mono text-sm">
                    {match.matchId.slice(0, 12)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{match.gameMode}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(match.status)}</TableCell>
                  <TableCell>
                    {match.status === "COMPLETED" ? (
                      <span className="font-medium">
                        {match.teamAScore} - {match.teamBScore}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{match._count.players}</TableCell>
                  <TableCell>{formatDuration(match.durationSecs)}</TableCell>
                  <TableCell>{formatDate(match.startedAt)}</TableCell>
                  <TableCell>
                    <Link href={`/matches/${match.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="icon"
                  onClick={() => goToPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
