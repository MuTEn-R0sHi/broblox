import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Plus, Shield, AlertTriangle, Clock } from "lucide-react";

async function getModerationStats() {
  const [activeBans, pendingAppeals, recentMutes] = await Promise.all([
    prisma.ban.count({ where: { status: "ACTIVE" } }),
    prisma.appeal.count({ where: { status: "PENDING" } }),
    prisma.mute.count({
      where: {
        isActive: true,
        OR: [{ isPermanent: true }, { expiresAt: { gt: new Date() } }],
      },
    }),
  ]);

  return { activeBans, pendingAppeals, recentMutes };
}

async function getRecentBans() {
  return prisma.ban.findMany({
    include: {
      issuedBy: { select: { name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

async function getPendingAppeals() {
  return prisma.appeal.findMany({
    where: { status: "PENDING" },
    include: {
      ban: { select: { reason: true, type: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
}

function getBanStatusColor(status: string): "destructive" | "secondary" | "warning" | "success" {
  switch (status) {
    case "ACTIVE":
      return "destructive";
    case "EXPIRED":
      return "secondary";
    case "REVOKED":
      return "warning";
    case "APPEALED":
      return "success";
    default:
      return "secondary";
  }
}

export default async function ModerationPage() {
  await requirePermission("moderation:view");

  const [stats, recentBans, pendingAppeals] = await Promise.all([
    getModerationStats(),
    getRecentBans(),
    getPendingAppeals(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Moderation</h1>
          <p className="text-muted-foreground">Manage player bans, mutes, and appeals</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/moderation/bans/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Ban
            </Button>
          </Link>
          <Link href="/moderation/mutes/new">
            <Button variant="outline">New Mute</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Bans</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBans}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Appeals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAppeals}</div>
            {stats.pendingAppeals > 0 && (
              <Link
                href="/moderation/appeals"
                className="text-xs text-muted-foreground hover:underline"
              >
                Review appeals →
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Mutes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentMutes}</div>
            {stats.recentMutes > 0 && (
              <Link
                href="/moderation/mutes"
                className="text-xs text-muted-foreground hover:underline"
              >
                View mutes →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Recent Bans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Bans</CardTitle>
            <Link href="/moderation/bans">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentBans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bans yet.</p>
            ) : (
              <div className="space-y-4">
                {recentBans.map((ban) => (
                  <Link
                    key={ban.id}
                    href={`/dashboard/moderation/bans/${ban.id}`}
                    className="flex items-center justify-between py-2 hover:bg-zinc-800/50 rounded px-2 -mx-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {ban.playerName ?? `Player ${ban.playerId}`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{ban.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getBanStatusColor(ban.status)}>{ban.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(ban.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Appeals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Appeals</CardTitle>
            <Link href="/moderation/appeals">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingAppeals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending appeals.</p>
            ) : (
              <div className="space-y-4">
                {pendingAppeals.map((appeal) => (
                  <Link
                    key={appeal.id}
                    href={`/dashboard/moderation/appeals/${appeal.id}`}
                    className="flex items-center justify-between py-2 hover:bg-zinc-800/50 rounded px-2 -mx-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {appeal.playerName ?? `Player ${appeal.playerId}`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{appeal.reason}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(appeal.createdAt, { addSuffix: true })}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
