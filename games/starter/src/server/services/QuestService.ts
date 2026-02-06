/**
 * Quest Service — Starter Game
 *
 * Per-player quest tracking with daily/weekly objectives.
 * Uses the @rbx/quests package.
 */

import { Service, createLogger } from "@rbx/core";
import { QuestRegistry, QuestStore } from "@rbx/quests";

const logger = createLogger("QuestService");

const registry = new QuestRegistry();
const playerQuests = new Map<number, QuestStore>();

export function getQuestRegistry(): QuestRegistry {
  return registry;
}

export function getQuests(playerId: number): QuestStore | undefined {
  return playerQuests.get(playerId);
}

export const QuestService: Service = {
  onInit() {
    // ----- Register quest definitions -----
    registry.register({
      id: "daily_kill_10",
      name: "Eliminate 10 Enemies",
      description: "Defeat 10 enemies in any area.",
      schedule: "daily",
      tier: "common",
      objectives: [{ id: "obj_kill", description: "Kill enemies", type: "kill", target: 10 }],
      xpReward: 500,
      currencyReward: 100,
    });

    registry.register({
      id: "daily_collect_5",
      name: "Treasure Hunter",
      description: "Collect 5 items from the world.",
      schedule: "daily",
      tier: "common",
      objectives: [{ id: "obj_collect", description: "Collect items", type: "collect", target: 5 }],
      xpReward: 300,
      currencyReward: 50,
    });

    registry.register({
      id: "weekly_kills_50",
      name: "Weekly Warrior",
      description: "Defeat 50 enemies this week.",
      schedule: "weekly",
      tier: "rare",
      objectives: [{ id: "obj_kill", description: "Kill enemies", type: "kill", target: 50 }],
      xpReward: 2500,
      currencyReward: 500,
      itemRewards: ["health_potion"],
    });

    registry.register({
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
    });

    logger.info(`Quest registry initialized — ${registry.count()} quests registered.`);
  },

  onStart() {
    logger.info("QuestService started.");
  },

  onDestroy() {
    playerQuests.forEach((store, playerId) => {
      if (store.isDirty()) {
        store.save();
        logger.info(`Saved quests for player ${playerId}`);
      }
    });
    logger.info("QuestService stopped.");
  },
};

/**
 * Initialize quests for a player (call from PlayerLifecycleService).
 */
export function initPlayerQuests(playerId: number): QuestStore {
  const store = new QuestStore(playerId, registry, {
    maxActiveQuests: 10,
    datastoreName: "StarterQuests",
    enableLogging: true,
  });
  store.init();
  store.load();

  store.onQuestCompleted((event) => {
    logger.info(
      `Player ${event.playerId} completed quest: ${event.questId} (+${event.xpReward} XP)`
    );
  });

  playerQuests.set(playerId, store);
  logger.info(`Quests loaded for player ${playerId}`);
  return store;
}

/**
 * Cleanup quests for a player (call from PlayerLifecycleService).
 */
export function cleanupPlayerQuests(playerId: number): void {
  const store = playerQuests.get(playerId);
  if (store && store.isDirty()) {
    store.save();
  }
  playerQuests.delete(playerId);
}
