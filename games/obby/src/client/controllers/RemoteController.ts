/**
 * Remote Controller
 * Handles client-server communication via Controller lifecycle.
 * Uses the type-safe @rbx/net registry.
 */

import { Controller, createLogger } from "@rbx/core";
import { createClientRegistry, ClientRemoteRegistry } from "@rbx/net";
import { ObbyRemotes, ObbyRemotesType, PlayerDataSyncPayload } from "shared/remotes";
import type {
  CheckpointReachedEvent,
  LeaderboardRefreshStatusPayload,
  LeaderboardUpdatePayload,
  StageCompletedEvent,
} from "shared/types";

const logger = createLogger("RemoteController");

type CheckpointCallback = (event: CheckpointReachedEvent) => void;
type StageCallback = (event: StageCompletedEvent) => void;
type LeaderboardCallback = (data: LeaderboardUpdatePayload) => void;
type LeaderboardRefreshStatusCallback = (data: LeaderboardRefreshStatusPayload) => void;
type DataSyncCallback = (data: PlayerDataSyncPayload) => void;

// Module-level state
let registry: ClientRemoteRegistry<ObbyRemotesType>;

const checkpointCallbacks: CheckpointCallback[] = [];
const stageCallbacks: StageCallback[] = [];
const leaderboardCallbacks: LeaderboardCallback[] = [];
const leaderboardRefreshStatusCallbacks: LeaderboardRefreshStatusCallback[] = [];
const dataSyncCallbacks: DataSyncCallback[] = [];

export const RemoteController: Controller & {
  requestRespawnAtCheckpoint(checkpointId?: number): void;
  requestLeaderboardRefresh(): void;
  onCheckpoint(callback: CheckpointCallback): void;
  onStage(callback: StageCallback): void;
  onLeaderboard(callback: LeaderboardCallback): void;
  onLeaderboardRefreshStatus(callback: LeaderboardRefreshStatusCallback): void;
  onDataSync(callback: DataSyncCallback): void;
} = {
  onInit() {
    logger.info("RemoteController initializing...");

    registry = createClientRegistry(ObbyRemotes, "ObbyRemotes");
    registry.initialize();

    registry.onEvent("CheckpointReached", (event) => {
      logger.debug(`Checkpoint reached: ${event.checkpointId}`);
      for (const cb of checkpointCallbacks) {
        cb(event);
      }
    });

    registry.onEvent("StageCompleted", (event) => {
      logger.debug(`Stage completed: ${event.stageNumber}`);
      for (const cb of stageCallbacks) {
        cb(event);
      }
    });

    registry.onEvent("LeaderboardUpdate", (data) => {
      for (const cb of leaderboardCallbacks) {
        cb(data);
      }
    });

    registry.onEvent("LeaderboardRefreshStatus", (data) => {
      for (const cb of leaderboardRefreshStatusCallbacks) {
        cb(data);
      }
    });

    registry.onEvent("PlayerDataSync", (data) => {
      logger.debug(`Data sync: coins=${data.coins}`);
      for (const cb of dataSyncCallbacks) {
        cb(data);
      }
    });

    logger.info("RemoteController initialized.");
  },

  onDestroy() {
    if (registry) {
      registry.destroy();
    }
  },

  requestRespawnAtCheckpoint(checkpointId?: number): void {
    registry.fire("RequestRespawn", { toCheckpoint: checkpointId });
  },

  requestLeaderboardRefresh(): void {
    registry.fire("RequestLeaderboard", undefined as unknown as void);
  },

  onCheckpoint(callback: CheckpointCallback): void {
    checkpointCallbacks.push(callback);
  },

  onStage(callback: StageCallback): void {
    stageCallbacks.push(callback);
  },

  onLeaderboard(callback: LeaderboardCallback): void {
    leaderboardCallbacks.push(callback);
  },

  onLeaderboardRefreshStatus(callback: LeaderboardRefreshStatusCallback): void {
    leaderboardRefreshStatusCallbacks.push(callback);
  },

  onDataSync(callback: DataSyncCallback): void {
    dataSyncCallbacks.push(callback);
  },
};
