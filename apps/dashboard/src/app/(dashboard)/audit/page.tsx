import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { AuditFilters } from "./filters";
import { CopyTargetButton } from "./copy-target-button";

interface SearchParams {
  action?: string;
  target?: string;
  reason?: string;
  details?: string;
  user?: string;
  page?: string;
  gameId?: string;
}

async function getAuditLogs(params: SearchParams) {
  const page = Number(params.page) || 1;
  const perPage = 50;

  const where: {
    action?: { startsWith: string };
    target?: { contains: string };
    reason?: { contains: string };
    userId?: string;
    gameId?: string;
  } = {};

  if (params.action) {
    // Default to category-style filtering.
    where.action = { startsWith: params.action };
  }
  if (params.target) {
    where.target = { contains: params.target };
  }
  if (params.reason) {
    where.reason = { contains: params.reason };
  }
  if (params.user) {
    where.userId = params.user;
  }
  if (params.gameId) {
    where.gameId = params.gameId;
  }

  const detailsQuery = params.details?.trim();

  const [logs, total] = await Promise.all(
    detailsQuery
      ? [
          prisma.auditLog.findMany({
            where: {
              ...where,
              OR: [
                { before: { string_contains: detailsQuery } },
                { after: { string_contains: detailsQuery } },
              ],
            },
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
            orderBy: { timestamp: "desc" },
            skip: (page - 1) * perPage,
            take: perPage,
          }),
          prisma.auditLog.count({
            where: {
              ...where,
              OR: [
                { before: { string_contains: detailsQuery } },
                { after: { string_contains: detailsQuery } },
              ],
            },
          }),
        ]
      : [
          prisma.auditLog.findMany({
            where,
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
            orderBy: { timestamp: "desc" },
            skip: (page - 1) * perPage,
            take: perPage,
          }),
          prisma.auditLog.count({ where }),
        ]
  );

  return { logs, total, page, perPage };
}

async function getUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

function getActionColor(
  action: string
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  if (action.includes("delete") || action.includes("kill") || action.includes("ban"))
    return "destructive";
  if (action.includes("create") || action.includes("approve")) return "success";
  if (action.includes("prod")) return "warning";
  if (action.includes("revoke") || action.includes("deny")) return "warning";
  return "secondary";
}

function formatAction(action: string): string {
  const parts = action.split(".");
  if (parts.length >= 2) {
    const [category, ...rest] = parts;
    return `${category.charAt(0).toUpperCase() + category.slice(1)}: ${rest.join(" ")}`;
  }
  return action;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePermission("view:audit");

  const params = await searchParams;
  const [{ logs, total, page, perPage }, users] = await Promise.all([
    getAuditLogs(params),
    getUsers(),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          View all privileged actions and changes ({total} total)
        </p>
      </div>

      <AuditFilters users={users} />

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No audit logs found.</p>
            <p className="text-sm text-muted-foreground mt-1">
              {params.action ||
              params.target ||
              params.reason ||
              params.details ||
              params.user ||
              params.gameId
                ? "Try adjusting your filters."
                : "Actions will appear here as users make changes."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 py-3 border-b border-zinc-800 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {log.user.image && (
                        <img src={log.user.image} alt="" className="h-5 w-5 rounded-full" />
                      )}
                      <span className="font-medium text-sm">{log.user.name ?? log.user.email}</span>
                      <Badge variant={getActionColor(log.action)}>{formatAction(log.action)}</Badge>
                      {log.target && (
                        <span className="inline-flex items-center gap-1">
                          <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">
                            {log.target}
                          </code>
                          <CopyTargetButton text={log.target} />
                        </span>
                      )}
                    </div>
                    {log.reason && (
                      <p className="text-sm text-muted-foreground mt-1">Reason: {log.reason}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                  {(log.before || log.after) && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Details
                      </summary>
                      <div className="mt-2 space-y-1 p-2 bg-zinc-900 rounded">
                        {log.before && (
                          <div>
                            <span className="text-red-400">Before:</span>
                            <pre className="text-muted-foreground overflow-auto">
                              {JSON.stringify(log.before, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.after && (
                          <div>
                            <span className="text-green-400">After:</span>
                            <pre className="text-muted-foreground overflow-auto">
                              {JSON.stringify(log.after, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-800">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <a
                      href={`?page=${page - 1}${params.action ? `&action=${params.action}` : ""}${params.target ? `&target=${params.target}` : ""}${params.reason ? `&reason=${params.reason}` : ""}${params.details ? `&details=${params.details}` : ""}${params.user ? `&user=${params.user}` : ""}${params.gameId ? `&gameId=${params.gameId}` : ""}`}
                      className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded"
                    >
                      Previous
                    </a>
                  )}
                  {page < totalPages && (
                    <a
                      href={`?page=${page + 1}${params.action ? `&action=${params.action}` : ""}${params.target ? `&target=${params.target}` : ""}${params.reason ? `&reason=${params.reason}` : ""}${params.details ? `&details=${params.details}` : ""}${params.user ? `&user=${params.user}` : ""}${params.gameId ? `&gameId=${params.gameId}` : ""}`}
                      className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded"
                    >
                      Next
                    </a>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
