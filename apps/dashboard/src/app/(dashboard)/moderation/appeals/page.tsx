import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface SearchParams {
  status?: string;
  page?: string;
}

async function getAppeals(params: SearchParams) {
  const page = Number(params.page) || 1;
  const perPage = 25;

  const where: { status?: "PENDING" | "APPROVED" | "DENIED" } = {};

  if (params.status && params.status !== "all") {
    where.status = params.status as "PENDING" | "APPROVED" | "DENIED";
  }

  const [appeals, total] = await Promise.all([
    prisma.appeal.findMany({
      where,
      include: {
        ban: {
          select: {
            reason: true,
            type: true,
            playerId: true,
            playerName: true,
            issuedBy: { select: { name: true } },
          },
        },
        resolvedBy: { select: { name: true, image: true } },
      },
      orderBy: { createdAt: params.status === "PENDING" ? "asc" : "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.appeal.count({ where }),
  ]);

  return { appeals, total, page, perPage };
}

export default async function AppealsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("moderation:view");

  const params = await searchParams;
  const { appeals, total, page, perPage } = await getAppeals(params);
  const totalPages = Math.ceil(total / perPage);
  const currentStatus = params.status ?? "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Appeals</h1>
        <p className="text-muted-foreground">Review ban appeals ({total} total)</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "PENDING", "APPROVED", "DENIED"].map((status) => (
          <Link
            key={status}
            href={`/moderation/appeals${status !== "all" ? `?status=${status}` : ""}`}
          >
            <Button
              variant={
                currentStatus === status || (!currentStatus && status === "all")
                  ? "default"
                  : "outline"
              }
              size="sm"
            >
              {status === "all" ? "All" : status}
            </Button>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Player</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Original Ban
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Appeal Reason
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Submitted
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appeals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    No appeals found.
                  </td>
                </tr>
              ) : (
                appeals.map((appeal) => (
                  <tr key={appeal.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="p-4">
                      <p className="font-medium">
                        {appeal.playerName ?? appeal.ban.playerName ?? `Player ${appeal.playerId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {appeal.playerId.toString()}
                      </p>
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="truncate text-sm">{appeal.ban.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {appeal.ban.type} • by {appeal.ban.issuedBy.name}
                      </p>
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="truncate text-sm">{appeal.reason}</p>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          appeal.status === "APPROVED"
                            ? "success"
                            : appeal.status === "DENIED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {appeal.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDistanceToNow(appeal.createdAt, { addSuffix: true })}
                    </td>
                    <td className="p-4">
                      <Link href={`/moderation/appeals/${appeal.id}`}>
                        <Button variant="outline" size="sm">
                          {appeal.status === "PENDING" ? "Review" : "View"}
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
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
                    href={`?page=${page - 1}${params.status ? `&status=${params.status}` : ""}`}
                  >
                    <Button variant="outline" size="sm">
                      Previous
                    </Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}${params.status ? `&status=${params.status}` : ""}`}
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
