"use client";

import Link from "next/link";
import { Gamepad2, Trophy } from "lucide-react";
import { games, accentColors } from "@/lib/games";
import type { Game } from "@/lib/games";

const icons: Record<string, React.ReactNode> = {
  obby: <Gamepad2 className="h-6 w-6" />,
  starter: <Trophy className="h-6 w-6" />,
};

export function Games() {
  return (
    <section id="games" className="relative px-4 py-24 sm:px-6 lg:px-8">
      {/* Section header */}
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan">Our Games</p>
        <h2 className="text-3xl font-black sm:text-4xl md:text-5xl">Jump In &amp; Play</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted sm:text-base">
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
  const c = accentColors[game.accent];

  return (
    <div
      className="group relative flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02]"
      style={{ borderColor: c.border, backgroundColor: c.bg }}
    >
      {/* Status badge */}
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

      {/* Content */}
      <h3 className="mb-2 text-xl font-bold" style={{ color: c.text }}>
        {game.name}
      </h3>
      <p className="mb-4 flex-1 text-sm text-subtle">{game.shortDescription}</p>

      {/* Highlights */}
      <ul className="mb-5 space-y-1.5">
        {game.highlights.map((h) => (
          <li key={h} className="flex items-center gap-2 text-xs text-muted">
            <span className="h-1 w-1 rounded-full" style={{ backgroundColor: c.text }} />
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
            style={{ color: c.text, background: c.bg }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-2 sm:flex-row">
        {game.status === "live" && game.robloxUrl ? (
          <a
            href={game.robloxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl border px-3 py-2 text-sm font-bold transition-all duration-200 hover:scale-[1.01]"
            style={{ color: c.text, borderColor: c.border, background: c.bgStrong }}
          >
            Play on Roblox ↗
          </a>
        ) : (
          <span className="inline-flex flex-1 cursor-not-allowed items-center justify-center rounded-xl border border-border px-3 py-2 text-sm font-bold text-faint">
            Stay Tuned
          </span>
        )}
        <Link
          href={`/games/${game.slug}`}
          className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-sm font-semibold text-dim transition-colors hover:border-faint hover:text-subtle"
        >
          Details
        </Link>
      </div>

      {/* Hover glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 0 1px ${c.text}44, ${c.glow}` }}
      />
    </div>
  );
}
