/**
 * Quest Service — Obby Game
 *
 * Per-player obby-themed quests (complete stages, collect items, speedruns).
 * Uses the @rbx/quests package.
 */

import { createQuestService } from "@rbx/quests";
import { Players } from "@rbxts/services";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { RemoteService } from "./RemoteService";

const handle = createQuestService({
  quests: [
    {
      id: "daily_stages_5",
      name: "Stage Sprinter",
      description: "Complete 5 stages today.",
      schedule: "daily",
      tier: "common",
      objectives: [
        { id: "obj_stages", description: "Complete stages", type: "stage_complete", target: 5 },
      ],
      rewards: [
        { type: "xp", amount: 300 },
        { type: "currency", amount: 75 },
      ],
    },
    {
      id: "daily_collect_tokens",
      name: "Token Collector",
      description: "Collect 10 tokens scattered through the obby.",
      schedule: "daily",
      tier: "common",
      objectives: [
        { id: "obj_tokens", description: "Collect tokens", type: "collect", target: 10 },
      ],
      rewards: [
        { type: "xp", amount: 200 },
        { type: "currency", amount: 50 },
      ],
    },
    {
      id: "weekly_stages_25",
      name: "Obby Marathon",
      description: "Complete 25 stages this week.",
      schedule: "weekly",
      tier: "rare",
      objectives: [
        { id: "obj_stages", description: "Complete stages", type: "stage_complete", target: 25 },
      ],
      rewards: [
        { type: "xp", amount: 2000 },
        { type: "currency", amount: 400 },
        { type: "item", amount: 1, itemId: "skip_stage" },
      ],
    },
    {
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
      rewards: [
        { type: "xp", amount: 3000 },
        { type: "currency", amount: 750 },
        { type: "item", amount: 1, itemId: "trail_fire" },
      ],
    },
  ],
  datastoreName: "ObbyQuests",
  maxActiveQuests: 8,
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
  onQuestCompleted: (event) => {
    const player = Players.GetPlayerByUserId(event.playerId);
    if (player !== undefined) {
      RemoteService.getRegistry().fireClient("QuestCompleted", player, {
        questId: event.questId,
        rewards: event.rewards,
      });
    }
  },
});

export const QuestService = handle.Service;
export const getQuestRegistry = () => handle.getQuestRegistry();
export const getQuests = (playerId: number) => handle.getQuestStore(playerId);
export const cleanupPlayerQuests = (playerId: number) => handle.cleanupPlayer(playerId);
