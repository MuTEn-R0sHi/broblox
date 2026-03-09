/**
 * Attribute Service
 * Manages player speed/jump/stamina attributes and applies them to Humanoid.
 *
 * Effective stats = base attributes + gear bonuses (from EquipmentStore).
 * Humanoid.WalkSpeed = WALK_SPEED_BASE + effectiveSpeed × WALK_SPEED_SCALE
 * Humanoid.JumpPower = effectiveJump
 */

import { Service, createLogger } from "@broblox/core";
import { PlayerAttributes, OBBY_CONSTANTS } from "shared/types";
import { DataService } from "./DataService";
import { RemoteService } from "./RemoteService";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { getEquipmentStore } from "./EquipmentService";

const logger = createLogger("AttributeService");

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGearBonuses(player: Player): PlayerAttributes {
  const store = getEquipmentStore(player.UserId);
  if (!store) return { speed: 0, jump: 0, stamina: 0 };

  return {
    speed: store.getStatBonus("speed"),
    jump: store.getStatBonus("jump"),
    stamina: store.getStatBonus("stamina"),
  };
}

function computeEffective(base: PlayerAttributes, bonuses: PlayerAttributes): PlayerAttributes {
  return {
    speed: base.speed + bonuses.speed,
    jump: base.jump + bonuses.jump,
    stamina: base.stamina + bonuses.stamina,
  };
}

function walkSpeedFromEffective(effective: PlayerAttributes): number {
  return OBBY_CONSTANTS.WALK_SPEED_BASE + effective.speed * OBBY_CONSTANTS.WALK_SPEED_SCALE;
}

function runSpeedFromEffective(effective: PlayerAttributes): number {
  return walkSpeedFromEffective(effective) * OBBY_CONSTANTS.RUN_SPEED_MULTIPLIER;
}

// ── Public API ───────────────────────────────────────────────────────────────

export const AttributeService: Service & {
  getEffective(player: Player): PlayerAttributes;
  getWalkSpeed(player: Player): number;
  getRunSpeed(player: Player): number;
  applyToHumanoid(player: Player): void;
  syncToClient(player: Player): void;
} = {
  getEffective(player: Player): PlayerAttributes {
    const base = DataService.getAttributes(player);
    if (!base) {
      return {
        speed: OBBY_CONSTANTS.DEFAULT_SPEED,
        jump: OBBY_CONSTANTS.DEFAULT_JUMP,
        stamina: OBBY_CONSTANTS.DEFAULT_STAMINA,
      };
    }
    return computeEffective(base, getGearBonuses(player));
  },

  getWalkSpeed(player: Player): number {
    return walkSpeedFromEffective(this.getEffective(player));
  },

  getRunSpeed(player: Player): number {
    return runSpeedFromEffective(this.getEffective(player));
  },

  applyToHumanoid(player: Player): void {
    const character = player.Character;
    if (!character) return;

    const humanoid = character.FindFirstChildOfClass("Humanoid");
    if (!humanoid) return;

    const effective = this.getEffective(player);
    const walkSpeed = walkSpeedFromEffective(effective);

    humanoid.WalkSpeed = walkSpeed;
    humanoid.JumpPower = effective.jump;

    logger.debug(
      `Applied stats to ${player.Name}: WalkSpeed=${walkSpeed}, JumpPower=${effective.jump}`
    );
  },

  syncToClient(player: Player): void {
    const base = DataService.getAttributes(player);
    if (!base) return;

    const data = DataService.getData(player);
    if (!data) return;

    RemoteService.getRegistry().fireClient("AttributeSync", player, {
      base,
      effective: this.getEffective(player),
      trainingReps: data.trainingReps,
    });
  },

  onInit() {
    logger.debug("AttributeService initializing...");

    PlayerLifecycleService.onPlayerAdded((player) => {
      // Apply stats once character loads and on every respawn.
      const apply = () => {
        this.applyToHumanoid(player);
        this.syncToClient(player);
      };

      player.CharacterAdded.Connect(() => {
        // Small delay to ensure Humanoid exists.
        task.defer(apply);
      });

      // Apply immediately if character already exists.
      if (player.Character) {
        task.defer(apply);
      }
    });
  },

  onStart() {
    logger.info("AttributeService started.");
  },
};
