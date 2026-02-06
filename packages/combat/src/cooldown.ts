/**
 * Server-authoritative cooldown system.
 *
 * All cooldown state is tracked server-side. Clients can query
 * remaining cooldown times but cannot modify them.
 *
 * Features:
 * - Per-player, per-ability cooldown tracking
 * - Multi-charge abilities with recovery
 * - Event system for cooldown state changes
 * - Suspicious activity logging
 *
 * @note Uses roblox-ts compatible patterns for Luau compilation.
 */

import { Result, ok, err, ErrorCode, PlayerId } from "@rbx/shared-types";
import { arraySize, arrayRemoveAt } from "@rbx/core";
import type {
  AbilityId,
  CooldownConfig,
  CooldownState,
  UseAbilityResult,
  CooldownStartedEvent,
  CooldownEndedEvent,
  AbilityRejectedEvent,
} from "./types";

// ============================================================================
// State
// ============================================================================

/** Registered ability configurations */
const abilityConfigs = new Map<AbilityId, CooldownConfig>();

/** Per-player cooldown states: playerId -> abilityId -> state */
const playerCooldowns = new Map<number, Map<AbilityId, CooldownState>>();

// ============================================================================
// Event Listeners
// ============================================================================

type EventListener<T> = (event: T) => void;

const cooldownStartedListeners: EventListener<CooldownStartedEvent>[] = [];
const cooldownEndedListeners: EventListener<CooldownEndedEvent>[] = [];
const abilityRejectedListeners: EventListener<AbilityRejectedEvent>[] = [];

/**
 * Get the maximum of two numbers (roblox-ts compatible).
 */
function maxNum(a: number, b: number): number {
  return a > b ? a : b;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Register an ability with cooldown configuration.
 *
 * @param config - Cooldown configuration for the ability
 */
export function registerAbility(config: CooldownConfig): void {
  abilityConfigs.set(config.abilityId, {
    ...config,
    charges: config.charges ?? 1,
    chargeRecoverySeconds: config.chargeRecoverySeconds ?? config.durationSeconds,
  });
}

/**
 * Get the configuration for an ability.
 */
export function getAbilityConfig(abilityId: AbilityId): CooldownConfig | undefined {
  return abilityConfigs.get(abilityId);
}

/**
 * Get all registered ability IDs.
 */
export function getRegisteredAbilities(): AbilityId[] {
  const abilities: AbilityId[] = [];
  abilityConfigs.forEach((_, id) => {
    abilities.push(id);
  });
  return abilities;
}

// ============================================================================
// Cooldown State Management
// ============================================================================

/**
 * Get or create cooldown state for a player's ability.
 */
function getOrCreateState(playerId: PlayerId, abilityId: AbilityId): CooldownState | undefined {
  const config = abilityConfigs.get(abilityId);
  if (!config) return undefined;

  let playerStates = playerCooldowns.get(playerId as number);
  if (!playerStates) {
    playerStates = new Map();
    playerCooldowns.set(playerId as number, playerStates);
  }

  let state = playerStates.get(abilityId);
  if (!state) {
    const maxCharges = config.charges ?? 1;
    state = {
      abilityId,
      charges: maxCharges,
      maxCharges,
      nextChargeAt: 0,
      startedAt: 0,
    };
    playerStates.set(abilityId, state);
  }

  return state;
}

/**
 * Update cooldown state, recovering charges based on elapsed time.
 */
function updateState(state: CooldownState, config: CooldownConfig, now: number): void {
  if (state.charges >= state.maxCharges) {
    // Already at max charges, nothing to recover
    return;
  }

  const recoveryTime = config.chargeRecoverySeconds ?? config.durationSeconds;

  // Recover charges that have completed
  while (state.charges < state.maxCharges && now >= state.nextChargeAt) {
    state.charges++;
    if (state.charges < state.maxCharges) {
      state.nextChargeAt += recoveryTime;
    }
  }
}

// ============================================================================
// Core API
// ============================================================================

/**
 * Attempt to use an ability (consume a charge).
 *
 * @param playerId - Player attempting to use the ability
 * @param abilityId - Ability to use
 * @returns Result with usage outcome
 */
export function useAbility(playerId: PlayerId, abilityId: AbilityId): Result<UseAbilityResult> {
  const config = abilityConfigs.get(abilityId);
  if (!config) {
    emitRejected(playerId, abilityId, "unknown_ability");
    return ok({
      allowed: false,
      reason: "unknown_ability",
    });
  }

  const state = getOrCreateState(playerId, abilityId);
  if (!state) {
    return err(ErrorCode.InternalError, {
      message: "Failed to create cooldown state",
    });
  }

  const now = os.clock();
  updateState(state, config, now);

  if (state.charges <= 0) {
    const cooldownRemaining = state.nextChargeAt - now;
    emitRejected(playerId, abilityId, "on_cooldown", cooldownRemaining);
    return ok({
      allowed: false,
      reason: "on_cooldown",
      cooldownRemaining: maxNum(0, cooldownRemaining),
    });
  }

  // Consume a charge
  state.charges--;
  state.startedAt = now;

  // Set next charge recovery time if this was the first charge consumed
  if (state.charges === state.maxCharges - 1) {
    state.nextChargeAt = now + (config.chargeRecoverySeconds ?? config.durationSeconds);
  }

  // Emit cooldown started event
  const startEvent: CooldownStartedEvent = {
    playerId,
    abilityId,
    durationSeconds: config.chargeRecoverySeconds ?? config.durationSeconds,
    remainingCharges: state.charges,
    timestamp: now,
  };
  for (const listener of cooldownStartedListeners) {
    listener(startEvent);
  }

  return ok({
    allowed: true,
    remainingCharges: state.charges,
  });
}

/**
 * Check if an ability is currently on cooldown (no charges available).
 *
 * @param playerId - Player to check
 * @param abilityId - Ability to check
 * @returns true if on cooldown (no charges), false if ready
 */
export function isOnCooldown(playerId: PlayerId, abilityId: AbilityId): boolean {
  const config = abilityConfigs.get(abilityId);
  if (!config) return false;

  const state = getOrCreateState(playerId, abilityId);
  if (!state) return false;

  const now = os.clock();
  updateState(state, config, now);

  return state.charges <= 0;
}

/**
 * Get the remaining cooldown time in seconds.
 *
 * @param playerId - Player to check
 * @param abilityId - Ability to check
 * @returns Seconds until next charge is ready, 0 if ready
 */
export function getRemainingCooldown(playerId: PlayerId, abilityId: AbilityId): number {
  const config = abilityConfigs.get(abilityId);
  if (!config) return 0;

  const state = getOrCreateState(playerId, abilityId);
  if (!state) return 0;

  const now = os.clock();
  updateState(state, config, now);

  if (state.charges >= state.maxCharges) {
    return 0;
  }

  return maxNum(0, state.nextChargeAt - now);
}

/**
 * Get the current cooldown state for a player's ability.
 *
 * @param playerId - Player to check
 * @param abilityId - Ability to check
 * @returns Current cooldown state or undefined if not tracked
 */
export function getCooldownState(
  playerId: PlayerId,
  abilityId: AbilityId
): CooldownState | undefined {
  const config = abilityConfigs.get(abilityId);
  if (!config) return undefined;

  const state = getOrCreateState(playerId, abilityId);
  if (!state) return undefined;

  const now = os.clock();
  updateState(state, config, now);

  // Return a copy to prevent external mutation
  return {
    abilityId: state.abilityId,
    charges: state.charges,
    maxCharges: state.maxCharges,
    nextChargeAt: state.nextChargeAt,
    startedAt: state.startedAt,
  };
}

/**
 * Get the number of available charges for an ability.
 *
 * @param playerId - Player to check
 * @param abilityId - Ability to check
 * @returns Number of available charges
 */
export function getAvailableCharges(playerId: PlayerId, abilityId: AbilityId): number {
  const config = abilityConfigs.get(abilityId);
  if (!config) return 0;

  const state = getOrCreateState(playerId, abilityId);
  if (!state) return 0;

  const now = os.clock();
  updateState(state, config, now);

  return state.charges;
}

/**
 * Manually start a cooldown for an ability (e.g., after death).
 *
 * @param playerId - Player to put on cooldown
 * @param abilityId - Ability to cooldown
 * @param durationOverride - Optional custom duration (uses config if not provided)
 */
export function startCooldown(
  playerId: PlayerId,
  abilityId: AbilityId,
  durationOverride?: number
): Result<void> {
  const config = abilityConfigs.get(abilityId);
  if (!config) {
    return err(ErrorCode.NotFound, {
      message: `Unknown ability: ${abilityId}`,
    });
  }

  const state = getOrCreateState(playerId, abilityId);
  if (!state) {
    return err(ErrorCode.InternalError, {
      message: "Failed to create cooldown state",
    });
  }

  const now = os.clock();
  const duration = durationOverride ?? config.durationSeconds;

  state.charges = 0;
  state.startedAt = now;
  state.nextChargeAt = now + duration;

  // Emit cooldown started event
  const startEvent: CooldownStartedEvent = {
    playerId,
    abilityId,
    durationSeconds: duration,
    remainingCharges: 0,
    timestamp: now,
  };
  for (const listener of cooldownStartedListeners) {
    listener(startEvent);
  }

  return ok(undefined);
}

/**
 * Reset cooldown for a player's ability (e.g., after respawn).
 *
 * @param playerId - Player to reset
 * @param abilityId - Ability to reset
 */
export function resetCooldown(playerId: PlayerId, abilityId: AbilityId): Result<void> {
  const config = abilityConfigs.get(abilityId);
  if (!config) {
    return err(ErrorCode.NotFound, {
      message: `Unknown ability: ${abilityId}`,
    });
  }

  const playerStates = playerCooldowns.get(playerId as number);
  if (!playerStates) {
    return ok(undefined); // No state to reset
  }

  const state = playerStates.get(abilityId);
  if (!state) {
    return ok(undefined); // No state to reset
  }

  const maxCharges = config.charges ?? 1;
  state.charges = maxCharges;
  state.nextChargeAt = 0;
  state.startedAt = 0;

  // Emit cooldown ended event
  const endEvent: CooldownEndedEvent = {
    playerId,
    abilityId,
    charges: maxCharges,
    timestamp: os.clock(),
  };
  for (const listener of cooldownEndedListeners) {
    listener(endEvent);
  }

  return ok(undefined);
}

/**
 * Reset all cooldowns for a player.
 *
 * @param playerId - Player to reset
 */
export function resetAllCooldowns(playerId: PlayerId): void {
  const playerStates = playerCooldowns.get(playerId as number);
  if (!playerStates) return;

  playerStates.forEach((state, abilityId) => {
    const config = abilityConfigs.get(abilityId);
    if (config) {
      const maxCharges = config.charges ?? 1;
      state.charges = maxCharges;
      state.nextChargeAt = 0;
      state.startedAt = 0;
    }
  });
}

/**
 * Clean up all cooldown state for a player (e.g., on disconnect).
 *
 * @param playerId - Player to clean up
 */
export function clearPlayerCooldowns(playerId: PlayerId): void {
  playerCooldowns.delete(playerId as number);
}

// ============================================================================
// Event Helpers
// ============================================================================

function emitRejected(
  playerId: PlayerId,
  abilityId: AbilityId,
  reason: "on_cooldown" | "no_charges" | "unknown_ability",
  cooldownRemaining?: number
): void {
  const event: AbilityRejectedEvent = {
    playerId,
    abilityId,
    reason,
    cooldownRemaining,
    timestamp: os.clock(),
  };
  for (const listener of abilityRejectedListeners) {
    listener(event);
  }
}

// ============================================================================
// Event Subscriptions
// ============================================================================

/**
 * Register a listener for cooldown started events.
 */
export function onCooldownStarted(listener: EventListener<CooldownStartedEvent>): () => void {
  cooldownStartedListeners.push(listener);
  return () => {
    const index = cooldownStartedListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(cooldownStartedListeners, index);
  };
}

/**
 * Register a listener for cooldown ended events.
 */
export function onCooldownEnded(listener: EventListener<CooldownEndedEvent>): () => void {
  cooldownEndedListeners.push(listener);
  return () => {
    const index = cooldownEndedListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(cooldownEndedListeners, index);
  };
}

/**
 * Register a listener for ability rejected events.
 */
export function onAbilityRejected(listener: EventListener<AbilityRejectedEvent>): () => void {
  abilityRejectedListeners.push(listener);
  return () => {
    const index = abilityRejectedListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(abilityRejectedListeners, index);
  };
}

// ============================================================================
// Reset (for testing)
// ============================================================================

/**
 * Clear all cooldown state. For testing only.
 */
export function resetCooldowns(): void {
  playerCooldowns.forEach((states) => states.clear());
  playerCooldowns.clear();
  abilityConfigs.clear();
}
