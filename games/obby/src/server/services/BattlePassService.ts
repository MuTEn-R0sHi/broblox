/**
 * Battle Pass Service — Obby Game
 *
 * Seasonal progression with obby-themed rewards.
 */

import { Service, createLogger } from "@rbx/core";
import { SeasonRegistry, BattlePassStore } from "@rbx/battle-pass";

const logger = createLogger("BattlePassService");

const seasonRegistry = new SeasonRegistry();
const playerBattlePass = new Map<number, BattlePassStore>();

export function getSeasonRegistry(): SeasonRegistry {
  return seasonRegistry;
}

export function getBattlePassStore(playerId: number): BattlePassStore | undefined {
  return playerBattlePass.get(playerId);
}

export const BattlePassService: Service = {
  onInit() {
    seasonRegistry.register({
      id: "obby_s1",
      name: "Obby Season 1: Sky High",
      description: "Reach new heights",
      active: true,
      startTime: 0,
      endTime: 9999999999,
      tiers: [
        {
          tier: 1,
          xpRequired: 50,
          rewards: [
            {
              id: "os1_t1_free",
              name: "10 Stars",
              track: "free",
              rewardType: "currency",
              payload: { stars: 10 },
            },
          ],
        },
        {
          tier: 2,
          xpRequired: 100,
          rewards: [
            {
              id: "os1_t2_free",
              name: "Stage Skip",
              track: "free",
              rewardType: "item",
              payload: { itemId: "skip_stage" },
            },
            {
              id: "os1_t2_premium",
              name: "Rainbow Trail",
              track: "premium",
              rewardType: "cosmetic",
              payload: { cosmeticId: "rainbow_trail" },
            },
          ],
        },
        {
          tier: 3,
          xpRequired: 200,
          rewards: [
            {
              id: "os1_t3_free",
              name: "Sky Egg",
              track: "free",
              rewardType: "egg",
              payload: { eggId: "sky_egg" },
            },
            {
              id: "os1_t3_premium",
              name: "Crown",
              track: "premium",
              rewardType: "cosmetic",
              payload: { cosmeticId: "crown_hat" },
            },
          ],
        },
      ],
    });

    logger.info(`Season registry initialized — ${seasonRegistry.count()} seasons.`);
  },

  onStart() {
    logger.info("BattlePassService started.");
  },

  onDestroy() {
    playerBattlePass.forEach((store, playerId) => {
      if (store.isDirty()) {
        store.save();
        logger.info(`Saved battle pass for player ${playerId}`);
      }
    });
    logger.info("BattlePassService stopped.");
  },
};

export function initPlayerBattlePass(playerId: number): BattlePassStore {
  const store = new BattlePassStore(playerId, seasonRegistry, {
    datastoreName: "ObbyBattlePass",
    enableLogging: true,
  });
  store.init();
  store.load();
  const active = seasonRegistry.getActive();
  if (active !== undefined) {
    store.setSeason(active.id);
  }
  playerBattlePass.set(playerId, store);
  logger.info(`Battle pass loaded for player ${playerId}`);
  return store;
}

export function cleanupPlayerBattlePass(playerId: number): void {
  const store = playerBattlePass.get(playerId);
  if (store && store.isDirty()) {
    store.save();
  }
  playerBattlePass.delete(playerId);
}
