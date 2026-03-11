import Link from "next/link";
import { requirePermission } from "@/lib/authorize";
import { hasPermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Flag, Shield, Trophy } from "lucide-react";
import { getGames } from "./actions";
import { CreateGameButton } from "./create-game";

export default async function GamesPage() {
  const { user } = await requirePermission("games:view");
  const canCreate = hasPermission(user.role, "games:create");

  const games = await getGames();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Games</h1>
          <p className="text-muted-foreground">
            All Roblox experiences managed by this platform ({games.length} registered)
          </p>
        </div>
        {canCreate && <CreateGameButton />}
      </div>

      {games.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Gamepad2 className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">No games registered yet</p>
              <p className="text-sm text-muted-foreground">
                Register your first Roblox experience to start managing flags, moderation, and
                telemetry per game.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => {
          const linkedEnvs = [
            game.universeIdDev ? "dev" : null,
            game.universeIdStage ? "stage" : null,
            game.universeIdProd ? "prod" : null,
          ].filter(Boolean);

          return (
            <Link key={game.id} href={`/games/${game.id}`}>
              <Card className="h-full transition-colors hover:border-primary/50 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {game.iconUrl ? (
                        <img
                          src={game.iconUrl}
                          alt={game.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Gamepad2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base leading-tight">{game.name}</CardTitle>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {game.slug}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {game.isActive ? (
                        <Badge
                          variant="outline"
                          className="text-xs text-green-500 border-green-500/30"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-zinc-500">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {game.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{game.description}</p>
                  )}

                  {/* Linked environments */}
                  <div className="flex gap-1.5 flex-wrap">
                    {linkedEnvs.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No universes linked yet</span>
                    ) : (
                      linkedEnvs.map((env) => (
                        <Badge key={env} variant="secondary" className="text-xs">
                          {env}
                        </Badge>
                      ))
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
                    <div className="flex flex-col items-center gap-1">
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">{game._count?.flags ?? 0}</span>
                      <span className="text-xs text-muted-foreground">Flags</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">{game._count?.matches ?? 0}</span>
                      <span className="text-xs text-muted-foreground">Matches</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">{game._count?.bans ?? 0}</span>
                      <span className="text-xs text-muted-foreground">Bans</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
