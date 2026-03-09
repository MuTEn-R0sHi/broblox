/**
 * World Configuration Definitions
 *
 * Central registry of all worlds in the obby game.
 * Imported by both server (WorldService) and shared code.
 */

import type { WorldConfig } from "./types";

export const WORLD_CONFIGS: Record<string, WorldConfig> = {
  grasslands: {
    id: "grasslands",
    displayName: "Grasslands",
    description: "A bright, cheerful parkour course through green meadows.",
    difficulty: "easy",
    unlockRequirements: { speed: 0, jump: 0, stamina: 0 },
    stageCount: 6,
    coinMultiplier: 1.0,
  },
  // Future worlds:
  // lava_caves: { ... unlockRequirements: { speed: 15, jump: 40, stamina: 10 } },
  // sky_kingdom: { ... unlockRequirements: { speed: 20, jump: 55, stamina: 18 } },
};

export function getWorldConfig(worldId: string): WorldConfig | undefined {
  return WORLD_CONFIGS[worldId];
}
