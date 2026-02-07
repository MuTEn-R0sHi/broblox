/**
 * Quest Service — Starter Game
 *
 * Per-player quest tracking with daily/weekly objectives.
 */

import { createQuestService } from "@rbx/quests";
import { createLogger } from "@rbx/core";

const logger = createLogger("QuestService");

const handle = createQuestService({
  quests: [
    {
      id: "daily_kill_10",
      name: "Eliminate 10 Enemies",
      description: "Defeat 10 enemies in any area.",
      schedule: "daily",
      tier: "common",
      objectives: [{ id: "obj_kill", description: "Kill enemies", type: "kill", target: 10 }],
      xpReward: 500,
      currencyReward: 100,
    },
    {
      id: "daily_collect_5",
      name: "Treasure Hunter",
      description: "Collect 5 items from the world.",
      schedule: "daily",
      tier: "common",
      objectives: [{ id: "obj_collect", description: "Collect items", type: "collect", target: 5 }],
      xpReward: 300,
      currencyReward: 50,
    },
    {
      id: "weekly_kills_50",
      name: "Weekly Warrior",
      description: "Defeat 50 enemies this week.",
      schedule: "weekly",
      tier: "rare",
      objectives: [{ id: "obj_kill", description: "Kill enemies", type: "kill", target: 50 }],
      xpReward: 2500,
      currencyReward: 500,
      itemRewards: ["health_potion"],
    },
    {
      id: "weekly_explore",
      name: "Explorer",
      description: "Visit 3 different areas and collect 10 items.",
      schedule: "weekly",
      tier: "uncommon",
      objectives: [
        { id: "obj_visit", description: "Visit areas", type: "visit", target: 3 },
        { id: "obj_collect", description: "Collect items", type: "collect", target: 10 },
      ],
      xpReward: 1500,
      currencyReward: 300,
    },
  ],
  datastoreName: "StarterQuests",
  maxActiveQuests: 10,
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
