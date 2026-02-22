/**
 * Checkpoint Service
 * Handles checkpoint touches and player respawning.
 */

import { Service, createLogger } from "@rbx/core";
import { CollectionService, Players, Workspace } from "@rbxts/services";
import { CheckpointData, CheckpointReachedEvent, OBBY_CONSTANTS } from "shared/types";
import { mapSize, arraySize } from "@rbx/core";
import { DataService } from "./DataService";
import { RemoteService } from "./RemoteService";

const logger = createLogger("CheckpointService");

// Module-level state
const checkpoints = new Map<string, CheckpointData>();
const lastCheckpointTouch = new Map<number, number>();
const pendingRespawns = new Set<number>(); // Track players who died and need checkpoint respawn
const lastRespawnRequest = new Map<number, number>();
const collectedCoins = new Map<string, Set<number>>(); // coinKey -> set of playerIds who collected

// Anti-spam cooldown (seconds)
const CHECKPOINT_COOLDOWN = 0.5;

function parseRespawnRequestPayload(payload: unknown): { toCheckpoint?: number } | undefined {
  if (payload === undefined) return {};
  if (!typeIs(payload, "table")) return undefined;

  const raw = payload as { toCheckpoint?: unknown };
  if (raw.toCheckpoint === undefined) return {};
  if (!typeIs(raw.toCheckpoint, "number")) return undefined;

  return { toCheckpoint: raw.toCheckpoint };
}

// Helper to get checkpoint key
function getCheckpointKey(stageNumber: number, checkpointIndex: number): string {
  return `${stageNumber}-${checkpointIndex}`;
}

// Helper to parse checkpoint from part
function parseCheckpointPart(part: BasePart): CheckpointData | undefined {
  const stageNumber = part.GetAttribute("StageNumber");
  const checkpointIndex = part.GetAttribute("CheckpointIndex");

  if (!typeIs(stageNumber, "number") || !typeIs(checkpointIndex, "number")) {
    return undefined;
  }

  return {
    stageNumber,
    checkpointIndex,
    position: part.Position,
    rotation: part.Orientation.Y,
  };
}

export const CheckpointService: Service & {
  getCheckpoint(stageNumber: number, checkpointIndex: number): CheckpointData | undefined;
  touchCheckpoint(player: Player, stageNumber: number, checkpointIndex: number): void;
  respawnPlayer(player: Player): void;
  setupCoins(): void;
} = {
  getCheckpoint(stageNumber: number, checkpointIndex: number): CheckpointData | undefined {
    return checkpoints.get(getCheckpointKey(stageNumber, checkpointIndex));
  },

  touchCheckpoint(player: Player, stageNumber: number, checkpointIndex: number): void {
    const data = DataService.getData(player);
    if (!data) {
      logger.warn(`No player data for ${player.Name}`);
      return;
    }

    // Anti-spam check - do this FIRST to reduce log spam
    const lastTouch = lastCheckpointTouch.get(player.UserId) ?? 0;
    const now = os.clock();
    if (now - lastTouch < CHECKPOINT_COOLDOWN) {
      return; // Silently ignore spam
    }
    lastCheckpointTouch.set(player.UserId, now);

    logger.debug(
      `Checkpoint touch: player=${player.Name}, stage=${stageNumber}, cp=${checkpointIndex}, current=${data.currentCheckpoint}`
    );

    // Validate stage
    if (data.currentStage !== stageNumber) {
      logger.debug(
        `Player ${player.Name} touched checkpoint for wrong stage (expected ${data.currentStage}, got ${stageNumber})`
      );
      return;
    }

    // Check if this is a new checkpoint (allow same checkpoint to re-register)
    if (checkpointIndex < data.currentCheckpoint) {
      return; // Already passed this checkpoint
    }

    // Validate checkpoint exists
    const checkpoint = checkpoints.get(getCheckpointKey(stageNumber, checkpointIndex));
    if (!checkpoint) {
      logger.warn(`Invalid checkpoint: stage ${stageNumber}, index ${checkpointIndex}`);
      return;
    }

    // Only notify if it's actually new
    const isNew = checkpointIndex > data.currentCheckpoint;

    // Update player data
    DataService.updateData(player, { currentCheckpoint: checkpointIndex });

    if (isNew) {
      logger.info(
        `Player ${player.Name} reached checkpoint ${checkpointIndex} in stage ${stageNumber}`
      );

      // Build event payload
      const checkpointEvent: CheckpointReachedEvent = {
        playerId: player.UserId,
        checkpointId: checkpointIndex,
        stageNumber,
        isNew: true,
      };

      // Notify client
      RemoteService.getRegistry().fireClient("CheckpointReached", player, checkpointEvent);
    }
  },

  respawnPlayer(player: Player): void {
    const data = DataService.getData(player);
    if (!data) {
      logger.warn(`No data for player ${player.Name} during respawn`);
      return;
    }

    const character = player.Character;
    if (!character) {
      logger.warn(`No character for player ${player.Name} during respawn`);
      return;
    }

    const humanoidRootPart = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
    if (!humanoidRootPart) {
      logger.warn(`No HumanoidRootPart for player ${player.Name} during respawn`);
      return;
    }

    // Find the checkpoint to respawn at
    const checkpointKey = getCheckpointKey(data.currentStage, data.currentCheckpoint);
    const checkpoint = checkpoints.get(checkpointKey);

    logger.info(
      `Respawning ${player.Name} at stage ${data.currentStage}, checkpoint ${data.currentCheckpoint}`
    );

    if (checkpoint) {
      // Respawn slightly behind checkpoint (negative Z) so player lands on platform
      // Checkpoint gates are vertical, spawn 3 studs behind and at platform height
      const spawnPos = new Vector3(
        checkpoint.position.X,
        checkpoint.position.Y - 2, // Checkpoint center is above platform, adjust down
        checkpoint.position.Z - 3 // Behind the checkpoint gate
      );
      const cf = new CFrame(spawnPos).mul(CFrame.Angles(0, math.rad(checkpoint.rotation), 0));
      // Reset velocity to prevent any momentum
      humanoidRootPart.AssemblyLinearVelocity = Vector3.zero;
      humanoidRootPart.CFrame = cf;
      logger.info(`Respawned at adjusted position: ${spawnPos}`);
    } else {
      // Respawn at stage start (checkpoint 0)
      const stageStart = checkpoints.get(getCheckpointKey(data.currentStage, 0));
      if (stageStart) {
        const spawnPos = new Vector3(
          stageStart.position.X,
          stageStart.position.Y - 2,
          stageStart.position.Z - 3
        );
        const cf = new CFrame(spawnPos).mul(CFrame.Angles(0, math.rad(stageStart.rotation), 0));
        humanoidRootPart.AssemblyLinearVelocity = Vector3.zero;
        humanoidRootPart.CFrame = cf;
        logger.info(`Respawned at stage start: ${spawnPos}`);
      } else {
        logger.warn(`No checkpoint found for respawn!`);
      }
    }

    logger.debug(`Respawned player ${player.Name} at checkpoint ${data.currentCheckpoint}`);

    // Timing rules:
    // - If respawning to the start of the stage, restart the stage timer.
    // - If respawning to the start of the whole run (stage 1 checkpoint 0), restart the run timer.
    if (data.currentCheckpoint === 0) {
      DataService.startStageTimer(player);
      if (data.currentStage === 1) {
        DataService.startRunTimer(player);
      }
    }
  },

  onInit() {
    logger.debug("Initializing checkpoint service...");

    // Handle client-requested respawns (e.g. reset keybind).
    // Note: main.server registers RemoteService before CheckpointService, so the RemoteEvent exists.
    RemoteService.getRegistry().onEvent("RequestRespawn", (player: Player, payload) => {
      const now = os.clock();
      const last = lastRespawnRequest.get(player.UserId) ?? -math.huge;
      if (now - last < OBBY_CONSTANTS.RESPAWN_DELAY) {
        return;
      }
      lastRespawnRequest.set(player.UserId, now);

      const data = DataService.getData(player);
      if (!data) return;

      const parsed = parseRespawnRequestPayload(payload);
      if (!parsed) {
        logger.warn(`Invalid respawn payload from ${player.Name}`);
        return;
      }

      if (parsed.toCheckpoint !== undefined) {
        // Only allow respawning to already-reached checkpoints (including 0 = stage start).
        const target = math.floor(parsed.toCheckpoint);
        if (target >= 0 && target <= data.currentCheckpoint) {
          DataService.updateData(player, { currentCheckpoint: target });
        }
      }

      // If the character is present, just teleport. Otherwise request a new character spawn and
      // teleport after it appears (same flow as death respawn).
      const character = player.Character;
      const hasRoot =
        character !== undefined &&
        (character.FindFirstChild("HumanoidRootPart") as BasePart | undefined) !== undefined;

      if (hasRoot) {
        this.respawnPlayer(player);
        return;
      }

      pendingRespawns.add(player.UserId);
      task.spawn(() => {
        const [ok, err] = pcall(() => player.LoadCharacter());
        if (!ok) {
          logger.warn(`Failed to LoadCharacter() for ${player.Name}: ${tostring(err)}`);
        }
      });
    });

    // Helper to setup checkpoint touch detection
    const setupCheckpoint = (part: BasePart, cpData: CheckpointData) => {
      part.Touched.Connect((hit) => {
        const character = hit.Parent as Model | undefined;
        if (!character) return;

        const humanoid = character.FindFirstChildOfClass("Humanoid");
        if (!humanoid) return;

        const player = Players.GetPlayerFromCharacter(character);
        if (player) {
          this.touchCheckpoint(player, cpData.stageNumber, cpData.checkpointIndex);
        }
      });
    };

    // Load checkpoints from CollectionService tags
    const checkpointParts = CollectionService.GetTagged(OBBY_CONSTANTS.CHECKPOINT_TAG);

    for (const part of checkpointParts) {
      if (!part.IsA("BasePart")) continue;

      const data = parseCheckpointPart(part);
      if (!data) {
        logger.warn(`Checkpoint part ${part.Name} missing required attributes`);
        continue;
      }

      const key = getCheckpointKey(data.stageNumber, data.checkpointIndex);
      checkpoints.set(key, data);
      setupCheckpoint(part, data);
      logger.debug(`Loaded checkpoint: stage ${data.stageNumber}, index ${data.checkpointIndex}`);
    }

    // Also scan Workspace.Checkpoints folder for parts with checkpoint attributes
    const checkpointsFolder = Workspace.FindFirstChild("Checkpoints") as Folder | undefined;
    if (checkpointsFolder) {
      for (const part of checkpointsFolder.GetChildren()) {
        if (!part.IsA("BasePart")) continue;

        const data = parseCheckpointPart(part);
        if (!data) continue;

        const key = getCheckpointKey(data.stageNumber, data.checkpointIndex);
        if (checkpoints.has(key)) continue; // Already loaded

        checkpoints.set(key, data);
        CollectionService.AddTag(part, OBBY_CONSTANTS.CHECKPOINT_TAG);
        setupCheckpoint(part, data);
        logger.debug(
          `Loaded checkpoint from folder: stage ${data.stageNumber}, index ${data.checkpointIndex}`
        );
      }
    }

    logger.info(`Loaded ${mapSize(checkpoints)} checkpoints`);

    // Handle player respawns - teleport to checkpoint after Roblox spawns them
    const handleCharacterAdded = (player: Player, character: Model) => {
      // Check if this player needs to respawn at a checkpoint
      if (!pendingRespawns.has(player.UserId)) {
        return; // Normal spawn, not a death respawn
      }
      pendingRespawns.delete(player.UserId);

      // Wait for character to fully load
      const humanoidRootPart = character.WaitForChild("HumanoidRootPart", 5) as
        | BasePart
        | undefined;
      if (!humanoidRootPart) {
        logger.warn(`HumanoidRootPart not found for ${player.Name}`);
        return;
      }

      // Small delay to ensure physics is ready
      task.wait(0.1);

      // Teleport to checkpoint
      this.respawnPlayer(player);
    };

    // Connect to existing players
    for (const player of Players.GetPlayers()) {
      player.CharacterAdded.Connect((character) => handleCharacterAdded(player, character));
    }

    // Connect to new players
    Players.PlayerAdded.Connect((player) => {
      player.CharacterAdded.Connect((character) => handleCharacterAdded(player, character));
    });

    // Clean up pending respawns when player leaves
    Players.PlayerRemoving.Connect((player) => {
      pendingRespawns.delete(player.UserId);
      lastRespawnRequest.delete(player.UserId);
      lastCheckpointTouch.delete(player.UserId);
      // Remove player from all coin collection sets
      for (const [, collected] of collectedCoins) {
        collected.delete(player.UserId);
      }
    });

    // Helper to setup kill zone
    const setupKillZone = (zone: BasePart) => {
      logger.info(`Kill zone setup: ${zone.Name} at ${zone.Position}`);
      zone.Touched.Connect((hit) => {
        const character = hit.Parent as Model | undefined;
        if (!character) return;

        const humanoid = character.FindFirstChildOfClass("Humanoid");
        if (!humanoid || humanoid.Health <= 0) return;

        const player = Players.GetPlayerFromCharacter(character);
        if (player) {
          // Mark player for checkpoint respawn
          pendingRespawns.add(player.UserId);
          // Increment death counter
          DataService.incrementDeaths(player);
          // Kill the player - Roblox will respawn them, then we teleport
          humanoid.TakeDamage(humanoid.MaxHealth);
        }
      });
    };

    // Setup kill zone detection from tags
    const killZones = CollectionService.GetTagged(OBBY_CONSTANTS.KILL_ZONE_TAG);
    for (const zone of killZones) {
      if (!zone.IsA("BasePart")) continue;
      setupKillZone(zone);
    }

    // Also scan Stages folder for kill zones (parts with KillZone attribute only)
    const stagesFolder = Workspace.FindFirstChild("Stages") as Folder | undefined;
    if (stagesFolder) {
      for (const model of stagesFolder.GetChildren()) {
        for (const part of model.GetDescendants()) {
          if (!part.IsA("BasePart")) continue;

          const hasKillAttr = part.GetAttribute("KillZone") === true;
          const lowerName = part.Name.lower();
          // Only match exact names or attribute - string.find returns LuaTuple, not comparable to undefined
          const isKillZone =
            hasKillAttr ||
            lowerName === "killzone" ||
            lowerName === "lava" ||
            lowerName === "kill" ||
            lowerName === "killbrick";

          if (isKillZone && !CollectionService.HasTag(part, OBBY_CONSTANTS.KILL_ZONE_TAG)) {
            CollectionService.AddTag(part, OBBY_CONSTANTS.KILL_ZONE_TAG);
            setupKillZone(part);
            logger.debug(`Setup kill zone: ${part.Name}`);
          }
        }
      }
    }

    logger.info(
      `Set up ${arraySize(CollectionService.GetTagged(OBBY_CONSTANTS.KILL_ZONE_TAG) as defined[])} kill zones`
    );

    // Setup coin collection
    this.setupCoins();
  },

  setupCoins(): void {
    // collectedCoins is module-level so it can be cleaned in PlayerRemoving
    const setupCoin = (coin: BasePart, value: number) => {
      // Use position as unique identifier since GetDebugId isn't available
      const coinId = `${coin.Name}-${math.floor(coin.Position.X)}-${math.floor(coin.Position.Y)}-${math.floor(coin.Position.Z)}`;

      logger.info(`Setting up coin ${coin.Name} at ${coin.Position} with value ${value}`);

      // Make sure the coin can trigger touch events
      coin.CanTouch = true;

      coin.Touched.Connect((hit) => {
        logger.debug(`Coin ${coin.Name} touched by ${hit.Name}`);

        const character = hit.Parent as Model | undefined;
        if (!character) {
          logger.debug(`No character parent for ${hit.Name}`);
          return;
        }

        const humanoid = character.FindFirstChildOfClass("Humanoid");
        if (!humanoid) {
          logger.debug(`No humanoid in ${character.Name}`);
          return;
        }

        const player = Players.GetPlayerFromCharacter(character);
        if (!player) {
          logger.debug(`No player for character ${character.Name}`);
          return;
        }

        // Check if player already collected this coin
        let collected = collectedCoins.get(coinId);
        if (!collected) {
          collected = new Set<number>();
          collectedCoins.set(coinId, collected);
        }

        if (collected.has(player.UserId)) {
          logger.debug(`Player ${player.Name} already collected coin ${coin.Name}`);
          return;
        }
        collected.add(player.UserId);

        // Award coins
        DataService.addCoins(player, value);
        logger.info(`Player ${player.Name} collected ${value} coins from ${coin.Name}`);

        // Visual feedback - hide coin permanently for this collection session
        // (In a real game, you'd hide per-player using LocalTransparencyModifier)
        coin.Transparency = 1;

        // Sync updated data to client
        const updatedData = DataService.getData(player);
        if (updatedData) {
          RemoteService.getRegistry().fireClient("PlayerDataSync", player, {
            coins: updatedData.coins,
            currentStage: updatedData.currentStage,
            currentCheckpoint: updatedData.currentCheckpoint,
          });
        }
      });
    };

    // Scan for coins from tags
    const taggedCoins = CollectionService.GetTagged(OBBY_CONSTANTS.COIN_TAG);
    for (const coin of taggedCoins) {
      if (!coin.IsA("BasePart")) continue;
      const value = (coin.GetAttribute("CoinValue") as number) ?? 1;
      setupCoin(coin, value);
    }

    // Scan Stages folder for coins (parts with CoinValue attribute only)
    const stagesFolder = Workspace.FindFirstChild("Stages") as Folder | undefined;
    if (stagesFolder) {
      logger.info(`Scanning Stages folder for coins...`);
      for (const model of stagesFolder.GetChildren()) {
        for (const part of model.GetDescendants()) {
          if (!part.IsA("BasePart")) continue;

          const coinValue = part.GetAttribute("CoinValue") as number | undefined;
          // Only use CoinValue attribute for detection
          const isCoin = coinValue !== undefined;

          if (isCoin && !CollectionService.HasTag(part, OBBY_CONSTANTS.COIN_TAG)) {
            CollectionService.AddTag(part, OBBY_CONSTANTS.COIN_TAG);
            setupCoin(part, coinValue ?? 1);
          }
        }
      }
    } else {
      logger.warn(`Stages folder not found!`);
    }

    logger.info(
      `Set up ${arraySize(CollectionService.GetTagged(OBBY_CONSTANTS.COIN_TAG) as defined[])} coins total`
    );
  },

  onDestroy() {
    checkpoints.clear();
    lastCheckpointTouch.clear();
    lastRespawnRequest.clear();
    pendingRespawns.clear();
    collectedCoins.clear();
  },
};
