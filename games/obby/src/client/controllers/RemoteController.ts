/**
 * Remote Controller
 * Handles client-server communication.
 */

import { ReplicatedStorage } from "@rbxts/services";
import { createLogger } from "@rbx/core";
import {
  CheckpointReachedEvent,
  LeaderboardRefreshStatusPayload,
  LeaderboardUpdatePayload,
  StageCompletedEvent,
} from "shared/types";
import {
  parseLeaderboardRefreshStatusPayload,
  parseLeaderboardUpdatePayload,
  parsePlayerDataSyncPayload,
} from "shared/remote-parsers";

const logger = createLogger("RemoteController");

type CheckpointCallback = (event: CheckpointReachedEvent) => void;
type StageCallback = (event: StageCompletedEvent) => void;
type LeaderboardCallback = (data: LeaderboardUpdatePayload) => void;
type LeaderboardRefreshStatusCallback = (data: LeaderboardRefreshStatusPayload) => void;
type DataSyncCallback = (data: {
  coins: number;
  currentStage: number;
  currentCheckpoint: number;
}) => void;

export class RemoteController {
  private remoteFolder?: Folder;
  private checkpointReached?: RemoteEvent;
  private requestRespawn?: RemoteEvent;
  private requestLeaderboard?: RemoteEvent;
  private leaderboardRefreshStatus?: RemoteEvent;
  private stageCompleted?: RemoteEvent;
  private leaderboardUpdate?: RemoteEvent;
  private playerDataSync?: RemoteEvent;

  private checkpointCallbacks: CheckpointCallback[] = [];
  private stageCallbacks: StageCallback[] = [];
  private leaderboardCallbacks: LeaderboardCallback[] = [];
  private leaderboardRefreshStatusCallbacks: LeaderboardRefreshStatusCallback[] = [];
  private dataSyncCallbacks: DataSyncCallback[] = [];

  boot(): void {
    logger.info("RemoteController booting...");

    // Wait for remotes folder
    this.remoteFolder = ReplicatedStorage.WaitForChild("ObbyRemotes") as Folder;

    // Get remote events
    this.checkpointReached = this.remoteFolder.WaitForChild("CheckpointReached") as RemoteEvent;
    this.requestRespawn = this.remoteFolder.WaitForChild("RequestRespawn") as RemoteEvent;
    this.requestLeaderboard = this.remoteFolder.WaitForChild("RequestLeaderboard") as RemoteEvent;
    this.leaderboardRefreshStatus = this.remoteFolder.WaitForChild(
      "LeaderboardRefreshStatus"
    ) as RemoteEvent;
    this.stageCompleted = this.remoteFolder.WaitForChild("StageCompleted") as RemoteEvent;
    this.leaderboardUpdate = this.remoteFolder.WaitForChild("LeaderboardUpdate") as RemoteEvent;
    this.playerDataSync = this.remoteFolder.WaitForChild("PlayerDataSync") as RemoteEvent;

    // Set up listeners
    this.checkpointReached.OnClientEvent.Connect((data: unknown) => {
      this.onCheckpointReached(data as CheckpointReachedEvent);
    });

    this.stageCompleted.OnClientEvent.Connect((data: unknown) => {
      this.onStageCompleted(data as StageCompletedEvent);
    });

    this.leaderboardUpdate.OnClientEvent.Connect((data: unknown) => {
      this.onLeaderboardUpdate(data);
    });

    this.leaderboardRefreshStatus.OnClientEvent.Connect((data: unknown) => {
      const parsed = parseLeaderboardRefreshStatusPayload(data);
      if (!parsed) {
        logger.warn("Invalid leaderboard refresh status payload");
        return;
      }
      for (const cb of this.leaderboardRefreshStatusCallbacks) {
        cb(parsed);
      }
    });

    this.playerDataSync.OnClientEvent.Connect((data: unknown) => {
      const parsed = parsePlayerDataSyncPayload(data);
      if (!parsed) {
        logger.warn("Invalid player data sync payload");
        return;
      }
      this.onPlayerDataSync(parsed);
    });

    logger.info("RemoteController booted.");
  }

  /**
   * Request respawn at checkpoint.
   */
  requestRespawnAtCheckpoint(checkpointId?: number): void {
    this.requestRespawn?.FireServer({ toCheckpoint: checkpointId });
  }

  /**
   * Request an immediate leaderboard snapshot from the server.
   */
  requestLeaderboardRefresh(): void {
    this.requestLeaderboard?.FireServer();
  }

  /**
   * Register callback for checkpoint reached.
   */
  onCheckpoint(callback: CheckpointCallback): void {
    this.checkpointCallbacks.push(callback);
  }

  /**
   * Register callback for stage completed.
   */
  onStage(callback: StageCallback): void {
    this.stageCallbacks.push(callback);
  }

  /**
   * Register callback for leaderboard updates.
   */
  onLeaderboard(callback: LeaderboardCallback): void {
    this.leaderboardCallbacks.push(callback);
  }

  /**
   * Register callback for leaderboard refresh status events.
   */
  onLeaderboardRefreshStatus(callback: LeaderboardRefreshStatusCallback): void {
    this.leaderboardRefreshStatusCallbacks.push(callback);
  }

  /**
   * Register callback for player data sync.
   */
  onDataSync(callback: DataSyncCallback): void {
    this.dataSyncCallbacks.push(callback);
  }

  private onCheckpointReached(event: CheckpointReachedEvent): void {
    logger.debug(`Checkpoint reached: ${event.checkpointId}`);
    for (const cb of this.checkpointCallbacks) {
      cb(event);
    }
  }

  private onStageCompleted(event: StageCompletedEvent): void {
    logger.debug(`Stage completed: ${event.stageNumber}`);
    for (const cb of this.stageCallbacks) {
      cb(event);
    }
  }

  private onLeaderboardUpdate(data: unknown): void {
    const parsed = parseLeaderboardUpdatePayload(data);
    if (!parsed) {
      logger.warn("Invalid leaderboard payload");
      return;
    }

    for (const cb of this.leaderboardCallbacks) {
      cb(parsed);
    }
  }

  private onPlayerDataSync(data: {
    coins: number;
    currentStage: number;
    currentCheckpoint: number;
  }): void {
    logger.debug(`Data sync: coins=${data.coins}`);
    for (const cb of this.dataSyncCallbacks) {
      cb(data);
    }
  }
}
