/**
 * Quest Service — Starter Game
 *
 * Per-player quest tracking with daily/weekly objectives.
 */

import { createQuestService } from "@rbx/quests";
import { Players } from "@rbxts/services";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { RemoteService } from "./RemoteService";

const handle = createQuestService({
  quests: [
    {
      id: "daily_kill_10",
      name: "Eliminate 10 Enemies",
      description: "Defeat 10 enemies in any area.",
      schedule: "daily",
      tier: "common",
      objectives: [{ id: "obj_kill", description: "Kill enemies", type: "kill", target: 10 }],
      rewards: [
        { type: "xp", amount: 500 },
        { type: "currency", amount: 100 },
      ],
    },
    {
      id: "daily_collect_5",
      name: "Treasure Hunter",
      description: "Collect 5 items from the world.",
      schedule: "daily",
      tier: "common",
      objectives: [{ id: "obj_collect", description: "Collect items", type: "collect", target: 5 }],
      rewards: [
        { type: "xp", amount: 300 },
        { type: "currency", amount: 50 },
      ],
    },
    {
      id: "weekly_kills_50",
      name: "Weekly Warrior",
      description: "Defeat 50 enemies this week.",
      schedule: "weekly",
      tier: "rare",
      objectives: [{ id: "obj_kill", description: "Kill enemies", type: "kill", target: 50 }],
      rewards: [
        { type: "xp", amount: 2500 },
        { type: "currency", amount: 500 },
        { type: "item", amount: 1, itemId: "health_potion" },
      ],
    },
    {
      id: "weekly_explore",
      name: "Explorer",
      description: "Visit 3 different areas and collect 10 items.",
      schedule: "weekly",
      tier: "uncommon",
      objectives: [
        { id: "obj_visit", description: "Visit areas", type: "visit", target: 3 },
        { id: "obj_collect", description: "Collect items", type: "collect", target: 10 },
      ],
      rewards: [
        { type: "xp", amount: 1500 },
        { type: "currency", amount: 300 },
      ],
    },
  ],
  datastoreName: "StarterQuests",
  maxActiveQuests: 10,
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
  onQuestCompleted: (event) => {
    const player = Players.GetPlayerByUserId(event.playerId);
    if (player !== undefined) {
      RemoteService.getRegistry().fireClient("Notification", player, {
        type: "quest_completed",
        message: "Quest completed!",
        data: { questId: event.questId, rewards: event.rewards },
      });
    }
  },
});

export const QuestService = handle.Service;
export const getQuestRegistry = () => handle.getQuestRegistry();
export const getQuests = (playerId: number) => handle.getQuestStore(playerId);
export const cleanupPlayerQuests = (playerId: number) => handle.cleanupPlayer(playerId);
