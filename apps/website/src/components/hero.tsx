import Image from "next/image";

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-24">
      {/* Grid background */}
      <div className="grid-bg absolute inset-0 opacity-60" />

      {/* Radial gradient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan opacity-[0.06] blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-96 w-96 translate-x-1/2 -translate-y-1/3 rounded-full bg-purple opacity-[0.06] blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        {/* Logo */}
        <div className="animate-float">
          <Image
            src="/logo.png"
            alt="BroBlox"
            width={200}
            height={200}
            className="drop-shadow-[0_0_30px_#00e5ff55] sm:w-[240px]"
            priority
          />
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-3">
          <h1 className="text-5xl font-black tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="shimmer-text">BroBlox</span>
          </h1>
          <p className="text-lg font-medium text-subtle sm:text-xl md:text-2xl">
            Two bros. <span className="font-semibold text-cyan">Building</span> Roblox games.
          </p>
        </div>

        {/* Sub-tagline */}
        <p className="max-w-lg text-sm text-muted sm:text-base">
          Free-to-play games packed with leaderboards, achievements, live events, and cosmetics.
          Jump in, no cost required.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <a
            href="#games"
            className="animate-pulse-cyan inline-flex items-center justify-center rounded-xl border border-cyan-border bg-cyan-bg px-8 py-3.5 text-sm font-bold text-cyan transition-all duration-200 hover:bg-cyan-hover hover:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan focus:ring-offset-2 focus:ring-offset-background"
          >
            Explore Games
          </a>
          <a
            href="/games"
            className="inline-flex items-center justify-center rounded-xl border border-purple-border bg-purple-faint px-8 py-3.5 text-sm font-bold text-purple transition-all duration-200 hover:bg-purple-hover hover:border-purple hover:glow-purple focus:outline-none focus:ring-2 focus:ring-purple focus:ring-offset-2 focus:ring-offset-background"
          >
            Browse All Games
          </a>
        </div>

        {/* Scroll hint */}
        <div className="mt-8 flex flex-col items-center gap-2 opacity-40">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="h-10 w-px bg-linear-to-b from-cyan to-transparent" />
        </div>
      </div>
    </section>
  );
}
