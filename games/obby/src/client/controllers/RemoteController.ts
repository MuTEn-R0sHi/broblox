/**
 * Remote Controller
 * Handles client-server communication.
 */

import { ReplicatedStorage } from "@rbxts/services";
import { createLogger } from "@rbx/core";
import {
  CheckpointReachedEvent,
  LeaderboardEntryDto,
  LeaderboardUpdatePayload,
  StageCompletedEvent,
} from "shared/types";

const logger = createLogger("RemoteController");

type CheckpointCallback = (event: CheckpointReachedEvent) => void;
type StageCallback = (event: StageCompletedEvent) => void;
type LeaderboardCallback = (data: LeaderboardUpdatePayload) => void;
type DataSyncCallback = (data: {
  coins: number;
  currentStage: number;
  currentCheckpoint: number;
}) => void;

function parsePlayerDataSyncPayload(
  data: unknown
): { coins: number; currentStage: number; currentCheckpoint: number } | undefined {
  if (!typeIs(data, "table")) return undefined;
  const raw = data as { coins?: unknown; currentStage?: unknown; currentCheckpoint?: unknown };
  if (!typeIs(raw.coins, "number")) return undefined;
  if (!typeIs(raw.currentStage, "number")) return undefined;
  if (!typeIs(raw.currentCheckpoint, "number")) return undefined;
  return {
    coins: raw.coins,
    currentStage: raw.currentStage,
    currentCheckpoint: raw.currentCheckpoint,
  };
}

function parseLeaderboardUpdatePayload(data: unknown): LeaderboardUpdatePayload | undefined {
  if (!typeIs(data, "table")) return undefined;
  const raw = data as { updatedAt?: unknown; entries?: unknown };
  if (!typeIs(raw.updatedAt, "number")) return undefined;
  if (!typeIs(raw.entries, "table")) return undefined;

  const entriesOut: LeaderboardEntryDto[] = [];
  for (const entry of raw.entries as unknown[]) {
    const parsedEntry = parseLeaderboardEntryDto(entry);
    if (!parsedEntry) {
      logger.warn("Invalid leaderboard entry in payload");
      continue;
    }
    entriesOut.push(parsedEntry);
  }

  return {
    updatedAt: raw.updatedAt,
    entries: entriesOut,
  };
}

function parseLeaderboardEntryDto(data: unknown): LeaderboardEntryDto | undefined {
  if (!typeIs(data, "table")) return undefined;
  const raw = data as {
    userId?: unknown;
    playerName?: unknown;
    completions?: unknown;
    bestTime?: unknown;
    rank?: unknown;
  };

  if (!typeIs(raw.userId, "number")) return undefined;
  if (!typeIs(raw.playerName, "string")) return undefined;
  if (!typeIs(raw.completions, "number")) return undefined;
  if (!typeIs(raw.rank, "number")) return undefined;
  if (raw.bestTime !== undefined && !typeIs(raw.bestTime, "number")) return undefined;

  return {
    userId: raw.userId,
    playerName: raw.playerName,
    completions: raw.completions,
    bestTime: raw.bestTime as number | undefined,
    rank: raw.rank,
  };
}

export class RemoteController {
  private remoteFolder?: Folder;
  private checkpointReached?: RemoteEvent;
  private requestRespawn?: RemoteEvent;
  private stageCompleted?: RemoteEvent;
  private leaderboardUpdate?: RemoteEvent;
  private playerDataSync?: RemoteEvent;

  private checkpointCallbacks: CheckpointCallback[] = [];
  private stageCallbacks: StageCallback[] = [];
  private leaderboardCallbacks: LeaderboardCallback[] = [];
  private dataSyncCallbacks: DataSyncCallback[] = [];

  boot(): void {
    logger.info("RemoteController booting...");

    // Wait for remotes folder
    this.remoteFolder = ReplicatedStorage.WaitForChild("ObbyRemotes") as Folder;

    // Get remote events
    this.checkpointReached = this.remoteFolder.WaitForChild("CheckpointReached") as RemoteEvent;
    this.requestRespawn = this.remoteFolder.WaitForChild("RequestRespawn") as RemoteEvent;
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
