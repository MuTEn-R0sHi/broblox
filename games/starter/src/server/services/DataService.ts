/**
 * Data Service — Starter Game
 *
 * Handles player data persistence.
 * Uses the @broblox/data createDataService factory for session/store lifecycle.
 * Game-specific mutations are layered on top.
 */

import { Service, createLogger } from "@broblox/core";
import { createDataService } from "@broblox/data";
import { StarterPlayerData } from "shared/types";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { RemoteService } from "./RemoteService";

const logger = createLogger("DataService");

const STORE_VERSION = 1;

const DEFAULT_PLAYER_DATA: StarterPlayerData = {
  __version: STORE_VERSION,
  coins: 0,
  kills: 0,
  lastPlayedAt: 0,
};

const dataHandle = createDataService<StarterPlayerData>({
  storeConfig: {
    name: "starter_player_data",
    version: STORE_VERSION,
    defaultData: () => ({
      ...DEFAULT_PLAYER_DATA,
      lastPlayedAt: os.time(),
    }),
  },
  autoSaveIntervalSec: 60,
});

export const DataService: Service & {
  getData(player: Player): StarterPlayerData | undefined;
  updateData(player: Player, updates: Partial<StarterPlayerData>): void;
  addCoins(player: Player, amount: number): void;
  incrementKills(player: Player): void;
} = {
  getData(player: Player): StarterPlayerData | undefined {
    return dataHandle.getSessionManager().getSession(player)?.data;
  },

  updateData(player: Player, updates: Partial<StarterPlayerData>): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) {
      logger.warn(`No session found for player ${player.UserId}`);
      return;
    }
    const data = session.data;
    if (updates.coins !== undefined) data.coins = updates.coins;
    if (updates.kills !== undefined) data.kills = updates.kills;
    if (updates.__version !== undefined)
      (data as { __version: number }).__version = updates.__version;
    session.markDirty();
    dataHandle.getStore().markDirty(player);
  },

  addCoins(player: Player, amount: number): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return;
    const data = session.data;
    data.coins += amount;
    session.markDirty();
    dataHandle.getStore().markDirty(player);
    logger.debug(`Player ${player.Name} earned ${amount} coins (total: ${data.coins})`);
  },

  incrementKills(player: Player): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return;
    const data = session.data;
    data.kills++;
    session.markDirty();
    dataHandle.getStore().markDirty(player);
  },

  onInit() {
    logger.debug("Initializing data service...");
    dataHandle.Service.onInit?.();

    PlayerLifecycleService.onPlayerAdded((player) => {
      dataHandle.initPlayer(player);
      const session = dataHandle.getSessionManager().getSession(player);
      if (!session) {
        logger.warn(`Failed to start session for ${player.Name}`);
        return;
      }
      session.data.lastPlayedAt = os.time();
      session.markDirty();
      dataHandle.getStore().markDirty(player);
      RemoteService.getRegistry().fireClient("PlayerDataSync", player, {
        coins: session.data.coins,
        kills: session.data.kills,
      });
    });

    PlayerLifecycleService.onPlayerRemoving((player) => {
      logger.info(`Ending data session for player ${player.Name}...`);
      const session = dataHandle.getSessionManager().getSession(player);
      if (session) {
        session.data.lastPlayedAt = os.time();
        session.markDirty();
        dataHandle.getStore().markDirty(player);
      }
      dataHandle.cleanupPlayer(player);
    });
  },

  onStart() {
    dataHandle.Service.onStart?.();
  },

  onDestroy() {
    dataHandle.Service.onDestroy?.();
  },
};
