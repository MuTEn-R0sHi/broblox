/**
 * Remote Service
 * Sets up RemoteEvents for client-server communication.
 */

import { Service, createLogger } from "@rbx/core";
import { ReplicatedStorage } from "@rbxts/services";

const logger = createLogger("RemoteService");

// Module-level state
let remoteFolder: Folder | undefined;
let checkpointReachedRemote: RemoteEvent | undefined;
let requestRespawnRemote: RemoteEvent | undefined;
let stageCompletedRemote: RemoteEvent | undefined;
let playerDataSyncRemote: RemoteEvent | undefined;
let leaderboardUpdateRemote: RemoteEvent | undefined;

function createRemoteEvent(name: string, parent: Folder): RemoteEvent {
  const remote = new Instance("RemoteEvent");
  remote.Name = name;
  remote.Parent = parent;
  return remote;
}

export const RemoteService: Service & {
  checkpointReached(): RemoteEvent;
  requestRespawn(): RemoteEvent;
  stageCompleted(): RemoteEvent;
  playerDataSync(): RemoteEvent;
  leaderboardUpdate(): RemoteEvent;
  fireClient(player: Player, eventName: string, ...args: unknown[]): void;
} = {
  checkpointReached() {
    return checkpointReachedRemote!;
  },

  requestRespawn() {
    return requestRespawnRemote!;
  },

  stageCompleted() {
    return stageCompletedRemote!;
  },

  playerDataSync() {
    return playerDataSyncRemote!;
  },

  leaderboardUpdate() {
    return leaderboardUpdateRemote!;
  },

  fireClient(player: Player, eventName: string, ...args: unknown[]): void {
    let remote: RemoteEvent | undefined;

    if (eventName === "ObbyCheckpointReached") {
      remote = checkpointReachedRemote;
    } else if (eventName === "ObbyStageCompleted") {
      remote = stageCompletedRemote;
    } else if (eventName === "ObbyRequestRespawn") {
      remote = requestRespawnRemote;
    } else if (eventName === "ObbyPlayerDataSync") {
      remote = playerDataSyncRemote;
    } else if (eventName === "ObbyLeaderboardUpdate") {
      remote = leaderboardUpdateRemote;
    }

    if (remote) {
      remote.FireClient(player, ...args);
    } else {
      logger.warn(`Unknown event: ${eventName}`);
    }
  },

  onInit() {
    logger.debug("Creating remotes...");

    remoteFolder = new Instance("Folder");
    remoteFolder.Name = "ObbyRemotes";
    remoteFolder.Parent = ReplicatedStorage;

    checkpointReachedRemote = createRemoteEvent("CheckpointReached", remoteFolder);
    requestRespawnRemote = createRemoteEvent("RequestRespawn", remoteFolder);
    stageCompletedRemote = createRemoteEvent("StageCompleted", remoteFolder);
    playerDataSyncRemote = createRemoteEvent("PlayerDataSync", remoteFolder);
    leaderboardUpdateRemote = createRemoteEvent("LeaderboardUpdate", remoteFolder);

    logger.debug("Remotes created");
  },

  onDestroy() {
    if (remoteFolder) {
      remoteFolder.Destroy();
    }
  },
};
