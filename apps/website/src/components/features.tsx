import { Trophy, Zap, Gift, Shield } from "lucide-react";

const features = [
  {
    icon: Trophy,
    title: "Global Leaderboards",
    description: "Compete with players worldwide. Real-time rankings across every game mode.",
    accent: "cyan" as const,
  },
  {
    icon: Zap,
    title: "Live Events",
    description: "Limited-time challenges with exclusive rewards. New events drop every week.",
    accent: "purple" as const,
  },
  {
    icon: Gift,
    title: "Achievements",
    description: "Unlock badges, titles, and cosmetics by completing in-game challenges.",
    accent: "cyan" as const,
  },
  {
    icon: Shield,
    title: "Free to Play",
    description: "Every game is 100% free. No pay-to-win mechanics — skill is all you need.",
    accent: "purple" as const,
  },
];

export function Features() {
  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      {/* Divider gradient */}
      <div className="mb-16 h-px w-full bg-gradient-to-r from-transparent via-[#00e5ff33] to-transparent" />

      {/* Header */}
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#c084fc]">Platform</p>
        <h2 className="text-3xl font-black sm:text-4xl md:text-5xl">Built for Players</h2>
      </div>

      {/* Grid */}
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => {
          const isCyan = f.accent === "cyan";
          const accentColor = isCyan ? "#00e5ff" : "#c084fc";
          const accentBg = isCyan ? "#00e5ff08" : "#c084fc08";
          const accentBorder = isCyan ? "#00e5ff22" : "#c084fc22";
          const Icon = f.icon;

          return (
            <div
              key={f.title}
              className="group flex flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02]"
              style={{
                borderColor: accentBorder,
                backgroundColor: accentBg,
              }}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{
                  color: accentColor,
                  borderColor: accentBorder,
                  background: `${accentColor}10`,
                  boxShadow: `0 0 12px ${accentColor}22`,
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-1.5 font-bold" style={{ color: accentColor }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#71717a]">{f.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-16 h-px w-full bg-gradient-to-r from-transparent via-[#c084fc33] to-transparent" />
    </section>
  );
}
