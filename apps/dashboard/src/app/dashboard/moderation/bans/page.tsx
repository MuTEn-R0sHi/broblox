import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Plus } from "lucide-react";
import { BanFilters } from "./filters";

interface SearchParams {
  status?: string;
  search?: string;
  page?: string;
}

async function getBans(params: SearchParams) {
  const page = Number(params.page) || 1;
  const perPage = 25;

  const where: {
    status?: "ACTIVE" | "EXPIRED" | "REVOKED" | "APPEALED";
    OR?: Array<{
      playerName?: { contains: string };
      playerId?: bigint;
      reason?: { contains: string };
    }>;
  } = {};

  if (params.status && params.status !== "all") {
    where.status = params.status as "ACTIVE" | "EXPIRED" | "REVOKED" | "APPEALED";
  }

  if (params.search) {
    const searchNum = BigInt(params.search).valueOf?.() || null;
    where.OR = [
      { playerName: { contains: params.search } },
      { reason: { contains: params.search } },
    ];
    if (searchNum) {
      where.OR.push({ playerId: searchNum });
    }
  }

  const [bans, total] = await Promise.all([
    prisma.ban.findMany({
      where,
      include: {
        issuedBy: { select: { name: true, image: true } },
        _count: { select: { appeals: true, evidence: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.ban.count({ where }),
  ]);

  return { bans, total, page, perPage };
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

export default async function BansPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePermission("moderation:view");

  const params = await searchParams;
  const { bans, total, page, perPage } = await getBans(params);
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bans</h1>
          <p className="text-muted-foreground">Manage player bans ({total} total)</p>
        </div>
        <Link href="/dashboard/moderation/bans/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Ban
          </Button>
        </Link>
      </div>

      <BanFilters />

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Player</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Reason</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Issued</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Moderator
                </th>
              </tr>
            </thead>
            <tbody>
              {bans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    No bans found.
                  </td>
                </tr>
              ) : (
                bans.map((ban) => (
                  <tr
                    key={ban.id}
                    className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
                  >
                    <td className="p-4">
                      <Link
                        href={`/dashboard/moderation/bans/${ban.id}`}
                        className="font-medium hover:underline"
                      >
                        {ban.playerName ?? `Player ${ban.playerId}`}
                      </Link>
                      <p className="text-xs text-muted-foreground">ID: {ban.playerId.toString()}</p>
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="truncate text-sm">{ban.reason}</p>
                      {ban._count.evidence > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {ban._count.evidence} evidence
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={ban.type === "PERMANENT" ? "destructive" : "secondary"}>
                        {ban.type}
                      </Badge>
                      {ban.durationHours && (
                        <p className="text-xs text-muted-foreground mt-1">{ban.durationHours}h</p>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={getBanStatusColor(ban.status)}>{ban.status}</Badge>
                      {ban._count.appeals > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {ban._count.appeals} appeal(s)
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDistanceToNow(ban.createdAt, { addSuffix: true })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {ban.issuedBy.image && (
                          <img src={ban.issuedBy.image} alt="" className="h-6 w-6 rounded-full" />
                        )}
                        <span className="text-sm">{ban.issuedBy.name}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
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
