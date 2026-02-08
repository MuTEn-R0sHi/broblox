/**
 * Battle Pass Service — Obby Game
 *
 * Seasonal progression with obby-themed rewards.
 */

import { createBattlePassService } from "@rbx/battle-pass";

const handle = createBattlePassService({
  seasons: [
    {
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
              reward: { type: "currency", amount: 10 },
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
              reward: { type: "item", amount: 1, itemId: "skip_stage" },
            },
            {
              id: "os1_t2_premium",
              name: "Rainbow Trail",
              track: "premium",
              reward: { type: "cosmetic", amount: 1, itemId: "rainbow_trail" },
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
              reward: { type: "custom", amount: 1, itemId: "sky_egg", label: "egg" },
            },
            {
              id: "os1_t3_premium",
              name: "Crown",
              track: "premium",
              reward: { type: "cosmetic", amount: 1, itemId: "crown_hat" },
            },
          ],
        },
      ],
    },
  ],
  datastoreName: "ObbyBattlePass",
});

export const BattlePassService = handle.Service;
export const getSeasonRegistry = () => handle.getSeasonRegistry();
export const getBattlePassStore = (playerId: number) => handle.getBattlePassStore(playerId);
export const initPlayerBattlePass = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerBattlePass = (playerId: number) => handle.cleanupPlayer(playerId);
