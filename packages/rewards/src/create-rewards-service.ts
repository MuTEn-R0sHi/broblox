/**
 * Factory for game-level RewardsService.
 *
 * Covers both daily-login rewards and achievements with a single config.
 */

import { Service, createLogger } from "@rbx/core";
import {
  DailyRewardDay,
  AchievementDefinition,
  RewardsConfig,
  AchievementCompletedEvent,
  DailyRewardClaimedEvent,
} from "./types";
import { DailyRewardStore } from "./daily-reward-store";
import { AchievementStore } from "./achievement-store";

export interface RewardsServiceConfig {
  /** The daily reward cycle (repeats after the array ends). */
  rewardCycle: DailyRewardDay[];
  /** Achievements to register. */
  achievements: AchievementDefinition[];
  /** DataStore name for daily rewards. */
  dailyDatastoreName: string;
  /** DataStore name for achievements. */
  achievementDatastoreName: string;
  /** Extra DailyRewardStore options. */
  dailyStoreOptions?: Partial<RewardsConfig>;
  /**
   * Wires player-leave cleanup.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerRemoving(cb)`
   */
  onPlayerRemoving?: (callback: (player: Player) => void) => void;
  /**
   * Wires player-join initialization.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerAdded(cb)`
   */
  onPlayerAdded?: (callback: (player: Player) => void) => void;
  /**
   * Fired when a player completes an achievement.
   */
  onAchievementCompleted?: (event: AchievementCompletedEvent) => void;
  /**
   * Fired when a player claims a daily reward.
   */
  onDailyRewardClaimed?: (event: DailyRewardClaimedEvent) => void;
}

export interface RewardsServiceHandle {
  Service: Service;
  getDailyRewardStore(playerId: number): DailyRewardStore | undefined;
  getAchievementStore(playerId: number): AchievementStore | undefined;
  initPlayer(playerId: number): { daily: DailyRewardStore; achievements: AchievementStore };
  cleanupPlayer(playerId: number): void;
}

export function createRewardsService(config: RewardsServiceConfig): RewardsServiceHandle {
  const logger = createLogger("RewardsService");
  const playerDaily = new Map<number, DailyRewardStore>();
  const playerAchievements = new Map<number, AchievementStore>();

  const handle: RewardsServiceHandle = {
    Service: {
      name: "RewardsService",

      onInit() {
        logger.info(
          `Rewards config: ${config.rewardCycle.size()}-day cycle, ${config.achievements.size()} achievements`
        );
        config.onPlayerRemoving?.((player) => {
          const daily = playerDaily.get(player.UserId);
          if (daily && daily.isDirty()) {
            daily.save();
          }
          playerDaily.delete(player.UserId);
          const ach = playerAchievements.get(player.UserId);
          if (ach && ach.isDirty()) {
            ach.save();
          }
          playerAchievements.delete(player.UserId);
        });
      },

      onStart() {
        logger.info("RewardsService started.");
        config.onPlayerAdded?.((player) => handle.initPlayer(player.UserId));
      },

      onDestroy() {
        playerDaily.forEach((store, playerId) => {
          if (store.isDirty()) {
            store.save();
            logger.info(`Saved daily rewards for player ${playerId}`);
          }
        });
        playerAchievements.forEach((store, playerId) => {
          if (store.isDirty()) {
            store.save();
            logger.info(`Saved achievements for player ${playerId}`);
          }
        });
        logger.info("RewardsService stopped.");
      },
    },

    getDailyRewardStore(playerId: number) {
      return playerDaily.get(playerId);
    },

    getAchievementStore(playerId: number) {
      return playerAchievements.get(playerId);
    },

    initPlayer(playerId: number) {
      const daily = new DailyRewardStore(playerId, config.rewardCycle, {
        dailyDatastoreName: config.dailyDatastoreName,
        enableLogging: true,
        ...config.dailyStoreOptions,
      });
      daily.init();
      daily.load();
      playerDaily.set(playerId, daily);

      const achievements = new AchievementStore(playerId, {
        achievementDatastoreName: config.achievementDatastoreName,
        enableLogging: true,
      });
      achievements.registerAll(config.achievements);
      achievements.init();
      achievements.load();
      if (config.onAchievementCompleted) {
        achievements.onAchievementCompleted((event) => {
          config.onAchievementCompleted!(event);
        });
      }
      if (config.onDailyRewardClaimed) {
        daily.onClaimed((event) => {
          config.onDailyRewardClaimed!(event);
        });
      }
      playerAchievements.set(playerId, achievements);

      logger.info(`Rewards loaded for player ${playerId}`);
      return { daily, achievements };
    },

    cleanupPlayer(playerId: number) {
      const daily = playerDaily.get(playerId);
      if (daily && daily.isDirty()) {
        daily.save();
      }
      playerDaily.delete(playerId);

      const ach = playerAchievements.get(playerId);
      if (ach && ach.isDirty()) {
        ach.save();
      }
      playerAchievements.delete(playerId);
    },
  };
  return handle;
}
