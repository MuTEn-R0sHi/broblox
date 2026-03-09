/**
 * World Service
 *
 * Manages world configurations, player world tracking, portal interactions,
 * world entry/exit teleportation, and the day/night cycle.
 *
 * Flow:
 * 1. Player touches a world portal in the Hub.
 * 2. Server validates unlock requirements (base attributes).
 * 3. Player's active world is set, timers start, client notified.
 * 4. Player is teleported to their latest checkpoint in that world.
 * 5. On completing the final stage (handled by StageService) or pressing
 *    "exit world", the player returns to the Hub.
 */

import { Service, createLogger } from "@broblox/core";
import { CollectionService, Players, Workspace } from "@rbxts/services";
import { createWorldService } from "@broblox/world-systems";
import { getWorldConfig } from "shared/worldConfigs";
import { DataService } from "./DataService";
import { RemoteService } from "./RemoteService";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { movementStateManager } from "./MovementValidationService";
import {
  setPlayerWorld,
  getPlayerWorldId,
  deletePlayerWorld,
  clearPlayerWorlds,
} from "./PlayerWorldState";

const logger = createLogger("WorldService");

// ── Day/Night cycle (kept from original) ─────────────────────────────────────

const dayNightHandle = createWorldService({
  cycleDurationSeconds: 900,
  startClockTime: 10,
  transitionDuration: 15,
  minChangeCooldown: 120,
  fullConfig: {
    season: { enabled: false },
  },
});

// ── Portal tag ───────────────────────────────────────────────────────────────

const PORTAL_TAG = "ObbyWorldPortal";

// Anti-spam: userId → last portal touch time
const lastPortalTouch = new Map<number, number>();
const PORTAL_COOLDOWN = 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getHubSpawnPosition(): Vector3 {
  const hubFolder = Workspace.FindFirstChild("Hub") as Folder | undefined;
  if (hubFolder) {
    const spawn = hubFolder.FindFirstChild("HubSpawn") as BasePart | undefined;
    if (spawn) {
      return new Vector3(spawn.Position.X, spawn.Position.Y + 3, spawn.Position.Z);
    }
  }
  const wSpawn = Workspace.FindFirstChild("Spawn") as BasePart | undefined;
  if (wSpawn) {
    return new Vector3(wSpawn.Position.X, wSpawn.Position.Y + 3, wSpawn.Position.Z);
  }
  return new Vector3(0, 10, 0);
}

function teleportPlayer(player: Player, position: Vector3): void {
  const character = player.Character;
  if (!character) return;
  const hrp = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
  if (!hrp) return;
  hrp.AssemblyLinearVelocity = Vector3.zero;
  hrp.CFrame = new CFrame(position);
  movementStateManager.notifyTeleport(player.UserId, position);
}

/**
 * Find the checkpoint-0 position for a given stage in a world.
 * Falls back to the StartLine, then the world's first BasePart.
 */
function findWorldSpawnPosition(worldId: string, stageNumber: number): Vector3 | undefined {
  const worldsFolder = Workspace.FindFirstChild("Worlds") as Folder | undefined;
  if (!worldsFolder) return undefined;

  // Capitalise first letter: "grasslands" → "Grasslands"
  const folderName = worldId.sub(1, 1).upper() + worldId.sub(2);
  const worldFolder = worldsFolder.FindFirstChild(folderName) as Folder | undefined;
  if (!worldFolder) return undefined;

  // Try to find checkpoint 0 for the given stage
  const checkpointsFolder = worldFolder.FindFirstChild("Checkpoints") as Folder | undefined;
  if (checkpointsFolder) {
    for (const part of checkpointsFolder.GetChildren()) {
      if (!part.IsA("BasePart")) continue;
      const cpStage = part.GetAttribute("StageNumber");
      const cpIndex = part.GetAttribute("CheckpointIndex");
      if (cpStage === stageNumber && cpIndex === 0) {
        return new Vector3(part.Position.X, part.Position.Y + 3, part.Position.Z);
      }
    }
  }

  // Fallback: StartLine
  const startLine = worldFolder.FindFirstChild("StartLine") as BasePart | undefined;
  if (startLine) {
    return new Vector3(startLine.Position.X, startLine.Position.Y + 3, startLine.Position.Z);
  }

  return undefined;
}

// ── Public API ───────────────────────────────────────────────────────────────

export const WorldService: Service & {
  getPlayerWorldId(player: Player): string | undefined;
  tryEnterWorld(player: Player, worldId: string): boolean;
  exitWorld(player: Player): void;
  teleportToHub(player: Player): void;
} = {
  getPlayerWorldId(player: Player): string | undefined {
    return getPlayerWorldId(player.UserId);
  },

  tryEnterWorld(player: Player, worldId: string): boolean {
    const config = getWorldConfig(worldId);
    if (!config) {
      logger.warn(`Unknown world: ${worldId}`);
      return false;
    }

    // Already in a world?
    const currentWorld = getPlayerWorldId(player.UserId);
    if (currentWorld !== undefined) {
      logger.debug(`Player ${player.Name} already in world ${currentWorld}`);
      return false;
    }

    // Check unlock requirements (base attributes only, no gear)
    const attrs = DataService.getAttributes(player);
    if (!attrs) return false;
    const req = config.unlockRequirements;
    if (attrs.speed < req.speed || attrs.jump < req.jump || attrs.stamina < req.stamina) {
      logger.info(`Player ${player.Name} does not meet requirements for ${worldId}`);
      return false;
    }

    // Check world completion prerequisites
    if (req.worldsCompleted) {
      for (const reqWorld of req.worldsCompleted) {
        const progress = DataService.getWorldProgress(player, reqWorld);
        if (!progress || progress.completions === 0) {
          logger.info(`Player ${player.Name} has not completed required world: ${reqWorld}`);
          return false;
        }
      }
    }

    // ── Enter the world ──────────────────────────────────────────────

    setPlayerWorld(player.UserId, worldId);
    DataService.ensureWorldProgress(player, worldId);
    DataService.startRunTimer(player);
    DataService.startStageTimer(player);

    // Notify client
    RemoteService.getRegistry().fireClient("WorldChanged", player, {
      worldId,
      worldName: config.displayName,
    });

    // Teleport to current checkpoint
    const worldProgress = DataService.getWorldProgress(player, worldId);
    const stage = worldProgress?.currentStage ?? 1;
    const spawnPos = findWorldSpawnPosition(worldId, stage);
    if (spawnPos) {
      teleportPlayer(player, spawnPos);
    }

    // Sync HUD
    const data = DataService.getData(player);
    if (data) {
      const world = data.worlds[worldId];
      RemoteService.getRegistry().fireClient("PlayerDataSync", player, {
        coins: data.coins,
        currentStage: world?.currentStage ?? 1,
        currentCheckpoint: world?.currentCheckpoint ?? 0,
      });
    }

    logger.info(`Player ${player.Name} entered world: ${worldId}`);
    return true;
  },

  exitWorld(player: Player): void {
    const worldId = getPlayerWorldId(player.UserId);
    if (!worldId) return;

    setPlayerWorld(player.UserId, undefined);

    // Notify client (back to hub)
    RemoteService.getRegistry().fireClient("WorldChanged", player, {
      worldId: undefined,
      worldName: undefined,
    });

    this.teleportToHub(player);
    logger.info(`Player ${player.Name} exited world: ${worldId}`);
  },

  teleportToHub(player: Player): void {
    teleportPlayer(player, getHubSpawnPosition());
  },

  onInit() {
    logger.debug("Initializing WorldService...");

    // Initialize day/night cycle
    dayNightHandle.Service.onInit?.();

    // ── Portal setup ─────────────────────────────────────────────────

    const setupPortal = (portal: BasePart, worldId: string) => {
      portal.Touched.Connect((hit) => {
        const character = hit.Parent as Model | undefined;
        if (!character) return;
        const humanoid = character.FindFirstChildOfClass("Humanoid");
        if (!humanoid) return;
        const touchPlayer = Players.GetPlayerFromCharacter(character);
        if (!touchPlayer) return;

        // Anti-spam
        const now = os.clock();
        const last = lastPortalTouch.get(touchPlayer.UserId) ?? 0;
        if (now - last < PORTAL_COOLDOWN) return;
        lastPortalTouch.set(touchPlayer.UserId, now);

        this.tryEnterWorld(touchPlayer, worldId);
      });
    };

    // Discover portals from CollectionService tags
    for (const portal of CollectionService.GetTagged(PORTAL_TAG)) {
      if (!portal.IsA("BasePart")) continue;
      const worldId = portal.GetAttribute("WorldId") as string | undefined;
      if (worldId) {
        setupPortal(portal, worldId);
      }
    }

    // Discover portals from Hub folder (name convention: Portal{WorldName})
    const hubFolder = Workspace.FindFirstChild("Hub") as Folder | undefined;
    if (hubFolder) {
      for (const child of hubFolder.GetChildren()) {
        if (!child.IsA("Model")) continue;
        const cname = child.Name;
        if (cname.size() <= 6) continue;
        if (cname.sub(1, 6).lower() !== "portal") continue;

        // "PortalGrasslands" → "grasslands"
        const worldName = cname.sub(7).lower();
        if (!getWorldConfig(worldName)) continue;

        // Find the portal part (non-collide, named "Portal")
        for (const part of child.GetDescendants()) {
          if (!part.IsA("BasePart")) continue;
          if (part.Name === "Portal" || (!part.CanCollide && part.Transparency > 0)) {
            if (!CollectionService.HasTag(part, PORTAL_TAG)) {
              CollectionService.AddTag(part, PORTAL_TAG);
              part.SetAttribute("WorldId", worldName);
              setupPortal(part, worldName);
              logger.info(`Setup portal for world: ${worldName}`);
            }
            break;
          }
        }
      }
    }

    // ── Remote handlers ──────────────────────────────────────────────

    RemoteService.getRegistry().onEvent("RequestEnterWorld", (player, payload) => {
      this.tryEnterWorld(player, payload.worldId);
    });

    RemoteService.getRegistry().onEvent("RequestExitWorld", (player) => {
      this.exitWorld(player);
    });

    // ── Cleanup ──────────────────────────────────────────────────────

    PlayerLifecycleService.onPlayerRemoving((player) => {
      deletePlayerWorld(player.UserId);
      lastPortalTouch.delete(player.UserId);
    });

    logger.info("WorldService initialized.");
  },

  onStart() {
    dayNightHandle.Service.onStart?.();
  },

  onDestroy() {
    dayNightHandle.Service.onDestroy?.();
    clearPlayerWorlds();
    lastPortalTouch.clear();
  },
};

export const getWorldManager = () => dayNightHandle.getWorldManager();
