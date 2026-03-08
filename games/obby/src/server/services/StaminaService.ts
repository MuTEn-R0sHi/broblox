/**
 * Stamina Service
 * Manages per-player stamina for sprinting.
 *
 * - Drain: 1 unit/sec while sprinting
 * - Recharge: 0.5 unit/sec while walking, 1 unit/sec while idle
 * - Exhaustion cooldown: 2s after stamina fully depleted before recharge starts
 * - Max stamina = effective stamina attribute (base + gear)
 *
 * The service runs a Heartbeat loop on the server (authoritative). The client
 * receives periodic StaminaSync events to render the HUD bar and to know when
 * sprinting is allowed/denied.
 */

import { RunService } from "@rbxts/services";
import { Service, createLogger } from "@broblox/core";
import { OBBY_CONSTANTS } from "shared/types";
import { AttributeService } from "./AttributeService";
import { RemoteService } from "./RemoteService";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const logger = createLogger("StaminaService");

// ── Per-player state ─────────────────────────────────────────────────────────

interface StaminaState {
  current: number;
  exhausted: boolean;
  exhaustionTimer: number; // seconds remaining on exhaustion cooldown
}

const states = new Map<number, StaminaState>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMaxStamina(player: Player): number {
  return AttributeService.getEffective(player).stamina;
}

function isSprinting(player: Player): boolean {
  const character = player.Character;
  if (!character) return false;
  const humanoid = character.FindFirstChildOfClass("Humanoid");
  if (!humanoid) return false;

  // A player is sprinting when their WalkSpeed equals the run-speed value.
  const runSpeed = AttributeService.getRunSpeed(player);
  return humanoid.WalkSpeed >= runSpeed - 0.01;
}

// ── Public API ───────────────────────────────────────────────────────────────

let heartbeatConn: RBXScriptConnection | undefined;

export const StaminaService: Service & {
  getState(player: Player): StaminaState | undefined;
  canSprint(player: Player): boolean;
  setExhausted(player: Player): void;
  syncToClient(player: Player): void;
} = {
  getState(player: Player): StaminaState | undefined {
    return states.get(player.UserId);
  },

  canSprint(player: Player): boolean {
    const s = states.get(player.UserId);
    if (!s) return false;
    return s.current > 0 && !s.exhausted;
  },

  setExhausted(player: Player): void {
    const s = states.get(player.UserId);
    if (!s) return;
    s.exhausted = true;
    s.exhaustionTimer = OBBY_CONSTANTS.STAMINA_EXHAUSTION_COOLDOWN;

    // Force walk speed (remove sprint)
    const character = player.Character;
    if (character) {
      const humanoid = character.FindFirstChildOfClass("Humanoid");
      if (humanoid) {
        humanoid.WalkSpeed = AttributeService.getWalkSpeed(player);
      }
    }
  },

  syncToClient(player: Player): void {
    const s = states.get(player.UserId);
    if (!s) return;
    RemoteService.getRegistry().fireClient("StaminaSync", player, {
      current: math.floor(s.current * 10) / 10,
      max: getMaxStamina(player),
      exhausted: s.exhausted,
    });
  },

  onInit() {
    logger.debug("StaminaService initializing...");

    PlayerLifecycleService.onPlayerAdded((player) => {
      const maxStam = getMaxStamina(player);
      states.set(player.UserId, {
        current: maxStam,
        exhausted: false,
        exhaustionTimer: 0,
      });
    });

    PlayerLifecycleService.onPlayerRemoving((player) => {
      states.delete(player.UserId);
    });
  },

  onStart() {
    let syncAccumulator = 0;
    const SYNC_INTERVAL = 0.25; // seconds between client syncs

    heartbeatConn = RunService.Heartbeat.Connect((dt) => {
      syncAccumulator += dt;
      const shouldSync = syncAccumulator >= SYNC_INTERVAL;
      if (shouldSync) syncAccumulator = 0;

      states.forEach((state, userId) => {
        const player = game.GetService("Players").GetPlayerByUserId(userId);
        if (!player) return;

        const maxStam = getMaxStamina(player);

        if (state.exhausted) {
          // Exhaustion cooldown
          state.exhaustionTimer -= dt;
          if (state.exhaustionTimer <= 0) {
            state.exhausted = false;
            state.exhaustionTimer = 0;
          }
        } else if (isSprinting(player)) {
          // Drain stamina
          state.current = math.max(0, state.current - OBBY_CONSTANTS.STAMINA_DRAIN_RATE * dt);
          if (state.current <= 0) {
            this.setExhausted(player);
          }
        } else {
          // Recharge
          const character = player.Character;
          const humanoid = character?.FindFirstChildOfClass("Humanoid");
          const isMoving = humanoid !== undefined && humanoid.MoveDirection.Magnitude > 0.1;
          const rechargeRate = isMoving
            ? OBBY_CONSTANTS.STAMINA_RECHARGE_RATE
            : OBBY_CONSTANTS.STAMINA_RECHARGE_IDLE_RATE;
          state.current = math.min(maxStam, state.current + rechargeRate * dt);
        }

        if (shouldSync) {
          this.syncToClient(player);
        }
      });
    });

    logger.info("StaminaService started.");
  },

  onDestroy() {
    heartbeatConn?.Disconnect();
    heartbeatConn = undefined;
    states.clear();
  },
};
