import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Server,
  Key,
  Clock,
  Gamepad2,
  Shield,
  Globe,
  Database,
  Activity,
  HardDrive,
} from "lucide-react";
import { requirePermission } from "@/lib/authorize";
import { prisma } from "@/lib/db";

function maskSecret(value: string | undefined): string {
  if (!value) return "Not set";
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••" + value.slice(-4);
}

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  );
}

export default async function SettingsPage() {
  await requirePermission("settings:view");

  // Gather environment info
  const nodeEnv = process.env.NODE_ENV ?? "unknown";
  const vercelEnv = process.env.VERCEL_ENV ?? "local";
  const region = process.env.VERCEL_REGION ?? "local";

  // API key / secret status
  const hasGameServerKey = !!process.env.GAME_SERVER_API_KEY;
  const hasCronSecret = !!process.env.CRON_SECRET;
  const hasAuthSecret = !!process.env.AUTH_SECRET;
  const hasGithubOAuth = !!process.env.GITHUB_ID && !!process.env.GITHUB_SECRET;
  const hasRobloxCloudKey = !!process.env.ROBLOX_OPEN_CLOUD_API_KEY;

  // Connected games
  let games: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    universeIdDev: bigint | null;
    universeIdStage: bigint | null;
    universeIdProd: bigint | null;
  }> = [];
  try {
    games = await prisma.game.findMany({ orderBy: { name: "asc" } });
  } catch {
    // DB not initialised — show empty
  }

  // Database health check
  let dbHealthy = false;
  let dbLatencyMs = 0;
  try {
    const start = Date.now();
    await prisma.$queryRawUnsafe("SELECT 1");
    dbLatencyMs = Date.now() - start;
    dbHealthy = true;
  } catch {
    // dbHealthy already false
  }

  // Telemetry & metrics storage stats
  let telemetryCount = 0;
  let metricCount = 0;
  let rateLimitBucketCount = 0;
  try {
    [telemetryCount, metricCount, rateLimitBucketCount] = await Promise.all([
      prisma.telemetryEvent.count(),
      prisma.metricPoint.count(),
      prisma.rateLimitBucket.count(),
    ]);
  } catch (error) {
    if (!isMissingTableError(error)) {
      // Swallow table-missing, rethrow others
    }
  }

  // Cron job definitions
  const cronJobs = [
    {
      name: "Expire Bans",
      path: "/api/jobs/expire-bans",
      schedule: "Every hour",
      secured: hasCronSecret,
    },
    {
      name: "Expire Mutes",
      path: "/api/jobs/expire-mutes",
      schedule: "Every hour",
      secured: hasCronSecret,
    },
    {
      name: "Prune Telemetry",
      path: "/api/jobs/prune-telemetry",
      schedule: "Daily at 02:00 UTC",
      secured: hasCronSecret,
    },
    {
      name: "Sync Flag Schedules",
      path: "/api/jobs/sync-flag-schedules",
      schedule: "Every 5 minutes",
      secured: hasCronSecret,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Dashboard environment, connections, and integrations
        </p>
      </div>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Environment
          </CardTitle>
          <CardDescription>Current deployment information</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Node Environment</dt>
              <dd className="mt-1">
                <Badge variant={nodeEnv === "production" ? "default" : "secondary"}>
                  {nodeEnv}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Vercel Environment</dt>
              <dd className="mt-1">
                <Badge variant={vercelEnv === "production" ? "default" : "secondary"}>
                  {vercelEnv}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Region</dt>
              <dd className="mt-1 text-sm">{region}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Dashboard Version</dt>
              <dd className="mt-1 text-sm">0.0.0</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Secrets & API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Secrets &amp; API Keys
          </CardTitle>
          <CardDescription>
            Status of configured secrets. Manage values in your Vercel project settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                name: "AUTH_SECRET",
                set: hasAuthSecret,
                icon: Shield,
                description: "NextAuth.js session encryption",
              },
              {
                name: "GITHUB_ID / GITHUB_SECRET",
                set: hasGithubOAuth,
                icon: Globe,
                description: "GitHub OAuth provider",
              },
              {
                name: "GAME_SERVER_API_KEY",
                set: hasGameServerKey,
                icon: Key,
                description: "Game server → Dashboard API auth",
              },
              {
                name: "CRON_SECRET",
                set: hasCronSecret,
                icon: Clock,
                description: "Vercel Cron job authentication",
              },
              {
                name: "ROBLOX_OPEN_CLOUD_API_KEY",
                set: hasRobloxCloudKey,
                icon: Globe,
                description: "Roblox Open Cloud API access",
              },
            ].map((secret) => (
              <div
                key={secret.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <secret.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{secret.name}</p>
                    <p className="text-xs text-muted-foreground">{secret.description}</p>
                  </div>
                </div>
                <Badge variant={secret.set ? "success" : "destructive"}>
                  {secret.set ? "Configured" : "Missing"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Connected Games */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Connected Games
          </CardTitle>
          <CardDescription>Roblox experiences managed by this dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          {games.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No games registered. Add games from the Games page.
            </p>
          ) : (
            <div className="space-y-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{game.name}</p>
                    <p className="text-xs text-muted-foreground">/{game.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={game.universeIdDev ? "success" : "outline"}>Dev</Badge>
                    <Badge variant={game.universeIdStage ? "success" : "outline"}>Stage</Badge>
                    <Badge variant={game.universeIdProd ? "success" : "outline"}>Prod</Badge>
                    <Badge variant={game.isActive ? "default" : "secondary"}>
                      {game.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Jobs
          </CardTitle>
          <CardDescription>Vercel Cron jobs configured in vercel.json</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cronJobs.map((job) => (
              <div
                key={job.path}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{job.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{job.path}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{job.schedule}</span>
                  <Badge variant={job.secured ? "success" : "destructive"}>
                    {job.secured ? "Secured" : "No Secret"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database
          </CardTitle>
          <CardDescription>Connection status and health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">MySQL / MariaDB</p>
                <p className="text-xs text-muted-foreground">
                  {process.env.DATABASE_URL
                    ? maskSecret(process.env.DATABASE_URL)
                    : "Not configured"}
                </p>
              </div>
              <Badge variant={dbHealthy ? "success" : "destructive"}>
                {dbHealthy ? `Healthy (${dbLatencyMs}ms)` : "Unreachable"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Stats
          </CardTitle>
          <CardDescription>Row counts for observability and rate limiting tables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Telemetry Events</p>
              </div>
              <p className="text-2xl font-bold">{telemetryCount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Metric Points</p>
              </div>
              <p className="text-2xl font-bold">{metricCount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Rate Limit Buckets</p>
              </div>
              <p className="text-2xl font-bold">{rateLimitBucketCount.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
