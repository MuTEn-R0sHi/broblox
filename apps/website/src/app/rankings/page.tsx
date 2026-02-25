import type { Metadata } from "next";
import { Trophy, Swords, Timer, Medal, TrendingUp } from "lucide-react";
import { fetchGameStats, formatCount } from "@/lib/roblox";
import { accentColors } from "@/lib/games";
import {
  fetchGameLeaderboards,
  GAME_BOARDS,
  type LeaderboardResponse,
  type BoardDef,
} from "@/lib/leaderboards";

export const metadata: Metadata = {
  title: "Rankings – BroBlox",
  description: "Global leaderboards for all BroBlox games.",
};

// Revalidate page every 60 seconds (ISR)
export const revalidate = 60;

// ── Board icon mapping ────────────────────────────────────────────────────

const boardIcons: Record<string, typeof Trophy> = {
  kills: Swords,
  wins: Trophy,
  playtime: Timer,
  completions: Medal,
};

// ── Game definitions for the rankings page ────────────────────────────────

const rankedGames = [
  {
    slug: "starter",
    name: "Starter World",
    universeId: process.env.NEXT_PUBLIC_ROBLOX_UNIVERSE_ID_STARTER ?? "",
    accent: "purple" as const,
  },
  {
    slug: "obby",
    name: "BroBlox Obby",
    universeId: process.env.NEXT_PUBLIC_ROBLOX_UNIVERSE_ID_OBBY ?? "",
    accent: "cyan" as const,
  },
];

// ── Hardcoded fallback entries (shown if API is unreachable) ───────────────

const fallbackEntries: Record<string, { rank: number; name: string; value: string }[]> = {
  kills: [
    { rank: 1, name: "FragMaster", value: "12,450" },
    { rank: 2, name: "SnipeKing", value: "10,200" },
    { rank: 3, name: "BlastZone", value: "8,900" },
  ],
  wins: [
    { rank: 1, name: "ChampRBX", value: "342" },
    { rank: 2, name: "VictoryLap", value: "298" },
    { rank: 3, name: "TopDog", value: "265" },
  ],
  playtime: [
    { rank: 1, name: "NoLifeRBX", value: "84h 12m" },
    { rank: 2, name: "AlwaysOn", value: "71h 5m" },
    { rank: 3, name: "Dedicated", value: "62h 30m" },
  ],
  completions: [
    { rank: 1, name: "ObbyKing", value: "1,248" },
    { rank: 2, name: "JumpPro", value: "1,102" },
    { rank: 3, name: "SpeedDemon99", value: "980" },
  ],
};

// ── Page ──────────────────────────────────────────────────────────────────

export default async function RankingsPage() {
  const universeIds = rankedGames.map((g) => g.universeId).filter(Boolean);
  const [stats, ...leaderboardMaps] = await Promise.all([
    fetchGameStats(universeIds),
    ...rankedGames.map((g) => fetchGameLeaderboards(g.slug)),
  ]);

  return (
    <main className="min-h-screen px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-purple">Leaderboards</p>
        <h1 className="text-4xl font-black sm:text-5xl md:text-6xl">Rankings</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted sm:text-base">
          Top players across all BroBlox games. Updated every 5 minutes via Open Cloud.
        </p>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        {rankedGames.map((game, gameIdx) => {
          const c = accentColors[game.accent];
          const gameStats = stats[game.universeId];
          const boards = GAME_BOARDS[game.slug] ?? [];
          const lbMap = leaderboardMaps[gameIdx];

          return (
            <section key={game.slug}>
              {/* Game title */}
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="h-px flex-1"
                  style={{ background: `linear-gradient(to right, ${c.text}44, transparent)` }}
                />
                <h2 className="text-lg font-bold" style={{ color: c.text }}>
                  {game.name}
                </h2>
                <div
                  className="h-px flex-1"
                  style={{ background: `linear-gradient(to left, ${c.text}44, transparent)` }}
                />
              </div>

              {/* Live stats pills */}
              {gameStats && (
                <div className="mb-6 flex flex-wrap gap-2">
                  <span
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                    style={{ color: c.text, borderColor: c.border, background: c.bgStrong }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                      style={{ backgroundColor: c.text }}
                    />
                    {formatCount(gameStats.playing)} playing now
                  </span>
                  <span
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                    style={{ color: c.text, borderColor: c.border, background: c.bgStrong }}
                  >
                    <TrendingUp className="h-3 w-3" />
                    {formatCount(gameStats.visits)} visits
                  </span>
                </div>
              )}

              {/* Boards */}
              <div
                className={`grid gap-6 ${boards.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}
              >
                {boards.map((board) => {
                  const data = lbMap?.get(board.id);
                  return <LeaderboardCard key={board.id} board={board} data={data} accent={c} />;
                })}
              </div>
            </section>
          );
        })}

        <p className="text-center text-xs text-faint">
          Leaderboard data fetched from Roblox OrderedDataStores via Open Cloud API. Player counts
          via Roblox public API. Both refresh automatically.
        </p>
      </div>
    </main>
  );
}

// ── LeaderboardCard ───────────────────────────────────────────────────────

function LeaderboardCard({
  board,
  data,
  accent,
}: {
  board: BoardDef;
  data: LeaderboardResponse | undefined;
  accent: (typeof accentColors)[keyof typeof accentColors];
}) {
  const Icon = boardIcons[board.id] ?? Trophy;
  const hasLiveData = data && data.entries.length > 0;
  const fallback = fallbackEntries[board.id] ?? [];

  const entries = hasLiveData
    ? data.entries.map((e) => ({
        rank: e.rank,
        name: e.displayName,
        value: board.formatValue ? board.formatValue(e.score) : String(e.score),
      }))
    : fallback;

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: accent.border, background: accent.bg }}
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: accent.text }} />
        <h3 className="font-bold" style={{ color: accent.text }}>
          {board.label}
        </h3>
        {!hasLiveData && entries.length > 0 && (
          <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-faint">
            sample data
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No entries yet — be the first!</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((e) => (
            <li
              key={e.rank}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
              style={{ background: e.rank === 1 ? `${accent.text}11` : "transparent" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-5 text-center text-xs font-black tabular-nums"
                  style={{ color: e.rank <= 3 ? accent.text : "#52525b" }}
                >
                  {e.rank}
                </span>
                <span className={e.rank === 1 ? "font-semibold text-foreground" : "text-subtle"}>
                  {e.name}
                </span>
              </div>
              <span className="tabular-nums font-bold" style={{ color: accent.text }}>
                {e.value}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
