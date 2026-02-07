/**
 * Factory for game-level TutorialService.
 *
 * Encapsulates sequence registry + per-player tutorial manager lifecycle.
 */

import { Service, createLogger } from "@rbx/core";
import { TutorialSequence, TutorialConfig } from "./types";
import { SequenceRegistry } from "./sequence-registry";
import { TutorialManager } from "./tutorial-manager";

export interface TutorialServiceConfig {
  /** Tutorial sequences to register. */
  sequences: TutorialSequence[];
  /** DataStore name, e.g. "StarterTutorial". */
  datastoreName: string;
  /** Extra TutorialManager options. */
  storeOptions?: Partial<TutorialConfig>;
}

export interface TutorialServiceHandle {
  Service: Service;
  getSequenceRegistry(): SequenceRegistry;
  getTutorialManager(playerId: number): TutorialManager | undefined;
  initPlayer(playerId: number): TutorialManager;
  cleanupPlayer(playerId: number): void;
}

export function createTutorialService(config: TutorialServiceConfig): TutorialServiceHandle {
  const logger = createLogger("TutorialService");
  const sequenceRegistry = new SequenceRegistry();
  const playerTutorials = new Map<number, TutorialManager>();

  return {
    Service: {
      name: "TutorialService",

      onInit() {
        for (const seq of config.sequences) {
          sequenceRegistry.register(seq);
        }
        logger.info(`Tutorial sequences registered: ${sequenceRegistry.count()}`);
      },

      onStart() {
        logger.info("TutorialService started.");
      },

      onDestroy() {
        playerTutorials.forEach((_mgr, playerId) => {
          logger.info(`Tutorial cleanup for player ${playerId}`);
        });
        logger.info("TutorialService stopped.");
      },
    },

    getSequenceRegistry() {
      return sequenceRegistry;
    },

    getTutorialManager(playerId: number) {
      return playerTutorials.get(playerId);
    },

    initPlayer(playerId: number) {
      const mgr = new TutorialManager(playerId, sequenceRegistry, {
        datastoreName: config.datastoreName,
        enableLogging: true,
        ...config.storeOptions,
      });
      playerTutorials.set(playerId, mgr);
      logger.info(`Tutorial loaded for player ${playerId}`);
      return mgr;
    },

    cleanupPlayer(playerId: number) {
      const mgr = playerTutorials.get(playerId);
      if (mgr && mgr.isDirty()) {
        mgr.markClean();
      }
      playerTutorials.delete(playerId);
    },
  };
}
