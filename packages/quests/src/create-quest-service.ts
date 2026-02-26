/**
 * Factory for game-level QuestService.
 *
 * Encapsulates quest registry + per-player quest store lifecycle.
 */

import { Service, createLogger } from "@broblox/core";
import { QuestDefinition, QuestsConfig, QuestCompletedEvent } from "./types";
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
  /**
   * Wires player-leave cleanup.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerRemoving(cb)`
   */
  onPlayerRemoving?: (callback: (player: Player) => void) => void;
  /**
   * Wires player-join initialization.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerAdded(cb)`
   */
  onPlayerAdded?: (callback: (player: Player) => void) => void;
  /**
   * Fired when a player completes a quest.
   * Receives the full completed-quest event so callers can fire remotes, grant
   * rewards, etc.
   */
  onQuestCompleted?: (event: QuestCompletedEvent) => void;
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

  const handle: QuestServiceHandle = {
    Service: {
      name: "QuestService",

      onInit() {
        for (const quest of config.quests) {
          questRegistry.register(quest);
        }
        logger.info(`Quest registry initialized — ${questRegistry.count()} quests.`);
        config.onPlayerRemoving?.((player) => {
          const store = playerQuests.get(player.UserId);
          if (store && store.isDirty()) {
            store.save();
          }
          playerQuests.delete(player.UserId);
        });
      },

      onStart() {
        logger.info("QuestService started.");
        config.onPlayerAdded?.((player) => handle.initPlayer(player.UserId));
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
      if (config.onQuestCompleted) {
        store.onQuestCompleted((event) => {
          config.onQuestCompleted!(event);
        });
      }
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
  return handle;
}
