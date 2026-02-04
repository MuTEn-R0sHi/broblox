import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Plus } from "lucide-react";
import { MuteFilters } from "./filters";

interface SearchParams {
  status?: string;
  search?: string;
  page?: string;
}

type MuteStatus = "ACTIVE" | "EXPIRED" | "INACTIVE";

function getMuteStatus(mute: { isActive: boolean; expiresAt: Date }): MuteStatus {
  if (!mute.isActive) return "INACTIVE";
  if (mute.expiresAt <= new Date()) return "EXPIRED";
  return "ACTIVE";
}

async function getMutes(params: SearchParams) {
  const page = Number(params.page) || 1;
  const perPage = 25;

  const now = new Date();

  const where: {
    isActive?: boolean;
    expiresAt?: { lte?: Date; gt?: Date };
    OR?: Array<{
      playerName?: { contains: string };
      reason?: { contains: string };
      playerId?: bigint;
    }>;
  } = {};

  if (params.status && params.status !== "all") {
    switch (params.status) {
      case "ACTIVE":
        where.isActive = true;
        where.expiresAt = { gt: now };
        break;
      case "EXPIRED":
        where.expiresAt = { lte: now };
        break;
      case "INACTIVE":
        where.isActive = false;
        break;
      default:
        break;
    }
  }

  if (params.search) {
    let searchId: bigint | null = null;
    try {
      if (/^\d+$/.test(params.search)) {
        searchId = BigInt(params.search);
      }
    } catch {
      searchId = null;
    }

    where.OR = [
      { playerName: { contains: params.search } },
      { reason: { contains: params.search } },
    ];
    if (searchId) {
      where.OR.push({ playerId: searchId });
    }
  }

  const [mutes, total] = await Promise.all([
    prisma.mute.findMany({
      where,
      include: {
        issuedBy: { select: { name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.mute.count({ where }),
  ]);

  return { mutes, total, page, perPage };
}

function getMuteStatusColor(status: MuteStatus): "destructive" | "secondary" | "warning" {
  switch (status) {
    case "ACTIVE":
      return "destructive";
    case "EXPIRED":
      return "secondary";
    case "INACTIVE":
      return "warning";
  }
}

export default async function MutesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePermission("moderation:view");

  const params = await searchParams;
  const { mutes, total, page, perPage } = await getMutes(params);
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mutes</h1>
          <p className="text-muted-foreground">Manage player mutes ({total} total)</p>
        </div>
        <Link href="/dashboard/moderation/mutes/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Mute
          </Button>
        </Link>
      </div>

      <MuteFilters />

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Player</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Reason</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Expires</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Moderator
                </th>
              </tr>
            </thead>
            <tbody>
              {mutes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    No mutes found.
                  </td>
                </tr>
              ) : (
                mutes.map((mute) => {
                  const status = getMuteStatus({
                    isActive: mute.isActive,
                    expiresAt: mute.expiresAt,
                  });
                  return (
                    <tr
                      key={mute.id}
                      className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
                    >
                      <td className="p-4">
                        <Link
                          href={`/dashboard/moderation/mutes/${mute.id}`}
                          className="font-medium hover:underline"
                        >
                          {mute.playerName ?? `Player ${mute.playerId}`}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          ID: {mute.playerId.toString()}
                        </p>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="truncate text-sm">{mute.reason}</p>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">{mute.type}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {mute.durationMinutes}m
                        </p>
                      </td>
                      <td className="p-4">
                        <Badge variant={getMuteStatusColor(status)}>{status}</Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDistanceToNow(mute.expiresAt, { addSuffix: true })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {mute.issuedBy.image && (
                            <img
                              src={mute.issuedBy.image}
                              alt=""
                              className="h-6 w-6 rounded-full"
                            />
                          )}
                          <span className="text-sm">{mute.issuedBy.name}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-zinc-800">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}${params.status ? `&status=${params.status}` : ""}${params.search ? `&search=${params.search}` : ""}`}
                  >
                    <Button variant="outline" size="sm">
                      Previous
                    </Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}${params.status ? `&status=${params.status}` : ""}${params.search ? `&search=${params.search}` : ""}`}
                  >
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
