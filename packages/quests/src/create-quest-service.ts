/**
 * Factory for game-level QuestService.
 *
 * Encapsulates quest registry + per-player quest store lifecycle.
 */

import { Service, createLogger } from "@rbx/core";
import { QuestDefinition, QuestsConfig } from "./types";
import { QuestRegistry } from "./quest-registry";
import { QuestStore } from "./quest-store";

export interface QuestServiceConfig {
  /** Quest definitions to register. */
  quests: QuestDefinition[];
  /** DataStore name, e.g. "StarterQuests". */
  datastoreName: string;
  /** Maximum active quests per player. */
  maxActiveQuests?: number;
  /** Extra QuestStore options. */
  storeOptions?: Partial<QuestsConfig>;
}

export interface QuestServiceHandle {
  Service: Service;
  getQuestRegistry(): QuestRegistry;
  getQuestStore(playerId: number): QuestStore | undefined;
  initPlayer(playerId: number): QuestStore;
  cleanupPlayer(playerId: number): void;
}

export function createQuestService(config: QuestServiceConfig): QuestServiceHandle {
  const logger = createLogger("QuestService");
  const questRegistry = new QuestRegistry();
  const playerQuests = new Map<number, QuestStore>();

  return {
    Service: {
      name: "QuestService",

      onInit() {
        for (const quest of config.quests) {
          questRegistry.register(quest);
        }
        logger.info(`Quest registry initialized — ${questRegistry.count()} quests.`);
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
    },

    getQuestRegistry() {
      return questRegistry;
    },

    getQuestStore(playerId: number) {
      return playerQuests.get(playerId);
    },

    initPlayer(playerId: number) {
      const store = new QuestStore(playerId, questRegistry, {
        datastoreName: config.datastoreName,
        maxActiveQuests: config.maxActiveQuests ?? 10,
        enableLogging: true,
        ...config.storeOptions,
      });
      store.init();
      store.load();
      playerQuests.set(playerId, store);
      logger.info(`Quests loaded for player ${playerId}`);
      return store;
    },

    cleanupPlayer(playerId: number) {
      const store = playerQuests.get(playerId);
      if (store && store.isDirty()) {
        store.save();
      }
      playerQuests.delete(playerId);
    },
  };
}
