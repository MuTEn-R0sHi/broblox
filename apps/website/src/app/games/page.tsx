import Link from "next/link";
import { games, accentColors } from "@/lib/games";
import { Gamepad2, Trophy } from "lucide-react";

export const metadata = {
  title: "Games – BroBlox",
  description: "All BroBlox games. Free to play on Roblox.",
};

const icons: Record<string, React.ReactNode> = {
  obby: <Gamepad2 className="h-6 w-6" />,
  "test-park": <Trophy className="h-6 w-6" />,
};

export default function GamesPage() {
  return (
    <main className="min-h-screen px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan">All Games</p>
        <h1 className="text-4xl font-black sm:text-5xl md:text-6xl">Jump In &amp; Play</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted sm:text-base">
          All BroBlox games are free to play on Roblox. No pay to win — ever.
        </p>
      </div>

      {/* Grid */}
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
        {games.map((game) => {
          const c = accentColors[game.accent];
          return (
            <Link
              key={game.slug}
              href={`/games/${game.slug}`}
              className="group relative flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02]"
              style={{ borderColor: c.border, backgroundColor: c.bg }}
            >
              {/* Icon + status */}
              <div className="mb-4 flex items-start justify-between">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={{ color: c.text, borderColor: c.border, background: c.bg }}
                >
                  {icons[game.slug]}
                </div>
                <span
                  className="rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                  style={{ color: c.text, borderColor: c.border, background: c.bg }}
                >
                  {game.status === "live" ? "● Live" : "Coming Soon"}
                </span>
              </div>

              <h2 className="mb-2 text-xl font-bold" style={{ color: c.text }}>
                {game.name}
              </h2>
              <p className="mb-4 flex-1 text-sm text-subtle">{game.shortDescription}</p>

              {/* Tags */}
              <div className="mb-4 flex flex-wrap gap-1.5">
                {game.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md px-2 py-0.5 text-xs font-medium"
                    style={{ color: c.text, background: c.bg }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <span className="text-xs font-semibold" style={{ color: c.text }}>
                View details →
              </span>

              {/* Hover glow */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ boxShadow: `inset 0 0 0 1px ${c.text}44, ${c.glow}` }}
              />
            </Link>
          );
        })}
      </div>
    </main>
  );
}
