/**
 * Battle Pass Service — Starter Game
 *
 * Seasonal progression with free and premium tracks.
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
      id: "season_1",
      name: "Season 1: Uprising",
      description: "The first season of competitive play",
      active: true,
      startTime: 0,
      endTime: 9999999999,
      tiers: [
        {
          tier: 1,
          xpRequired: 100,
          rewards: [
            {
              id: "s1_t1_free",
              name: "100 Coins",
              track: "free",
              rewardType: "currency",
              payload: { coins: 100 },
            },
            {
              id: "s1_t1_premium",
              name: "Gold Hat",
              track: "premium",
              rewardType: "cosmetic",
              payload: { cosmeticId: "gold_hat" },
            },
          ],
        },
        {
          tier: 2,
          xpRequired: 200,
          rewards: [
            {
              id: "s1_t2_free",
              name: "Speed Boost",
              track: "free",
              rewardType: "item",
              payload: { itemId: "speed_boost" },
            },
          ],
        },
        {
          tier: 3,
          xpRequired: 300,
          rewards: [
            {
              id: "s1_t3_free",
              name: "500 Coins",
              track: "free",
              rewardType: "currency",
              payload: { coins: 500 },
            },
            {
              id: "s1_t3_premium",
              name: "Flame Trail",
              track: "premium",
              rewardType: "cosmetic",
              payload: { cosmeticId: "flame_trail" },
            },
          ],
        },
        {
          tier: 4,
          xpRequired: 500,
          rewards: [
            {
              id: "s1_t4_free",
              name: "Common Pet Egg",
              track: "free",
              rewardType: "egg",
              payload: { eggId: "basic_egg" },
            },
            {
              id: "s1_t4_premium",
              name: "Premium Pet Egg",
              track: "premium",
              rewardType: "egg",
              payload: { eggId: "premium_egg" },
            },
          ],
        },
        {
          tier: 5,
          xpRequired: 750,
          rewards: [
            {
              id: "s1_t5_free",
              name: "Champion Title",
              track: "free",
              rewardType: "title",
              payload: { title: "Champion" },
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
        logger.info(`Saved battle pass data for player ${playerId}`);
      }
    });
    logger.info("BattlePassService stopped.");
  },
};

export function initPlayerBattlePass(playerId: number): BattlePassStore {
  const store = new BattlePassStore(playerId, seasonRegistry, {
    datastoreName: "StarterBattlePass",
    enableLogging: true,
  });
  store.init();
  store.load();
  // Auto-set to active season
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
