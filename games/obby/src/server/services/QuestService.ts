/**
 * Quest Service — Obby Game
 *
 * Per-player obby-themed quests (complete stages, collect items, speedruns).
 * Uses the @rbx/quests package.
 */

import { createQuestService } from "@rbx/quests";
import { createLogger } from "@rbx/core";

const logger = createLogger("QuestService");

const handle = createQuestService({
  quests: [
    {
      id: "daily_stages_5",
      name: "Stage Sprinter",
      description: "Complete 5 stages today.",
      schedule: "daily",
      tier: "common",
      objectives: [
        { id: "obj_stages", description: "Complete stages", type: "stage_complete", target: 5 },
      ],
      xpReward: 300,
      currencyReward: 75,
    },
    {
      id: "daily_collect_tokens",
      name: "Token Collector",
      description: "Collect 10 tokens scattered through the obby.",
      schedule: "daily",
      tier: "common",
      objectives: [
        { id: "obj_tokens", description: "Collect tokens", type: "collect", target: 10 },
      ],
      xpReward: 200,
      currencyReward: 50,
    },
    {
      id: "weekly_stages_25",
      name: "Obby Marathon",
      description: "Complete 25 stages this week.",
      schedule: "weekly",
      tier: "rare",
      objectives: [
        { id: "obj_stages", description: "Complete stages", type: "stage_complete", target: 25 },
      ],
      xpReward: 2000,
      currencyReward: 400,
      itemRewards: ["skip_stage"],
    },
    {
      id: "weekly_no_deaths",
      name: "Deathless Run",
      description: "Complete 10 stages without dying.",
      schedule: "weekly",
      tier: "epic",
      objectives: [
        {
          id: "obj_deathless",
          description: "Stages without dying",
          type: "deathless_stages",
          target: 10,
        },
      ],
      xpReward: 3000,
      currencyReward: 750,
      itemRewards: ["trail_fire"],
    },
  ],
  datastoreName: "ObbyQuests",
  maxActiveQuests: 8,
});

export const QuestService = handle.Service;
export const getQuestRegistry = () => handle.getQuestRegistry();
export const getQuests = (playerId: number) => handle.getQuestStore(playerId);
export const cleanupPlayerQuests = (playerId: number) => handle.cleanupPlayer(playerId);

/** Initialize quests for a player — adds game-specific event callbacks. */
export function initPlayerQuests(playerId: number) {
  const store = handle.initPlayer(playerId);
  store.onQuestCompleted((event) => {
    logger.info(
      `Player ${event.playerId} completed quest: ${event.questId} (+${event.xpReward} XP)`
    );
  });
  return store;
}
