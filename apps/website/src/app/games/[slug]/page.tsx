import Link from "next/link";
import { notFound } from "next/navigation";
import { games, getGame, accentColors } from "@/lib/games";
import { Gamepad2, Trophy, ExternalLink, BookOpen } from "lucide-react";
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
    title: `${game.name} – BroBlox`,
    description: game.shortDescription,
  };
}

const icons: Record<string, React.ReactNode> = {
  obby: <Gamepad2 className="h-7 w-7" />,
  "test-park": <Trophy className="h-7 w-7" />,
};

export default async function GameDetailPage({ params }: Props) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();

  const c = accentColors[game.accent];

  return (
    <main className="min-h-screen px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-dim">
          <Link href="/games" className="transition-colors hover:text-subtle">
            Games
          </Link>
          <span>/</span>
          <span style={{ color: c.text }}>{game.name}</span>
        </nav>

        {/* Hero */}
        <div
          className="mb-10 rounded-2xl border p-8"
          style={{ borderColor: c.border, background: c.bg }}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            {/* Icon */}
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border"
              style={{ color: c.text, borderColor: c.border, boxShadow: c.glow }}
            >
              {icons[game.slug]}
            </div>

            <div className="flex-1">
              {/* Status + genre */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                  style={{ color: c.text, borderColor: c.border }}
                >
                  {game.status === "live" ? "● Live" : "Coming Soon"}
                </span>
                <span className="text-xs text-dim">{game.genre}</span>
              </div>

              <h1 className="mb-3 text-3xl font-black sm:text-4xl" style={{ color: c.text }}>
                {game.name}
              </h1>
              <p className="text-sm leading-relaxed text-subtle sm:text-base">
                {game.longDescription}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md px-2 py-0.5 text-xs font-medium"
                style={{ color: c.text, background: c.bgStrong }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {game.status === "live" && game.robloxUrl ? (
              <a
                href={game.robloxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-bold transition-all hover:scale-[1.02]"
                style={{ color: c.text, borderColor: c.border, background: c.bgStrong }}
              >
                <ExternalLink className="h-4 w-4" />
                Play on Roblox
              </a>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold text-faint">
                Coming Soon
              </span>
            )}
            <Link
              href={`/games/${game.slug}/wiki`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-muted transition-all hover:border-faint hover:text-subtle"
            >
              <BookOpen className="h-4 w-4" />
              Player Wiki
            </Link>
          </div>
        </div>

        {/* Features grid */}
        <div className="mb-10">
          <h2 className="mb-5 text-xl font-bold">Features</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {game.features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border p-5"
                style={{ borderColor: c.border, background: c.bg }}
              >
                <h3 className="mb-1.5 font-semibold" style={{ color: c.text }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Back link */}
        <Link href="/games" className="text-sm text-dim transition-colors hover:text-subtle">
          ← Back to all games
        </Link>
      </div>
    </main>
  );
}
