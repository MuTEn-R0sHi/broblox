/**
 * Stage Service
 * Manages stage configuration and completion.
 */

import { Service, createLogger } from "@broblox/core";
import { CollectionService, Workspace } from "@rbxts/services";
import { StageConfig, StageCompletedEvent, OBBY_CONSTANTS } from "shared/types";
import { mapSize } from "@broblox/core";
import { DataService } from "./DataService";
import { RemoteService } from "./RemoteService";
import {
  incrementDeathlessStreak,
  deleteDeathlessStreak,
  clearDeathlessStreaks,
} from "./DeathlessStreakState";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { movementStateManager } from "./MovementValidationService";
import { getPlayerWorldId, setPlayerWorld } from "./PlayerWorldState";
import { getProgression } from "./ProgressionService";
import { getQuests } from "./QuestService";
import { getAchievements } from "./RewardsService";
import { getBattlePassStore } from "./BattlePassService";
import { getEventTracker, getFunnelTracker } from "./AnalyticsService";
import { getActiveEvents } from "./EventService";

const logger = createLogger("StageService");

// Module-level state — stages keyed by worldId → stageNumber
const stages = new Map<string, Map<number, StageConfig>>();

function getWorldStages(worldId: string): Map<number, StageConfig> {
  let worldStages = stages.get(worldId);
  if (!worldStages) {
    worldStages = new Map();
    stages.set(worldId, worldStages);
  }
  return worldStages;
}

// Determine worldId from a part's ancestor chain (finds Worlds/* parent)
function getWorldIdFromInstance(inst: Instance): string | undefined {
  let current: Instance | undefined = inst.Parent;
  while (current !== undefined) {
    if (current.Parent !== undefined && current.Parent.Name === "Worlds") {
      return current.Name.lower();
    }
    current = current.Parent;
  }
  return undefined;
}
const lastStageCompletion = new Map<string, number>(); // "playerId-stageNumber" -> timestamp
// Cooldown between stage completions (seconds)
const STAGE_COMPLETION_COOLDOWN = 2;
// Longer cooldown after completing entire obby
const OBBY_COMPLETION_COOLDOWN = 10;
// XP awarded per stage completion
const STAGE_XP_REWARD = 100;
// Battle pass XP awarded per stage completion
const STAGE_BP_XP_REWARD = 25;
// Achievement IDs that track cumulative stage completions
const STAGE_ACHIEVEMENT_IDS = ["ach_first_stage", "ach_stages_25", "ach_stages_100"];

// Helper to get completion key
function getCompletionKey(playerId: number, stageNumber: number): string {
  return `${playerId}-${stageNumber}`;
}

// Helper to get stage from part
function getStageNumber(part: BasePart): number | undefined {
  const stageAttr = part.GetAttribute("StageNumber");
  if (typeIs(stageAttr, "number")) {
    return stageAttr;
  }
  return undefined;
}

export const StageService: Service & {
  getStage(worldId: string, stageNumber: number): StageConfig | undefined;
  getStageCount(worldId: string): number;
  completeStage(player: Player, stageNumber: number): void;
} = {
  getStage(worldId: string, stageNumber: number): StageConfig | undefined {
    return stages.get(worldId)?.get(stageNumber);
  },

  getStageCount(worldId: string): number {
    return mapSize(stages.get(worldId) ?? new Map());
  },

  completeStage(player: Player, stageNumber: number): void {
    const data = DataService.getData(player);
    if (!data) return;

    // Anti-spam cooldown (per stage)
    const completionKey = getCompletionKey(player.UserId, stageNumber);
    const lastCompletion = lastStageCompletion.get(completionKey) ?? 0;
    const now = os.clock();
    if (now - lastCompletion < STAGE_COMPLETION_COOLDOWN) {
      return;
    }

    // Get player's active world
    const worldId = getPlayerWorldId(player.UserId);
    if (!worldId) {
      logger.debug(`Player ${player.Name} tried to complete stage but is not in a world`);
      return;
    }

    const worldStages = stages.get(worldId);
    const stage = worldStages?.get(stageNumber);
    if (!stage) {
      logger.warn(`Invalid stage number: ${stageNumber} for world ${worldId}`);
      return;
    }

    // Check if this is the current stage
    const worldProgress = DataService.getWorldProgress(player, worldId);
    if (!worldProgress || worldProgress.currentStage !== stageNumber) {
      logger.debug(
        `Player ${player.Name} tried to complete stage ${stageNumber} but is on stage ${worldProgress?.currentStage ?? "?"}`
      );
      return;
    }

    // Check if this is the final stage (longer cooldown applies)
    const isLastStage = !worldStages?.has(stageNumber + 1);
    if (isLastStage) {
      const timeSinceLastCompletion = now - lastCompletion;
      if (timeSinceLastCompletion < OBBY_COMPLETION_COOLDOWN) {
        return;
      }
    }

    // Set cooldown
    lastStageCompletion.set(completionKey, now);

    logger.info(`Player ${player.Name} completed stage ${stageNumber}!`);

    // Calculate stage completion time
    const completionTime = DataService.getStageElapsedSeconds(player) ?? 0;
    const existingProgress = worldProgress.stageProgress[tostring(stageNumber)];
    const priorBest = existingProgress?.bestTime;
    const isNewBest = priorBest === undefined || completionTime < priorBest;

    // Update stage progress
    DataService.updateStageProgress(player, worldId, stageNumber, {
      completions: 1,
      bestTime: isNewBest ? completionTime : undefined,
    });

    // Award coins (apply event multiplier if active)
    let coinMultiplier = 1;
    let xpMultiplier = 1;
    for (const ev of getActiveEvents()) {
      const mods = ev.modifiers as Record<string, unknown> | undefined;
      if (mods) {
        if (typeIs(mods["coinMultiplier"], "number"))
          coinMultiplier = mods["coinMultiplier"] as number;
        if (typeIs(mods["xpMultiplier"], "number")) xpMultiplier = mods["xpMultiplier"] as number;
      }
    }
    const adjustedCoins = math.floor(stage.coinReward * coinMultiplier);
    DataService.addCoins(player, adjustedCoins);

    // Award XP via the progression system (apply event multiplier)
    const adjustedXp = math.floor(STAGE_XP_REWARD * xpMultiplier);
    const progressionStore = getProgression(player.UserId);
    if (progressionStore !== undefined) {
      progressionStore.addXp(adjustedXp);
    }

    // Award battle pass XP
    const bpStore = getBattlePassStore(player.UserId);
    if (bpStore !== undefined) {
      bpStore.addXp(STAGE_BP_XP_REWARD);
    }

    // Advance stage-completion quest objectives
    const questStore = getQuests(player.UserId);
    if (questStore !== undefined) {
      questStore.incrementObjective("stage_complete", 1);
    }

    // Advance deathless-stages quest objective (absolute progress = current streak)
    const streak = incrementDeathlessStreak(player.UserId);
    if (questStore !== undefined) {
      questStore.setObjectiveProgress("weekly_no_deaths", "obj_deathless", streak);
    }

    // Advance achievement progress for stage-count achievements
    const achievementStore = getAchievements(player.UserId);
    if (achievementStore !== undefined) {
      for (const achId of STAGE_ACHIEVEMENT_IDS) {
        achievementStore.incrementProgress(achId, 1);
      }
    }

    // Emit structured analytics event
    getEventTracker().track("stage.completed", player.UserId, {
      stageId: tostring(stageNumber),
      durationSec: completionTime,
    });

    // Advance analytics progression funnel
    const funnel = getFunnelTracker();
    if (stageNumber === 1) funnel.advanceStep("progression", player.UserId, "stage_1_complete");
    if (stageNumber === 5) funnel.advanceStep("progression", player.UserId, "stage_5_complete");
    if (stageNumber === 10) funnel.advanceStep("progression", player.UserId, "stage_10_complete");

    // Build event payload
    const completedEvent: StageCompletedEvent = {
      playerId: player.UserId,
      stageNumber,
      completionTime,
      isNewBest,
      coinsEarned: adjustedCoins,
    };

    // Advance to next stage
    const nextStage = stageNumber + 1;
    if (worldStages?.has(nextStage)) {
      DataService.setWorldStage(player, worldId, nextStage, 0);

      // Reset stage timer for the new stage
      DataService.startStageTimer(player);

      // Notify client
      RemoteService.getRegistry().fireClient("StageCompleted", player, completedEvent);

      // Sync current HUD state (coins/stage/checkpoint).
      const updated = DataService.getData(player);
      if (updated) {
        const world = updated.worlds[worldId];
        RemoteService.getRegistry().fireClient("PlayerDataSync", player, {
          coins: updated.coins,
          currentStage: world?.currentStage ?? 1,
          currentCheckpoint: world?.currentCheckpoint ?? 0,
        });
      }
    } else {
      // Full run completion time
      const totalTime = DataService.getRunElapsedSeconds(player) ?? 0;
      const wpFinal = DataService.getWorldProgress(player, worldId);
      const priorRunBest = wpFinal?.bestFullRunTime;
      const isNewRunBest = priorRunBest === undefined || totalTime < priorRunBest;

      // World completed! Reset to stage 1 for next run
      DataService.incrementWorldCompletions(player, worldId);
      DataService.updateData(player, {
        totalCompletions: data.totalCompletions + 1,
      });
      DataService.setWorldStage(player, worldId, 1, 0);

      if (isNewRunBest) {
        DataService.setWorldBestRunTime(player, worldId, totalTime);
      }

      // New run starts now
      DataService.startRunTimer(player);
      DataService.startStageTimer(player);

      RemoteService.getRegistry().fireClient("StageCompleted", player, completedEvent);
      logger.info(`Player ${player.Name} completed world: ${worldId}`);

      // Advance analytics funnel — full obby completion
      funnel.advanceStep("progression", player.UserId, "obby_complete");

      const updated = DataService.getData(player);
      if (updated) {
        const world = updated.worlds[worldId];
        RemoteService.getRegistry().fireClient("PlayerDataSync", player, {
          coins: updated.coins,
          currentStage: world?.currentStage ?? 1,
          currentCheckpoint: world?.currentCheckpoint ?? 0,
        });
      }

      // Return player to hub after a short delay
      task.delay(1.5, () => {
        setPlayerWorld(player.UserId, undefined);
        RemoteService.getRegistry().fireClient("WorldChanged", player, {
          worldId: undefined,
          worldName: undefined,
        });
        // Teleport to hub spawn
        const character = player.Character;
        if (character) {
          const hrp = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
          if (hrp) {
            const hubFolder = Workspace.FindFirstChild("Hub") as Folder | undefined;
            const hubSpawn = hubFolder?.FindFirstChild("HubSpawn") as BasePart | undefined;
            const spawnPos = hubSpawn
              ? new Vector3(hubSpawn.Position.X, hubSpawn.Position.Y + 3, hubSpawn.Position.Z)
              : new Vector3(0, 10, 0);
            hrp.AssemblyLinearVelocity = Vector3.zero;
            hrp.CFrame = new CFrame(spawnPos);
            movementStateManager.notifyTeleport(player.UserId, spawnPos);
          }
        }
      });
    }
  },

  onInit() {
    logger.debug("Initializing stage service...");

    // Load stages from CollectionService tags
    const stageParts = CollectionService.GetTagged(OBBY_CONSTANTS.STAGE_TAG);

    for (const part of stageParts) {
      if (!part.IsA("BasePart")) continue;

      const stageNumber = getStageNumber(part);
      if (stageNumber === undefined) {
        logger.warn(`Stage part ${part.Name} missing StageNumber attribute`);
        continue;
      }

      const worldId = getWorldIdFromInstance(part);
      if (!worldId) continue;

      const worldStages = getWorldStages(worldId);
      if (worldStages.has(stageNumber)) continue;

      // Get stage config from attributes
      const config: StageConfig = {
        stageNumber,
        displayName: (part.GetAttribute("DisplayName") as string) ?? `Stage ${stageNumber}`,
        difficulty: (part.GetAttribute("Difficulty") as StageConfig["difficulty"]) ?? "easy",
        coinReward:
          (part.GetAttribute("CoinReward") as number) ?? OBBY_CONSTANTS.DEFAULT_STAGE_COINS,
        hasSecret: (part.GetAttribute("HasSecret") as boolean) ?? false,
      };

      worldStages.set(stageNumber, config);
      CollectionService.AddTag(part, OBBY_CONSTANTS.STAGE_TAG);
      logger.debug(`Loaded stage ${stageNumber} for world ${worldId}: ${config.displayName}`);
    }

    // Scan Workspace.Worlds.*.Stages folders — read metadata from the stage Model
    const worldsFolder = Workspace.FindFirstChild("Worlds") as Folder | undefined;
    if (worldsFolder) {
      for (const worldFolder of worldsFolder.GetChildren()) {
        const worldId = worldFolder.Name.lower();
        const worldStages = getWorldStages(worldId);
        const stagesSubfolder = worldFolder.FindFirstChild("Stages") as Folder | undefined;
        if (!stagesSubfolder) continue;
        for (const model of stagesSubfolder.GetChildren()) {
          // Read StageNumber from the model's own attributes (not descendant parts)
          const modelStageNumber = model.GetAttribute("StageNumber");
          if (!typeIs(modelStageNumber, "number")) continue;
          if (worldStages.has(modelStageNumber)) continue;

          const config: StageConfig = {
            stageNumber: modelStageNumber,
            displayName:
              (model.GetAttribute("DisplayName") as string) ?? `Stage ${modelStageNumber}`,
            difficulty: (model.GetAttribute("Difficulty") as StageConfig["difficulty"]) ?? "easy",
            coinReward:
              (model.GetAttribute("CoinReward") as number) ?? OBBY_CONSTANTS.DEFAULT_STAGE_COINS,
            hasSecret: (model.GetAttribute("HasSecret") as boolean) ?? false,
          };

          worldStages.set(modelStageNumber, config);
          // Tag child parts that have StageNumber for CollectionService discovery
          for (const part of model.GetDescendants()) {
            if (part.IsA("BasePart") && part.GetAttribute("StageNumber") !== undefined) {
              CollectionService.AddTag(part, OBBY_CONSTANTS.STAGE_TAG);
            }
          }
          logger.debug(
            `Loaded stage ${modelStageNumber} for world ${worldId} from model: ${config.displayName}`
          );
        }
      }
    }

    let totalStages = 0;
    stages.forEach((ws) => (totalStages += mapSize(ws)));
    logger.info(`Loaded ${totalStages} stages across ${mapSize(stages)} worlds`);

    // Clean up per-player cooldown entries when a player leaves
    PlayerLifecycleService.onPlayerRemoving((player) => {
      stages.forEach((worldStages) => {
        worldStages.forEach((_, stageNumber) => {
          lastStageCompletion.delete(getCompletionKey(player.UserId, stageNumber));
        });
      });
      deleteDeathlessStreak(player.UserId);
    });

    // Helper to setup end zone touch detection
    const setupEndZone = (zone: BasePart, stageNum: number) => {
      zone.Touched.Connect((hit) => {
        const character = hit.Parent as Model | undefined;
        if (!character) return;

        const humanoid = character.FindFirstChildOfClass("Humanoid");
        if (!humanoid) return;

        const player = game.GetService("Players").GetPlayerFromCharacter(character);
        if (player) {
          this.completeStage(player, stageNum);
        }
      });
    };

    // Setup stage completion detection from tagged end zones
    const endZones = CollectionService.GetTagged(OBBY_CONSTANTS.END_ZONE_TAG);
    for (const zone of endZones) {
      if (!zone.IsA("BasePart")) continue;

      const stageNumber = getStageNumber(zone);
      if (stageNumber === undefined) continue;

      setupEndZone(zone, stageNumber);
    }

    // Also scan Worlds/*/Stages folders for parts named "EndPlatform" or "EndZone"
    if (worldsFolder) {
      for (const worldFolder of worldsFolder.GetChildren()) {
        const stagesSubfolder = worldFolder.FindFirstChild("Stages") as Folder | undefined;
        if (!stagesSubfolder) continue;
        for (const model of stagesSubfolder.GetChildren()) {
          for (const part of model.GetDescendants()) {
            if (!part.IsA("BasePart")) continue;

            // Check if this is an end zone by exact name match
            const lowerName = part.Name.lower();
            const isEndZone =
              lowerName === "endplatform" ||
              lowerName === "endzone" ||
              lowerName.sub(1, 3) === "end";
            const stageNumber = getStageNumber(part);

            if (isEndZone && stageNumber !== undefined) {
              if (!CollectionService.HasTag(part, OBBY_CONSTANTS.END_ZONE_TAG)) {
                CollectionService.AddTag(part, OBBY_CONSTANTS.END_ZONE_TAG);
                setupEndZone(part, stageNumber);
                logger.info(
                  `Setup end zone for stage ${stageNumber}: ${part.Name} at position ${part.Position}`
                );
              }
            }
          }
        }
      }
    }
  },

  onDestroy() {
    stages.forEach((ws) => ws.clear());
    stages.clear();
    lastStageCompletion.clear();
    clearDeathlessStreaks();
  },
};
