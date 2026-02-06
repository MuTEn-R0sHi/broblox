/**
 * Moderation Enforcement Service (Obby)
 *
 * Enforces bans on join and applies mute attributes so the chat
 * moderation service can suppress messages from muted players.
 * Reacts to cross-server sync events.
 */

import { Service, createLogger } from "@rbx/core";
import { Players } from "@rbxts/services";
import { getModeration, type BanRecord, type MuteRecord } from "@rbx/moderation";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const logger = createLogger("ModerationEnforcementService");

const MUTED_ATTRIBUTE = "rbx.moderation.muted";
const MUTE_TYPE_ATTRIBUTE = "rbx.moderation.muteType";
const MUTE_EXPIRES_IN_ATTRIBUTE = "rbx.moderation.muteExpiresIn";

function setMutedAttributes(
  player: Player,
  opts: { muted: boolean; type?: string; expiresIn?: number }
) {
  player.SetAttribute(MUTED_ATTRIBUTE, opts.muted);
  if (opts.muted) {
    player.SetAttribute(MUTE_TYPE_ATTRIBUTE, opts.type ?? "unknown");
    player.SetAttribute(MUTE_EXPIRES_IN_ATTRIBUTE, opts.expiresIn ?? 0);
  } else {
    player.SetAttribute(MUTE_TYPE_ATTRIBUTE, undefined);
    player.SetAttribute(MUTE_EXPIRES_IN_ATTRIBUTE, undefined);
  }
}

export const ModerationEnforcementService: Service = {
  onInit() {
    const moderation = getModeration("ObbyModeration");

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

    PlayerLifecycleService.onPlayerAdded((player) => {
      enforceBan(player);
      applyMuteState(player);
    });

    moderation.onBan((record: BanRecord) => {
      const player = Players.GetPlayerByUserId(record.playerId);
      if (player) {
        enforceBan(player);
      }
    });

    moderation.onMute((record: MuteRecord) => {
      const player = Players.GetPlayerByUserId(record.playerId);
      if (player) {
        applyMuteState(player);
      }
    });

    logger.info("Moderation enforcement enabled (bans + mute attributes)");
  },
};
