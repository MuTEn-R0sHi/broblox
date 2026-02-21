/**
 * Seed script — registers platform games in the dashboard database.
 *
 * Run:  pnpm db:seed
 *
 * Safe to run multiple times (uses upsert on slug).
 *
 * Universe/place IDs are read from the same env vars used by CI
 * (GitHub Actions repository variables). To seed locally, either:
 *
 *   a) add them to apps/dashboard/.env:
 *        STARTER_DEV_UNIVERSE_ID=123
 *        STARTER_DEV_PLACE_ID=456
 *        ...etc
 *
 *   b) pass inline:
 *        STARTER_DEV_UNIVERSE_ID=123 ... pnpm db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function bigint(val: string | undefined): bigint | null {
  if (!val || val.trim() === "" || val.trim() === "0") return null;
  try {
    return BigInt(val.trim());
  } catch {
    return null;
  }
}

const e = process.env;

const GAMES = [
  {
    slug: "starter",
    name: "Starter Game",
    description: "Starter combat/template game using the rbx-game-platform skeleton.",
    universeIdDev: bigint(e.STARTER_DEV_UNIVERSE_ID),
    placeIdDev: bigint(e.STARTER_DEV_PLACE_ID),
    universeIdStage: bigint(e.STARTER_STAGING_UNIVERSE_ID),
    placeIdStage: bigint(e.STARTER_STAGING_PLACE_ID),
    universeIdProd: bigint(e.STARTER_PROD_UNIVERSE_ID),
    placeIdProd: bigint(e.STARTER_PROD_PLACE_ID),
  },
  {
    slug: "obby",
    name: "Obby",
    description: "Obstacle course game template using rbx-game-platform.",
    universeIdDev: bigint(e.OBBY_DEV_UNIVERSE_ID),
    placeIdDev: bigint(e.OBBY_DEV_PLACE_ID),
    universeIdStage: bigint(e.OBBY_STAGING_UNIVERSE_ID),
    placeIdStage: bigint(e.OBBY_STAGING_PLACE_ID),
    universeIdProd: bigint(e.OBBY_PROD_UNIVERSE_ID),
    placeIdProd: bigint(e.OBBY_PROD_PLACE_ID),
  },
];

async function main() {
  console.log("Seeding games…\n");

  for (const game of GAMES) {
    const { slug, name, description, ...ids } = game;
    const result = await prisma.game.upsert({
      where: { slug },
      update: { name, description, ...ids },
      create: { slug, name, description, ...ids },
    });

    const linked =
      [
        result.universeIdDev ? "dev" : null,
        result.universeIdStage ? "stage" : null,
        result.universeIdProd ? "prod" : null,
      ]
        .filter(Boolean)
        .join(", ") || "none — fill in from /dashboard/games";

    console.log(`  ✓  ${result.name}  (slug: ${result.slug}, linked envs: ${linked})`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
