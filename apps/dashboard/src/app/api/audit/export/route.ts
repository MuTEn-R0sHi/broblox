import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/authorize";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const needsQuotes = /[\n\r,"]/u.test(text);
  const escaped = text.replace(/"/gu, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function buildWhere(params: URLSearchParams): {
  action?: { startsWith: string };
  target?: { contains: string };
  userId?: string;
} {
  const where: {
    action?: { startsWith: string };
    target?: { contains: string };
    userId?: string;
  } = {};

  const action = params.get("action");
  const target = params.get("target");
  const user = params.get("user");

  if (action) where.action = { startsWith: action };
  if (target) where.target = { contains: target };
  if (user) where.userId = user;

  return where;
}

function parseLimit(params: URLSearchParams): number {
  const raw = params.get("limit");
  if (!raw) return 5000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 5000;
  return Math.min(Math.floor(parsed), 50_000);
}

export async function GET(request: Request): Promise<Response> {
  const auth = await requireApiPermission("view:audit");
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const params = url.searchParams;

  const format = (params.get("format") ?? "csv").toLowerCase();
  const limit = parseLimit(params);

  const where = buildWhere(params);

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const baseName = `audit-export-${timestamp}`;

  if (format === "json") {
    return new Response(
      JSON.stringify({ exportedAt: new Date().toISOString(), count: logs.length, logs }),
      {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="${baseName}.json"`,
          "cache-control": "no-store",
        },
      }
    );
  }

  // Default: CSV
  const header = [
    "timestamp",
    "action",
    "target",
    "reason",
    "userId",
    "userName",
    "userEmail",
    "ipHash",
    "userAgent",
    "before",
    "after",
  ].join(",");

  const rows = logs.map((log) => {
    return [
      csvEscape(log.timestamp.toISOString()),
      csvEscape(log.action),
      csvEscape(log.target),
      csvEscape(log.reason),
      csvEscape(log.userId),
      csvEscape(log.user?.name),
      csvEscape(log.user?.email),
      csvEscape(log.ipHash),
      csvEscape(log.userAgent),
      csvEscape(log.before),
      csvEscape(log.after),
    ].join(",");
  });

  const body = [header, ...rows].join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${baseName}.csv"`,
      "cache-control": "no-store",
    },
  });
}
