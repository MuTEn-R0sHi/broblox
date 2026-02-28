/**
 * Battle Pass Service — Obby Game
 *
 * Seasonal progression with obby-themed rewards.
 */

import { createBattlePassService } from "@broblox/battle-pass";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

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
              name: "50 Coins",
              track: "free",
              reward: { type: "currency", amount: 50 },
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
              name: "150 Coins",
              track: "free",
              reward: { type: "currency", amount: 150 },
            },
            {
              id: "os1_t3_premium",
              name: "200 XP Boost",
              track: "premium",
              reward: { type: "boost", amount: 2 },
            },
          ],
        },
        {
          tier: 4,
          xpRequired: 350,
          rewards: [
            {
              id: "os1_t4_free",
              name: "Checkpoint Token x3",
              track: "free",
              reward: { type: "item", amount: 3, itemId: "checkpoint_token" },
            },
            {
              id: "os1_t4_premium",
              name: "Speed Coil",
              track: "premium",
              reward: { type: "item", amount: 1, itemId: "speed_coil" },
            },
          ],
        },
        {
          tier: 5,
          xpRequired: 500,
          rewards: [
            {
              id: "os1_t5_free",
              name: "Sky Egg",
              track: "free",
              reward: { type: "custom", amount: 1, itemId: "sky_egg", label: "egg" },
            },
            {
              id: "os1_t5_premium",
              name: "Sparkle Effect",
              track: "premium",
              reward: { type: "cosmetic", amount: 1, itemId: "sparkle_effect" },
            },
          ],
        },
        {
          tier: 6,
          xpRequired: 700,
          rewards: [
            {
              id: "os1_t6_free",
              name: "300 Coins",
              track: "free",
              reward: { type: "currency", amount: 300 },
            },
          ],
        },
        {
          tier: 7,
          xpRequired: 900,
          rewards: [
            {
              id: "os1_t7_free",
              name: "Stage Skip x2",
              track: "free",
              reward: { type: "item", amount: 2, itemId: "skip_stage" },
            },
            {
              id: "os1_t7_premium",
              name: "Gravity Coil",
              track: "premium",
              reward: { type: "item", amount: 1, itemId: "gravity_coil" },
            },
          ],
        },
        {
          tier: 8,
          xpRequired: 1200,
          rewards: [
            {
              id: "os1_t8_free",
              name: "500 Coins",
              track: "free",
              reward: { type: "currency", amount: 500 },
            },
            {
              id: "os1_t8_premium",
              name: "500 XP Boost",
              track: "premium",
              reward: { type: "boost", amount: 5 },
            },
          ],
        },
        {
          tier: 9,
          xpRequired: 1600,
          rewards: [
            {
              id: "os1_t9_free",
              name: "Sky Egg x2",
              track: "free",
              reward: { type: "custom", amount: 2, itemId: "sky_egg", label: "egg" },
            },
            {
              id: "os1_t9_premium",
              name: "Fire Trail",
              track: "premium",
              reward: { type: "item", amount: 1, itemId: "trail_fire" },
            },
          ],
        },
        {
          tier: 10,
          xpRequired: 2000,
          rewards: [
            {
              id: "os1_t10_free",
              name: "1000 Coins",
              track: "free",
              reward: { type: "currency", amount: 1000 },
            },
            {
              id: "os1_t10_premium",
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
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const BattlePassService = handle.Service;
export const getSeasonRegistry = () => handle.getSeasonRegistry();
export const getBattlePassStore = (playerId: number) => handle.getBattlePassStore(playerId);
export const initPlayerBattlePass = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerBattlePass = (playerId: number) => handle.cleanupPlayer(playerId);
