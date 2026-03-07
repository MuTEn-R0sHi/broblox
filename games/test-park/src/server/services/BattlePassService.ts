/**
 * Battle Pass Service — Test Park
 *
 * Seasonal progression with free and premium tracks.
 * Uses the createBattlePassService factory from @broblox/battle-pass.
 */

import { createBattlePassService } from "@broblox/battle-pass";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createBattlePassService({
  seasons: [
    {
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
              reward: { type: "currency", amount: 100 },
            },
            {
              id: "s1_t1_premium",
              name: "Gold Hat",
              track: "premium",
              reward: { type: "cosmetic", amount: 1, itemId: "gold_hat" },
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
              reward: { type: "item", amount: 1, itemId: "speed_boost" },
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
              reward: { type: "currency", amount: 500 },
            },
            {
              id: "s1_t3_premium",
              name: "Flame Trail",
              track: "premium",
              reward: { type: "cosmetic", amount: 1, itemId: "flame_trail" },
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
              reward: { type: "custom", amount: 1, itemId: "basic_egg", label: "egg" },
            },
            {
              id: "s1_t4_premium",
              name: "Premium Pet Egg",
              track: "premium",
              reward: { type: "custom", amount: 1, itemId: "premium_egg", label: "egg" },
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
              reward: { type: "custom", amount: 1, itemId: "Champion", label: "title" },
            },
          ],
        },
      ],
    },
  ],
  datastoreName: "TestParkBattlePass",
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const BattlePassService = handle.Service;
export const getSeasonRegistry = () => handle.getSeasonRegistry();
export const getBattlePassStore = (playerId: number) => handle.getBattlePassStore(playerId);
export const initPlayerBattlePass = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerBattlePass = (playerId: number) => handle.cleanupPlayer(playerId);
