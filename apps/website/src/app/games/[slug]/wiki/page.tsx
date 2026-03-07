import Link from "next/link";
import { notFound } from "next/navigation";
import { games, getGame, accentColors } from "@/lib/games";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) return {};
  return {
    title: `${game.name} Wiki – BroBlox`,
    description: `Player wiki and guides for ${game.name}.`,
  };
}

// Static wiki content per game (MDX-ready, prose for now)
const wikiContent: Record<string, { sections: { heading: string; body: string }[] }> = {
  obby: {
    sections: [
      {
        heading: "Getting Started",
        body: "Spawn in at Stage 1 and work your way through each obstacle. Touch a checkpoint flag to save your progress — if you fall, you respawn there instead of the beginning.",
      },
      {
        heading: "Stages",
        body: "There are 30 stages in total, grouped into three difficulty tiers: Beginner (1–10), Intermediate (11–20), and Expert (21–30). Each tier introduces new obstacle types: moving platforms, gravity zones, and timed doors.",
      },
      {
        heading: "Coins",
        body: "You earn coins passively for every stage you complete. Bonus coins are awarded for completing a stage under the target time (shown at the stage entrance). Coins are spent in the Accessory Shop accessible from the lobby.",
      },
      {
        heading: "Leaderboards",
        body: "Three global leaderboards are tracked: Fastest Total Clear Time, Most Stages Completed, and Most Coins Earned. Click the leaderboard board in the lobby to view rankings.",
      },
      {
        heading: "Tips & Tricks",
        body: "Look for secondary paths at stages 7, 14, and 22 — they are harder but significantly faster. Jump at the last frame of a moving platform for extra distance. The gravity zone at stage 23 inverts every 15 seconds: time your approach carefully.",
      },
    ],
  },
  "test-park": {
    sections: [
      {
        heading: "Overview",
        body: "Test Park is BroBlox's free-roam sandbox. There are no objectives — explore, collect hidden achievement tokens, and chat with other players.",
      },
      {
        heading: "Achievements",
        body: "18 achievements are currently available in Test Park. Achievements cover exploration, social interactions, and hidden collectibles. Unlocking all 18 earns you the Early Supporter badge visible on your profile.",
      },
      {
        heading: "Hidden Tokens",
        body: "There are 10 hidden gold tokens scattered across the map. Collecting all 10 unlocks the Explorer achievement. Tokens respawn every server reset.",
      },
      {
        heading: "Coming Soon",
        body: "Structured game modes, a quest board, and an expanded map are in active development. Join our Discord to get early access announcements.",
      },
    ],
  },
};

export default async function WikiPage({ params }: Props) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();

  const wiki = wikiContent[slug];
  const c = accentColors[game.accent];

  return (
    <main className="min-h-screen px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-dim">
          <Link href="/games" className="transition-colors hover:text-subtle">
            Games
          </Link>
          <span>/</span>
          <Link href={`/games/${slug}`} className="transition-colors hover:text-subtle">
            {game.name}
          </Link>
          <span>/</span>
          <span style={{ color: c.text }}>Wiki</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black sm:text-4xl">
            <span style={{ color: c.text }}>{game.name}</span> Wiki
          </h1>
          <p className="mt-2 text-sm text-muted">Community guide and mechanics reference.</p>
        </div>

        {/* Content */}
        {wiki ? (
          <div className="flex flex-col gap-8">
            {wiki.sections.map((s) => (
              <section key={s.heading}>
                <h2
                  className="mb-3 text-lg font-bold border-b pb-2"
                  style={{ color: c.text, borderColor: c.border }}
                >
                  {s.heading}
                </h2>
                <p className="leading-relaxed text-subtle">{s.body}</p>
              </section>
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl border p-8 text-center"
            style={{ borderColor: c.border, background: c.bg }}
          >
            <p className="text-muted">Wiki content coming soon.</p>
          </div>
        )}

        {/* Back */}
        <div className="mt-12">
          <Link
            href={`/games/${slug}`}
            className="text-sm text-dim transition-colors hover:text-subtle"
          >
            ← Back to {game.name}
          </Link>
        </div>
      </div>
    </main>
  );
}
