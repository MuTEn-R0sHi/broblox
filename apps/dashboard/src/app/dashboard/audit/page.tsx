import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

type AuditLogWithUser = {
  id: string;
  action: string;
  target: string;
  before: string | null;
  after: string | null;
  timestamp: Date;
  user: { name: string | null; email: string | null; image: string | null };
};

async function getAuditLogs(): Promise<AuditLogWithUser[]> {
  return prisma.auditLog.findMany({
    include: {
      user: {
        select: { name: true, email: true, image: true },
      },
    },
    orderBy: { timestamp: "desc" },
    take: 100,
  });
}

function getActionColor(action: string): string {
  if (action.includes("delete")) return "bg-red-500";
  if (action.includes("create")) return "bg-green-500";
  if (action.includes("prod")) return "bg-yellow-500";
  if (action.includes("stage")) return "bg-blue-500";
  return "bg-zinc-500";
}

function formatAction(action: string): string {
  return action
    .replace("flag.", "")
    .replace("toggle.", "Toggle ")
    .replace("create", "Created")
    .replace("update", "Updated")
    .replace("delete", "Deleted");
}

export default async function AuditPage() {
  const logs = await getAuditLogs();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">View all privileged actions and changes</p>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No audit logs yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Actions will appear here as users make changes.
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
                  <div
                    className={`mt-1.5 h-2.5 w-2.5 rounded-full ${getActionColor(log.action)}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {log.user.image && (
                        <img src={log.user.image} alt="" className="h-5 w-5 rounded-full" />
                      )}
                      <span className="font-medium text-sm">{log.user.name ?? log.user.email}</span>
                      <span className="text-muted-foreground text-sm">
                        {formatAction(log.action)}
                      </span>
                      <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">
                        {log.target}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
