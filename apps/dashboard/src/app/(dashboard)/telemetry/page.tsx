import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, Server, BarChart3, AlertTriangle, Zap } from "lucide-react";
import { requirePermission } from "@/lib/authorize";
import { prisma } from "@/lib/db";

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  );
}

function levelBadgeVariant(level: string) {
  switch (level) {
    case "error":
      return "destructive" as const;
    case "warn":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

export default async function TelemetryPage() {
  await requirePermission("view:telemetry");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  let dbNotInitialized = false;

  // ── KPI queries ──────────────────────────────────────────────────────
  let uniquePlayers: Array<{ playerId: bigint | null }> = [];
  let activeServers: Array<{ serverId: string | null }> = [];
  let totalEventsToday = 0;
  let errorEventsToday = 0;

  try {
    [uniquePlayers, activeServers, totalEventsToday, errorEventsToday] = await Promise.all([
      prisma.telemetryEvent.groupBy({
        by: ["playerId"],
        where: { playerId: { not: null }, ingestedAt: { gte: oneHourAgo } },
      }),
      prisma.telemetryEvent.groupBy({
        by: ["serverId"],
        where: { serverId: { not: null }, ingestedAt: { gte: oneHourAgo } },
      }),
      prisma.telemetryEvent.count({
        where: { ingestedAt: { gte: oneDayAgo } },
      }),
      prisma.telemetryEvent.count({
        where: { level: "error", ingestedAt: { gte: oneDayAgo } },
      }),
    ]);
  } catch (error) {
    if (isMissingTableError(error)) {
      dbNotInitialized = true;
    } else {
      throw error;
    }
  }

  // ── Category breakdown ──────────────────────────────────────────────
  let categoryBreakdown: { category: string; _count: { _all: number } }[] = [];
  try {
    const rows = await prisma.telemetryEvent.groupBy({
      by: ["category"],
      where: { ingestedAt: { gte: oneDayAgo } },
      _count: { _all: true },
    });
    categoryBreakdown = rows.sort((a, b) => b._count._all - a._count._all);
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }

  // ── Recent events ──────────────────────────────────────────────────
  let recentEvents: Array<{
    id: string;
    category: string;
    name: string;
    level: string;
    ingestedAt: Date;
    serverId: string | null;
    playerId: bigint | null;
  }> = [];
  try {
    recentEvents = await prisma.telemetryEvent.findMany({
      orderBy: { ingestedAt: "desc" },
      take: 20,
    });
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }

  // ── Recent metrics ──────────────────────────────────────────────────
  let metricSummary: {
    name: string;
    _count: { _all: number };
    _avg: { value: number | null };
    _max: { value: number | null };
    _min: { value: number | null };
  }[] = [];
  try {
    const rows = await prisma.metricPoint.groupBy({
      by: ["name"],
      where: { ingestedAt: { gte: oneDayAgo } },
      _count: { _all: true },
      _avg: { value: true },
      _max: { value: true },
      _min: { value: true },
    });
    metricSummary = rows.sort((a, b) => b._count._all - a._count._all);
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }

  if (dbNotInitialized) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Telemetry</h1>
          <p className="text-muted-foreground">Game telemetry and metrics overview</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Telemetry database is not initialized. Run{" "}
              <code className="rounded bg-muted px-1 py-0.5">pnpm prisma db push</code> to create
              the tables.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpis = [
    {
      title: "Active Players (1h)",
      value: uniquePlayers.length,
      icon: Users,
      description: "Unique players with events in the past hour",
    },
    {
      title: "Active Servers (1h)",
      value: activeServers.length,
      icon: Server,
      description: "Servers reporting in the past hour",
    },
    {
      title: "Events (24h)",
      value: totalEventsToday.toLocaleString(),
      icon: Activity,
      description: "Total telemetry events ingested today",
    },
    {
      title: "Errors (24h)",
      value: errorEventsToday,
      icon: AlertTriangle,
      description: "Error-level events in the past day",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Telemetry</h1>
        <p className="text-muted-foreground">Game telemetry and metrics overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Event Categories (24h)
            </CardTitle>
            <CardDescription>Breakdown of events by category</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events in the past 24 hours.</p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const total = categoryBreakdown.reduce((s, c) => s + c._count._all, 0);
                  return categoryBreakdown.map((cat) => {
                    const pct = total > 0 ? Math.round((cat._count._all / total) * 100) : 0;
                    return (
                      <div key={cat.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline">{cat.category}</Badge>
                          <span className="text-sm text-muted-foreground truncate">
                            {cat._count._all.toLocaleString()} events
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-cyan"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metric Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Metrics (24h)
            </CardTitle>
            <CardDescription>Aggregated metric statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {metricSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No metrics in the past 24 hours.</p>
            ) : (
              <div className="space-y-3">
                {metricSummary.map((m) => (
                  <div key={m.name} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium font-mono">{m.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {m._count._all.toLocaleString()} points
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        min: <strong>{m._min.value?.toFixed(1) ?? "—"}</strong>
                      </span>
                      <span>
                        avg: <strong>{m._avg.value?.toFixed(1) ?? "—"}</strong>
                      </span>
                      <span>
                        max: <strong>{m._max.value?.toFixed(1) ?? "—"}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Event Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Events
          </CardTitle>
          <CardDescription>Latest 20 telemetry events</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events yet. Events will appear once game servers start reporting.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Level</th>
                    <th className="pb-2 pr-4">Category</th>
                    <th className="pb-2 pr-4">Event</th>
                    <th className="pb-2 pr-4">Server</th>
                    <th className="pb-2">Player</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((ev) => (
                    <tr key={ev.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                        {ev.ingestedAt.toISOString().slice(11, 19)}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={levelBadgeVariant(ev.level)}>{ev.level}</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline">{ev.category}</Badge>
                      </td>
                      <td className="py-2 pr-4 font-mono">{ev.name}</td>
                      <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">
                        {ev.serverId?.slice(0, 8) ?? "—"}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {ev.playerId?.toString() ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
