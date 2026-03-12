/**
 * Input Service Factory
 *
 * Creates a Controller-compatible handle for the input system,
 * following the same factory pattern used by server-side packages
 * (createCombatService, createQuestService, etc.).
 */

import type { Controller } from "@broblox/core";
import { initInput } from "./input-manager";
import { getMovementState, getMoveVector, isMoving } from "./input-manager";
import { isActionActive, onAction } from "./actions";
import { getCurrentDevice, detectDeviceClass } from "./device";
import type { MovementState, MoveVector } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface InputControllerConfig {
  /** If true, skip registering common actions and default bindings (for custom setups). */
  skipDefaults?: boolean;
}

export interface InputControllerHandle {
  Controller: Controller;
  getMovementState(): MovementState;
  getMoveVector(): MoveVector;
  isMoving(): boolean;
  isActionActive(actionName: string): boolean;
  onAction(
    actionName: string,
    callback: (action: string, state: { active: boolean }) => void
  ): () => void;
  getCurrentDevice(): string;
  detectDeviceClass(): "kbm" | "gamepad" | "touch";
}

// ============================================================================
// Factory
// ============================================================================

export function createInputController(_config?: InputControllerConfig): InputControllerHandle {
  let cleanup: (() => void) | undefined;

  const Controller: Controller = {
    name: "InputController",

    onStart() {
      cleanup = initInput();
    },

    onDestroy() {
      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }
    },
  };

  return {
    Controller,
    getMovementState() {
      return getMovementState();
    },
    getMoveVector() {
      return getMoveVector();
    },
    isMoving() {
      return isMoving();
    },
    isActionActive(actionName: string) {
      return isActionActive(actionName);
    },
    onAction(actionName: string, callback: (action: string, state: { active: boolean }) => void) {
      return onAction(actionName, callback);
    },
    getCurrentDevice() {
      return getCurrentDevice();
    },
    detectDeviceClass() {
      return detectDeviceClass();
    },
  };
}
