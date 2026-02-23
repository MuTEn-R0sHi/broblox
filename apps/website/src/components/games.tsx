import Link from "next/link";
import { Gamepad2, Trophy, Coins } from "lucide-react";

interface Game {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  status: "live" | "coming-soon";
  robloxUrl?: string;
  accent: "cyan" | "purple";
  icon: React.ReactNode;
  highlights: string[];
}

const games: Game[] = [
  {
    slug: "obby",
    name: "BroBlox Obby",
    description:
      "An obstacle course adventure with checkpoints, timed stages, and a global leaderboard. How fast can you finish?",
    tags: ["Obby", "Parkour", "Leaderboards"],
    status: "live",
    robloxUrl: "https://www.roblox.com",
    accent: "cyan",
    icon: <Gamepad2 className="h-6 w-6" />,
    highlights: ["Checkpoint saves", "Stage timers", "Coin rewards"],
  },
  {
    slug: "starter",
    name: "Starter World",
    description:
      "Our open sandbox starter experience. Explore the platform features before we ship the next big game.",
    tags: ["Sandbox", "Explore"],
    status: "coming-soon",
    accent: "purple",
    icon: <Trophy className="h-6 w-6" />,
    highlights: ["Free roam", "Achievements", "More coming soon"],
  },
];

export function Games() {
  return (
    <section id="games" className="relative px-4 py-24 sm:px-6 lg:px-8">
      {/* Section header */}
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#00e5ff]">Our Games</p>
        <h2 className="text-3xl font-black sm:text-4xl md:text-5xl">Jump In &amp; Play</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#71717a] sm:text-base">
          All our games are free to play on Roblox. No pay to win — just fun.
        </p>
      </div>

      {/* Cards */}
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
        {games.map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>
    </section>
  );
}

function GameCard({ game }: { game: Game }) {
  const isCyan = game.accent === "cyan";
  const accentColor = isCyan ? "#00e5ff" : "#c084fc";
  const accentBg = isCyan ? "#00e5ff0d" : "#c084fc0d";
  const accentBorder = isCyan ? "#00e5ff33" : "#c084fc33";
  const accentBorderHover = isCyan ? "#00e5ff66" : "#c084fc66";
  const glowClass = isCyan ? "glow-cyan" : "glow-purple";

  return (
    <div
      className="group relative flex flex-col rounded-2xl border bg-[#0f0f1e] p-6 transition-all duration-300 hover:scale-[1.02]"
      style={{
        borderColor: accentBorder,
        backgroundColor: accentBg,
      }}
    >
      {/* Status badge */}
      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border"
          style={{
            color: accentColor,
            borderColor: accentBorder,
            background: accentBg,
          }}
        >
          {game.icon}
        </div>
        <span
          className="rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
          style={{
            color: accentColor,
            borderColor: accentBorder,
            background: accentBg,
          }}
        >
          {game.status === "live" ? "● Live" : "Coming Soon"}
        </span>
      </div>

      {/* Content */}
      <h3 className="mb-2 text-xl font-bold" style={{ color: accentColor }}>
        {game.name}
      </h3>
      <p className="mb-4 flex-1 text-sm text-[#a1a1aa]">{game.description}</p>

      {/* Highlights */}
      <ul className="mb-5 space-y-1.5">
        {game.highlights.map((h) => (
          <li key={h} className="flex items-center gap-2 text-xs text-[#71717a]">
            <span className="h-1 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
            {h}
          </li>
        ))}
      </ul>

      {/* Tags */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {game.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md px-2 py-0.5 text-xs font-medium"
            style={{
              color: accentColor,
              background: accentBg,
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      {game.status === "live" && game.robloxUrl ? (
        <a
          href={game.robloxUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:scale-[1.02]"
          style={{
            color: accentColor,
            borderColor: accentBorder,
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = accentBg;
            (e.currentTarget as HTMLElement).style.borderColor = accentBorderHover;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.borderColor = accentBorder;
          }}
        >
          Play on Roblox ↗
        </a>
      ) : (
        <span className="inline-flex items-center justify-center rounded-xl border border-[#1e1e3a] px-4 py-2.5 text-sm font-bold text-[#3f3f60] cursor-not-allowed">
          Stay Tuned
        </span>
      )}

      {/* Hover glow border effect */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          boxShadow: `inset 0 0 0 1px ${accentColor}44, 0 0 24px ${accentColor}22`,
        }}
      />
    </div>
  );
}
