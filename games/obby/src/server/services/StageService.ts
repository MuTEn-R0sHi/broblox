/**
 * Stage Service
 * Manages stage configuration and completion.
 */

import { Service, createLogger } from "@rbx/core";
import { CollectionService, Workspace } from "@rbxts/services";
import { StageConfig, StageCompletedEvent, OBBY_CONSTANTS } from "shared/types";
import { mapLen } from "shared/util";
import { DataService } from "./DataService";
import { RemoteService } from "./RemoteService";
import { CheckpointService } from "./CheckpointService";

const logger = createLogger("StageService");

// Module-level state
const stages = new Map<number, StageConfig>();
const lastStageCompletion = new Map<string, number>(); // "playerId-stageNumber" -> timestamp

// Cooldown between stage completions (seconds)
const STAGE_COMPLETION_COOLDOWN = 2;
// Longer cooldown after completing entire obby
const OBBY_COMPLETION_COOLDOWN = 10;

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
  getStage(stageNumber: number): StageConfig | undefined;
  getStageCount(): number;
  completeStage(player: Player, stageNumber: number): void;
} = {
  getStage(stageNumber: number): StageConfig | undefined {
    return stages.get(stageNumber);
  },

  getStageCount(): number {
    return mapLen(stages);
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

    const stage = stages.get(stageNumber);
    if (!stage) {
      logger.warn(`Invalid stage number: ${stageNumber}`);
      return;
    }

    // Check if this is the current stage
    if (data.currentStage !== stageNumber) {
      logger.debug(
        `Player ${player.Name} tried to complete stage ${stageNumber} but is on stage ${data.currentStage}`
      );
      return;
    }

    // Check if this is the final stage (longer cooldown applies)
    const isLastStage = !stages.has(stageNumber + 1);
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
    const existingProgress = data.stageProgress[tostring(stageNumber)];
    const priorBest = existingProgress?.bestTime;
    const isNewBest = priorBest === undefined || completionTime < priorBest;

    // Update stage progress
    DataService.updateStageProgress(player, stageNumber, {
      completions: 1,
      bestTime: isNewBest ? completionTime : undefined,
    });

    // Award coins
    DataService.addCoins(player, stage.coinReward);

    // Build event payload
    const completedEvent: StageCompletedEvent = {
      playerId: player.UserId,
      stageNumber,
      completionTime,
      isNewBest,
      coinsEarned: stage.coinReward,
    };

    // Advance to next stage
    const nextStage = stageNumber + 1;
    if (stages.has(nextStage)) {
      DataService.updateData(player, {
        currentStage: nextStage,
        currentCheckpoint: 0,
      });

      // Reset stage timer for the new stage
      DataService.startStageTimer(player);

      // Notify client
      RemoteService.getRegistry().fireClient("StageCompleted", player, completedEvent);

      // Sync current HUD state (coins/stage/checkpoint).
      const updated = DataService.getData(player);
      if (updated) {
        RemoteService.getRegistry().fireClient("PlayerDataSync", player, {
          coins: updated.coins,
          currentStage: updated.currentStage,
          currentCheckpoint: updated.currentCheckpoint,
        });
      }
    } else {
      // Full run completion time
      const totalTime = DataService.getRunElapsedSeconds(player) ?? 0;
      const priorRunBest = data.bestFullRunTime;
      const isNewRunBest = priorRunBest === undefined || totalTime < priorRunBest;

      // Game completed! Reset to start for another run
      const updates = {
        totalCompletions: data.totalCompletions + 1,
        currentStage: 1,
        currentCheckpoint: 0,
      } as Parameters<typeof DataService.updateData>[1];

      if (isNewRunBest) {
        updates.bestFullRunTime = totalTime;
      }

      DataService.updateData(player, updates);

      // New run starts now
      DataService.startRunTimer(player);
      DataService.startStageTimer(player);

      RemoteService.getRegistry().fireClient("StageCompleted", player, completedEvent);
      logger.info(`Player ${player.Name} completed the entire obby!`);

      const updated = DataService.getData(player);
      if (updated) {
        RemoteService.getRegistry().fireClient("PlayerDataSync", player, {
          coins: updated.coins,
          currentStage: updated.currentStage,
          currentCheckpoint: updated.currentCheckpoint,
        });
      }

      // Teleport player back to start after a short delay
      task.delay(1.5, () => {
        CheckpointService.respawnPlayer(player);
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

      // Get stage config from attributes
      const config: StageConfig = {
        stageNumber,
        displayName: (part.GetAttribute("DisplayName") as string) ?? `Stage ${stageNumber}`,
        difficulty: (part.GetAttribute("Difficulty") as StageConfig["difficulty"]) ?? "easy",
        coinReward:
          (part.GetAttribute("CoinReward") as number) ?? OBBY_CONSTANTS.DEFAULT_STAGE_COINS,
        hasSecret: (part.GetAttribute("HasSecret") as boolean) ?? false,
      };

      stages.set(stageNumber, config);
      CollectionService.AddTag(part, OBBY_CONSTANTS.STAGE_TAG);
      logger.debug(`Loaded stage ${stageNumber}: ${config.displayName}`);
    }

    // Also scan Workspace.Stages folder for parts with StageNumber attribute
    const stagesFolder = Workspace.FindFirstChild("Stages") as Folder | undefined;
    if (stagesFolder) {
      for (const model of stagesFolder.GetChildren()) {
        for (const part of model.GetDescendants()) {
          if (!part.IsA("BasePart")) continue;

          const stageNumber = getStageNumber(part);
          if (stageNumber === undefined) continue;
          if (stages.has(stageNumber)) continue; // Already loaded

          const config: StageConfig = {
            stageNumber,
            displayName: (part.GetAttribute("DisplayName") as string) ?? `Stage ${stageNumber}`,
            difficulty: (part.GetAttribute("Difficulty") as StageConfig["difficulty"]) ?? "easy",
            coinReward:
              (part.GetAttribute("CoinReward") as number) ?? OBBY_CONSTANTS.DEFAULT_STAGE_COINS,
            hasSecret: (part.GetAttribute("HasSecret") as boolean) ?? false,
          };

          stages.set(stageNumber, config);
          CollectionService.AddTag(part, OBBY_CONSTANTS.STAGE_TAG);
          logger.debug(`Loaded stage ${stageNumber} from folder: ${config.displayName}`);
        }
      }
    }

    logger.info(`Loaded ${mapLen(stages)} stages`);

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

    // Also scan Stages folder for parts named "EndPlatform" or "EndZone"
    if (stagesFolder) {
      for (const model of stagesFolder.GetChildren()) {
        for (const part of model.GetDescendants()) {
          if (!part.IsA("BasePart")) continue;

          // Check if this is an end zone by exact name match
          const lowerName = part.Name.lower();
          const isEndZone =
            lowerName === "endplatform" || lowerName === "endzone" || lowerName.sub(1, 3) === "end";
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
  },

  onDestroy() {
    stages.clear();
  },
};
