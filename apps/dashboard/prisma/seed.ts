/**
 * Seed script — registers platform games in the dashboard database.
 *
 * Run:  pnpm db:seed
 *
 * Safe to run multiple times (uses upsert on slug).
 * Roblox universe/place IDs are left null here — fill them in from the
 * dashboard UI at /dashboard/games once the game is published to Roblox.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GAMES = [
  {
    slug: "starter",
    name: "Starter Game",
    description: "Starter combat/template game using the rbx-game-platform skeleton.",
  },
  {
    slug: "obby",
    name: "Obby",
    description: "Obstacle course game template using rbx-game-platform.",
  },
];

async function main() {
  console.log("Seeding games…\n");

  for (const game of GAMES) {
    const result = await prisma.game.upsert({
      where: { slug: game.slug },
      update: {
        name: game.name,
        description: game.description,
      },
      create: {
        slug: game.slug,
        name: game.name,
        description: game.description,
      },
    });
    console.log(`  ✓  ${result.name}  (slug: ${result.slug}, id: ${result.id})`);
  }

  console.log("\nDone. Fill in Roblox universe/place IDs at /dashboard/games.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
