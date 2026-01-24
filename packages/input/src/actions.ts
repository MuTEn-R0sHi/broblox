/**
 * Input Actions
 *
 * Action registration and state management.
 */

import { InputAction, ActionState, ActionCallback } from "./types";

// ============================================================================
// Action Registry
// ============================================================================

const registeredActions = new Map<string, InputAction>();
const actionStates = new Map<string, ActionState>();
const actionCallbacks = new Map<string, ActionCallback[]>();

/**
 * Register an action.
 */
export function registerAction(action: InputAction): void {
  registeredActions.set(action.name, action);
  actionStates.set(action.name, {
    active: false,
    lastTriggered: 0,
    value: 0,
    delta: 0,
  });
}

/**
 * Register multiple actions at once.
 */
export function registerActions(actions: InputAction[]): void {
  for (const action of actions) {
    registerAction(action);
  }
}

/**
 * Get a registered action.
 */
export function getAction(name: string): InputAction | undefined {
  return registeredActions.get(name);
}

/**
 * Get all registered actions.
 */
export function getAllActions(): InputAction[] {
  const actions: InputAction[] = [];
  for (const [, action] of registeredActions) {
    actions.push(action);
  }
  return actions;
}

/**
 * Get actions by category.
 */
export function getActionsByCategory(category: string): InputAction[] {
  const actions: InputAction[] = [];
  for (const [, action] of registeredActions) {
    if (action.category === category) {
      actions.push(action);
    }
  }
  return actions;
}

// ============================================================================
// Action State
// ============================================================================

/**
 * Get the current state of an action.
 */
export function getActionState(name: string): ActionState | undefined {
  return actionStates.get(name);
}

/**
 * Check if an action is currently active (pressed/held).
 */
export function isActionActive(name: string): boolean {
  const state = actionStates.get(name);
  return state?.active ?? false;
}

/**
 * Check if an action was just pressed this frame.
 */
export function isActionJustPressed(name: string): boolean {
  const state = actionStates.get(name);
  if (!state) return false;
  // Consider "just pressed" if triggered within last 0.1 seconds
  return state.active && os.clock() - state.lastTriggered < 0.1;
}

/**
 * Get the analog value of an action (0-1).
 */
export function getActionValue(name: string): number {
  const state = actionStates.get(name);
  return state?.value ?? 0;
}

/**
 * Internal: Update action state.
 */
export function updateActionState(name: string, active: boolean, value = active ? 1 : 0): void {
  let state = actionStates.get(name);
  if (!state) {
    state = { active: false, lastTriggered: 0, value: 0, delta: 0 };
    actionStates.set(name, state);
  }

  const wasActive = state.active;
  const oldValue = state.value;

  state.active = active;
  state.value = value;
  state.delta = value - oldValue;

  if (active && !wasActive) {
    state.lastTriggered = os.clock();
  }

  // Notify callbacks
  const callbacks = actionCallbacks.get(name);
  if (callbacks) {
    for (const callback of callbacks) {
      pcall(() => callback(name, state));
    }
  }
}

// ============================================================================
// Action Callbacks
// ============================================================================

/**
 * Subscribe to action changes.
 */
export function onAction(name: string, callback: ActionCallback): () => void {
  let callbacks = actionCallbacks.get(name);
  if (!callbacks) {
    callbacks = [];
    actionCallbacks.set(name, callbacks);
  }
  callbacks.push(callback);

  return () => {
    const cbs = actionCallbacks.get(name);
    if (cbs) {
      const index = cbs.indexOf(callback);
      if (index >= 0) {
        cbs.remove(index);
      }
    }
  };
}

/**
 * Subscribe to any action change.
 */
export function onAnyAction(callback: ActionCallback): () => void {
  const unsubscribes: Array<() => void> = [];

  for (const [name] of registeredActions) {
    unsubscribes.push(onAction(name, callback));
  }

  return () => {
    for (const unsub of unsubscribes) {
      unsub();
    }
  };
}

// ============================================================================
// Common Actions
// ============================================================================

/** Pre-defined common game actions */
export const CommonActions = {
  // Movement
  MoveForward: { name: "move_forward", displayName: "Move Forward", category: "movement" },
  MoveBackward: { name: "move_backward", displayName: "Move Backward", category: "movement" },
  MoveLeft: { name: "move_left", displayName: "Move Left", category: "movement" },
  MoveRight: { name: "move_right", displayName: "Move Right", category: "movement" },
  Jump: { name: "jump", displayName: "Jump", category: "movement" },
  Sprint: { name: "sprint", displayName: "Sprint", category: "movement" },
  Crouch: { name: "crouch", displayName: "Crouch", category: "movement" },

  // Combat
  PrimaryAction: { name: "primary_action", displayName: "Primary Action", category: "combat" },
  SecondaryAction: {
    name: "secondary_action",
    displayName: "Secondary Action",
    category: "combat",
  },
  Reload: { name: "reload", displayName: "Reload", category: "combat" },
  Aim: { name: "aim", displayName: "Aim", category: "combat" },

  // UI
  Interact: { name: "interact", displayName: "Interact", category: "ui" },
  Inventory: { name: "inventory", displayName: "Inventory", category: "ui" },
  Menu: { name: "menu", displayName: "Menu", category: "ui" },
  Cancel: { name: "cancel", displayName: "Cancel", category: "ui" },
} as const;

/**
 * Register all common actions.
 */
export function registerCommonActions(): void {
  for (const [, action] of pairs(CommonActions)) {
    registerAction(action as InputAction);
  }
}
