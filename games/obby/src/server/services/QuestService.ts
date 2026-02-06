/**
 * Quest Service — Obby Game
 *
 * Per-player obby-themed quests (complete stages, collect items, speedruns).
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
    // ----- Register obby quest definitions -----
    registry.register({
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
    });

    registry.register({
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
    });

    registry.register({
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
    });

    registry.register({
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
    maxActiveQuests: 8,
    datastoreName: "ObbyQuests",
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
