/**
 * Moderation Enforcement Service Factory
 *
 * Creates a Service that:
 * - Kicks banned players on join
 * - Sets muted-player attributes (for ChatModerationService)
 * - Reacts to cross-server ban/mute sync events
 */

import { Service, createLogger } from "@broblox/core";
import { getModeration } from "./service";
import type { BanRecord, MuteRecord } from "./types";

const MUTED_ATTRIBUTE = "rbx.moderation.muted";
const MUTE_TYPE_ATTRIBUTE = "rbx.moderation.muteType";
const MUTE_EXPIRES_IN_ATTRIBUTE = "rbx.moderation.muteExpiresIn";

export interface ModerationEnforcementConfig {
  /** Game-specific DataStore name (e.g. "StarterModeration", "ObbyModeration"). */
  datastoreName: string;

  /**
   * Register a callback for when a player joins.
   * Typically wired to `PlayerLifecycleService.onPlayerAdded`.
   */
  onPlayerAdded: (callback: (player: Player) => void) => void;
}

export interface ModerationEnforcementHandle {
  /** The Service to register with Application.register(). */
  Service: Service;
}

function setMutedAttributes(
  player: Player,
  opts: { muted: boolean; type?: string; expiresIn?: number }
): void {
  player.SetAttribute(MUTED_ATTRIBUTE, opts.muted);
  if (opts.muted) {
    player.SetAttribute(MUTE_TYPE_ATTRIBUTE, opts.type ?? "unknown");
    player.SetAttribute(MUTE_EXPIRES_IN_ATTRIBUTE, opts.expiresIn ?? 0);
  } else {
    player.SetAttribute(MUTE_TYPE_ATTRIBUTE, undefined);
    player.SetAttribute(MUTE_EXPIRES_IN_ATTRIBUTE, undefined);
  }
}

/**
 * Create a moderation enforcement service.
 *
 * @example
 * ```ts
 * const handle = createModerationEnforcementService({
 *   datastoreName: "StarterModeration",
 *   onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
 * });
 * export const ModerationEnforcementService = handle.Service;
 * ```
 */
export function createModerationEnforcementService(
  config: ModerationEnforcementConfig
): ModerationEnforcementHandle {
  const Players = game.GetService("Players") as Players;
  const logger = createLogger("ModerationEnforcementService");

  const ModerationEnforcementService: Service = {
    onInit() {
      const moderation = getModeration(config.datastoreName);

      const enforceBan = (player: Player) => {
        const result = moderation.checkBan(player.UserId);
        if (result.isBanned) {
          logger.warn(`Kicking banned player ${player.Name} (${player.UserId})`);
          player.Kick(result.message);
        }
      };

      const applyMuteState = (player: Player) => {
        const result = moderation.checkMute(player.UserId);
        if (!result.isMuted) {
          setMutedAttributes(player, { muted: false });
          return;
        }
        setMutedAttributes(player, {
          muted: true,
          type: result.mute?.type,
          expiresIn: result.expiresIn,
        });
      };

      config.onPlayerAdded((player) => {
        enforceBan(player);
        applyMuteState(player);
      });

      moderation.onBan((record: BanRecord) => {
        const player = Players.GetPlayerByUserId(record.playerId);
        if (player) enforceBan(player);
      });

      moderation.onMute((record: MuteRecord) => {
        const player = Players.GetPlayerByUserId(record.playerId);
        if (player) applyMuteState(player);
      });

      logger.info("Moderation enforcement enabled (bans + mute attributes)");
    },
  };

  return { Service: ModerationEnforcementService };
}
