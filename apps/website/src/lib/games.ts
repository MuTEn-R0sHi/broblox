export interface Game {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  tags: string[];
  genre: string;
  status: "live" | "coming-soon";
  accent: "cyan" | "purple";
  highlights: string[];
  features: { title: string; description: string }[];
  robloxUrl: string | null;
  robloxUniverseId: string | null;
}

export const games: Game[] = [
  {
    slug: "obby",
    name: "BroBlox Obby",
    shortDescription:
      "An obstacle course adventure with checkpoints, timed stages, and a global leaderboard. How fast can you finish?",
    longDescription:
      "Race through increasingly difficult stages packed with traps, jumps, and moving obstacles. Every checkpoint saves your progress, so you can keep pushing without starting over. Earn coins for completing stages and climb the all-time leaderboard for fastest clears. Weekly events bring fresh challenges and limited rewards.",
    tags: ["Obby", "Parkour", "Leaderboards", "Coins"],
    genre: "Obstacle Course",
    status: "live",
    accent: "cyan",
    highlights: ["Checkpoint saves", "Stage timers", "Coin rewards"],
    features: [
      {
        title: "Checkpoint System",
        description:
          "Progress saved at every checkpoint. Respawn at your last reached point — no more starting from scratch.",
      },
      {
        title: "Stage Leaderboards",
        description:
          "Per-stage rankings track best times, completions, and deaths. Compete with players worldwide.",
      },
      {
        title: "Coins & Rewards",
        description:
          "Earn coins for completing stages. Bonus multipliers for speed runs. Spend in the accessory shop.",
      },
      {
        title: "Weekly Events",
        description:
          "Rotating timed challenges with exclusive cosmetic rewards only available during the event window.",
      },
    ],
    robloxUrl: process.env.NEXT_PUBLIC_ROBLOX_GAME_URL_OBBY ?? "https://www.roblox.com",
    robloxUniverseId: process.env.NEXT_PUBLIC_ROBLOX_UNIVERSE_ID_OBBY ?? null,
  },
  {
    slug: "test-park",
    name: "Test Park",
    shortDescription:
      "Our internal sandbox playground. We use it to test platform features — public access is coming soon.",
    longDescription:
      "Test Park is BroBlox's behind-the-scenes sandbox — a staff-only space where we test new platform features, run experiments, and break things before they ship. Think of it as our dev playground. Public access is on the roadmap.",
    tags: ["Sandbox", "Internal", "Dev Playground"],
    genre: "Sandbox",
    status: "coming-soon",
    accent: "purple",
    highlights: ["Staff-only", "Feature testing", "Coming soon"],
    features: [
      {
        title: "Feature Testing",
        description:
          "Every platform feature gets tested here first — combat, quests, pets, gacha, and more.",
      },
      {
        title: "Auto-Generated Zones",
        description:
          "The map builds itself from a zone registry at runtime. New zones appear as we add features.",
      },
      {
        title: "Coming Soon",
        description:
          "We're working toward opening Test Park to everyone, with phased playtests and limited-time preview events planned.",
      },
      {
        title: "Community Hub",
        description:
          "Meet other BroBlox players. Our community Discord links directly from the in-game menu.",
      },
    ],
    robloxUrl: process.env.NEXT_PUBLIC_ROBLOX_GAME_URL_TEST_PARK ?? null,
    robloxUniverseId: process.env.NEXT_PUBLIC_ROBLOX_UNIVERSE_ID_TEST_PARK ?? null,
  },
];

export function getGame(slug: string): Game | undefined {
  return games.find((g) => g.slug === slug);
}

export const accentColors = {
  cyan: {
    text: "#00e5ff",
    bg: "#00e5ff0d",
    bgStrong: "#00e5ff1a",
    border: "#00e5ff33",
    borderHover: "#00e5ff66",
    glow: "0 0 24px #00e5ff33",
  },
  purple: {
    text: "#c084fc",
    bg: "#c084fc0d",
    bgStrong: "#c084fc1a",
    border: "#c084fc33",
    borderHover: "#c084fc66",
    glow: "0 0 24px #c084fc33",
  },
} as const;
