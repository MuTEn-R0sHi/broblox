import type { Metadata } from "next";
import { Trophy, Timer, Coins } from "lucide-react";

export const metadata: Metadata = {
  title: "Rankings – BroBlox",
  description: "Global leaderboards for all BroBlox games.",
};

// Static placeholder data — replace with live API calls once Roblox Open Cloud is wired up
const leaderboards = [
  {
    game: "BroBlox Obby",
    slug: "obby",
    accent: "cyan" as const,
    boards: [
      {
        label: "Fastest Clear",
        icon: Timer,
        entries: [
          { rank: 1, name: "SpeedDemon99", value: "4m 12s" },
          { rank: 2, name: "QuickFeet", value: "4m 38s" },
          { rank: 3, name: "ZoomZoom", value: "4m 51s" },
          { rank: 4, name: "RushHour", value: "5m 03s" },
          { rank: 5, name: "BlazeRunner", value: "5m 17s" },
        ],
      },
      {
        label: "Most Coins",
        icon: Coins,
        entries: [
          { rank: 1, name: "CoinKing", value: "48,200" },
          { rank: 2, name: "Grinder42", value: "41,750" },
          { rank: 3, name: "LoopFarm", value: "38,900" },
          { rank: 4, name: "CashFlow", value: "33,100" },
          { rank: 5, name: "BroBloxFan", value: "29,500" },
        ],
      },
    ],
  },
];

const accentMap = {
  cyan: { text: "#00e5ff", border: "#00e5ff33", bg: "#00e5ff0d" },
  purple: { text: "#c084fc", border: "#c084fc33", bg: "#c084fc0d" },
};

export default function RankingsPage() {
  return (
    <main className="min-h-screen px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#c084fc]">
          Leaderboards
        </p>
        <h1 className="text-4xl font-black sm:text-5xl md:text-6xl">Rankings</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#71717a] sm:text-base">
          Top players across all BroBlox games. Updated live.
        </p>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        {leaderboards.map((lb) => {
          const c = accentMap[lb.accent];
          return (
            <section key={lb.slug}>
              {/* Game title */}
              <div className="mb-6 flex items-center gap-3">
                <div
                  className="h-px flex-1"
                  style={{ background: `linear-gradient(to right, ${c.text}44, transparent)` }}
                />
                <h2 className="text-lg font-bold" style={{ color: c.text }}>
                  {lb.game}
                </h2>
                <div
                  className="h-px flex-1"
                  style={{ background: `linear-gradient(to left, ${c.text}44, transparent)` }}
                />
              </div>

              {/* Boards */}
              <div className="grid gap-6 sm:grid-cols-2">
                {lb.boards.map((board) => {
                  const Icon = board.icon;
                  return (
                    <div
                      key={board.label}
                      className="rounded-2xl border p-5"
                      style={{ borderColor: c.border, background: c.bg }}
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: c.text }} />
                        <h3 className="font-bold" style={{ color: c.text }}>
                          {board.label}
                        </h3>
                      </div>
                      <ol className="flex flex-col gap-2">
                        {board.entries.map((e) => (
                          <li
                            key={e.rank}
                            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                            style={{
                              background: e.rank === 1 ? `${c.text}11` : "transparent",
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="w-5 text-center text-xs font-black tabular-nums"
                                style={{ color: e.rank <= 3 ? c.text : "#52525b" }}
                              >
                                {e.rank}
                              </span>
                              <span
                                className={
                                  e.rank === 1 ? "font-semibold text-[#fafafa]" : "text-[#a1a1aa]"
                                }
                              >
                                {e.name}
                              </span>
                            </div>
                            <span className="tabular-nums font-bold" style={{ color: c.text }}>
                              {e.value}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Coming soon notice */}
        <p className="text-center text-xs text-[#3f3f60]">
          Live player counts via Roblox Open Cloud — coming soon.
        </p>
      </div>
    </main>
  );
}
