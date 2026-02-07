import { describe, it, expect, beforeEach } from "vitest";
import {
  registerAction,
  registerActions,
  getAction,
  getAllActions,
  getActionsByCategory,
  getActionState,
  isActionActive,
  isActionJustPressed,
  getActionValue,
  updateActionState,
  onAction,
  CommonActions,
  registerCommonActions,
} from "./actions";
import type { InputAction, ActionState } from "./types";
import {
  key,
  mouse,
  button,
  axis,
  touch,
  bind,
  addDefaultBinding,
  setCustomBinding,
  removeCustomBinding,
  getBindingsForAction,
  getBindingDisplayName,
  KeyboardDefaults,
  GamepadDefaults,
} from "./bindings";

// ============================================================================
// Actions
// ============================================================================

describe("actions", () => {
  beforeEach(() => {
    // Reset module state by re-registering
    // The maps are module-level so we can only test additively
  });

  const testAction: InputAction = {
    name: "test_action",
    displayName: "Test Action",
    category: "test",
  };

  describe("registerAction / getAction", () => {
    it("registers and retrieves an action", () => {
      registerAction(testAction);
      const result = getAction("test_action");
      expect(result).toBeDefined();
      expect(result!.name).toBe("test_action");
      expect(result!.displayName).toBe("Test Action");
    });

    it("returns undefined for unregistered action", () => {
      expect(getAction("nonexistent_action")).toBeUndefined();
    });
  });

  describe("registerActions", () => {
    it("registers multiple actions at once", () => {
      const actions: InputAction[] = [
        { name: "batch_a", category: "batch" },
        { name: "batch_b", category: "batch" },
      ];
      registerActions(actions);
      expect(getAction("batch_a")).toBeDefined();
      expect(getAction("batch_b")).toBeDefined();
    });
  });

  describe("getAllActions", () => {
    it("returns all registered actions as an array", () => {
      registerAction({ name: "all_test", category: "all" });
      const all = getAllActions();
      expect(Array.isArray(all)).toBe(true);
      expect(all.some((a) => a.name === "all_test")).toBe(true);
    });
  });

  describe("getActionsByCategory", () => {
    it("filters actions by category", () => {
      registerAction({ name: "cat_x", category: "x_cat" });
      registerAction({ name: "cat_y", category: "y_cat" });
      const xActions = getActionsByCategory("x_cat");
      expect(xActions.some((a) => a.name === "cat_x")).toBe(true);
      expect(xActions.some((a) => a.name === "cat_y")).toBe(false);
    });
  });

  describe("action state", () => {
    it("initialises state on registration", () => {
      registerAction({ name: "state_test", category: "test" });
      const state = getActionState("state_test");
      expect(state).toBeDefined();
      expect(state!.active).toBe(false);
      expect(state!.value).toBe(0);
      expect(state!.delta).toBe(0);
      expect(state!.lastTriggered).toBe(0);
    });

    it("isActionActive returns false for inactive action", () => {
      registerAction({ name: "active_test", category: "test" });
      expect(isActionActive("active_test")).toBe(false);
    });

    it("isActionActive returns false for unregistered action", () => {
      expect(isActionActive("completely_unknown")).toBe(false);
    });

    it("getActionValue returns 0 for unregistered action", () => {
      expect(getActionValue("unknown_val")).toBe(0);
    });
  });

  describe("updateActionState", () => {
    it("updates state to active", () => {
      registerAction({ name: "update_test", category: "test" });
      updateActionState("update_test", true);
      expect(isActionActive("update_test")).toBe(true);
      expect(getActionValue("update_test")).toBe(1);
    });

    it("updates state to inactive", () => {
      registerAction({ name: "deactivate_test", category: "test" });
      updateActionState("deactivate_test", true);
      updateActionState("deactivate_test", false);
      expect(isActionActive("deactivate_test")).toBe(false);
      expect(getActionValue("deactivate_test")).toBe(0);
    });

    it("computes delta from previous value", () => {
      registerAction({ name: "delta_test", category: "test" });
      updateActionState("delta_test", true, 0.5);
      const state1 = getActionState("delta_test")!;
      expect(state1.delta).toBe(0.5); // 0.5 - 0

      updateActionState("delta_test", true, 0.8);
      const state2 = getActionState("delta_test")!;
      expect(state2.delta).toBeCloseTo(0.3);
    });

    it("sets lastTriggered on activation", () => {
      registerAction({ name: "trigger_test", category: "test" });
      updateActionState("trigger_test", true);
      const state = getActionState("trigger_test")!;
      expect(state.lastTriggered).toBeGreaterThan(0);
    });

    it("creates state for unregistered action", () => {
      updateActionState("auto_create", true, 0.7);
      const state = getActionState("auto_create");
      expect(state).toBeDefined();
      expect(state!.active).toBe(true);
      expect(state!.value).toBe(0.7);
    });
  });

  describe("isActionJustPressed", () => {
    it("returns true immediately after activation", () => {
      registerAction({ name: "just_pressed", category: "test" });
      updateActionState("just_pressed", true);
      expect(isActionJustPressed("just_pressed")).toBe(true);
    });

    it("returns false for inactive action", () => {
      registerAction({ name: "not_pressed", category: "test" });
      expect(isActionJustPressed("not_pressed")).toBe(false);
    });

    it("returns false for unregistered action", () => {
      expect(isActionJustPressed("nope")).toBe(false);
    });
  });

  describe("onAction", () => {
    it("fires callback on state update", () => {
      registerAction({ name: "cb_test", category: "test" });
      const fired: Array<{ action: string; state: ActionState }> = [];
      onAction("cb_test", (action, state) => {
        fired.push({ action, state });
      });
      updateActionState("cb_test", true);
      expect(fired).toHaveLength(1);
      expect(fired[0].action).toBe("cb_test");
      expect(fired[0].state.active).toBe(true);
    });

    it("returns unsubscribe function", () => {
      registerAction({ name: "unsub_test", category: "test" });
      let count = 0;
      const unsub = onAction("unsub_test", () => {
        count++;
      });
      updateActionState("unsub_test", true);
      expect(count).toBe(1);

      unsub();
      updateActionState("unsub_test", false);
      expect(count).toBe(1);
    });
  });

  describe("CommonActions", () => {
    it("defines standard action constants", () => {
      expect(CommonActions.Jump.name).toBe("jump");
      expect(CommonActions.Jump.category).toBe("movement");
      expect(CommonActions.PrimaryAction.name).toBe("primary_action");
      expect(CommonActions.PrimaryAction.category).toBe("combat");
      expect(CommonActions.Interact.name).toBe("interact");
      expect(CommonActions.Interact.category).toBe("ui");
    });
  });

  describe("registerCommonActions", () => {
    it("registers all CommonActions", () => {
      registerCommonActions();
      expect(getAction("jump")).toBeDefined();
      expect(getAction("sprint")).toBeDefined();
      expect(getAction("primary_action")).toBeDefined();
      expect(getAction("interact")).toBeDefined();
    });
  });
});

// ============================================================================
// Bindings — input source helpers
// ============================================================================

describe("bindings", () => {
  describe("input source helpers", () => {
    it("key() creates a keyboard source", () => {
      const src = key("W");
      expect(src).toEqual({ type: "key", key: "W" });
    });

    it("mouse() creates a mouse source", () => {
      const src = mouse("MouseButton1");
      expect(src).toEqual({ type: "mouse", button: "MouseButton1" });
    });

    it("button() creates a gamepad source", () => {
      const src = button("ButtonA");
      expect(src).toEqual({ type: "gamepad", button: "ButtonA" });
    });

    it("axis() creates an axis source", () => {
      const src = axis("Thumbstick1", "positive");
      expect(src).toEqual({ type: "axis", axis: "Thumbstick1", direction: "positive" });
    });

    it("axis() works without direction", () => {
      const src = axis("Thumbstick2");
      expect(src).toEqual({ type: "axis", axis: "Thumbstick2", direction: undefined });
    });

    it("touch() creates a touch source", () => {
      const src = touch("Tap");
      expect(src).toEqual({ type: "touch", gesture: "Tap" });
    });
  });

  describe("bind()", () => {
    it("creates a binding with primary source", () => {
      const binding = bind("jump", key("Space"));
      expect(binding.action).toBe("jump");
      expect(binding.primary).toEqual({ type: "key", key: "Space" });
      expect(binding.secondary).toBeUndefined();
    });

    it("creates a binding with primary and secondary", () => {
      const binding = bind("jump", key("Space"), button("ButtonA"));
      expect(binding.secondary).toEqual({ type: "gamepad", button: "ButtonA" });
    });
  });

  describe("addDefaultBinding / getBindingsForAction", () => {
    it("adds and retrieves a binding", () => {
      addDefaultBinding(bind("test_bind_action", key("F")));
      const bindings = getBindingsForAction("test_bind_action");
      expect(bindings).toHaveLength(1);
      expect(bindings[0].primary).toEqual({ type: "key", key: "F" });
    });

    it("returns empty array for unknown action", () => {
      expect(getBindingsForAction("totally_unknown")).toEqual([]);
    });
  });

  describe("setCustomBinding / removeCustomBinding", () => {
    it("custom binding overrides defaults", () => {
      addDefaultBinding(bind("custom_test", key("Q")));
      setCustomBinding(bind("custom_test", key("E")));
      const bindings = getBindingsForAction("custom_test");
      expect(bindings).toHaveLength(1);
      expect(bindings[0].primary).toEqual({ type: "key", key: "E" });
    });

    it("removeCustomBinding reverts to default", () => {
      addDefaultBinding(bind("remove_test", key("Q")));
      setCustomBinding(bind("remove_test", key("E")));
      removeCustomBinding("remove_test");
      const bindings = getBindingsForAction("remove_test");
      expect(bindings.some((b) => b.primary.type === "key" && "key" in b.primary)).toBe(true);
    });
  });

  describe("getBindingDisplayName", () => {
    it("returns key name for keyboard bindings", () => {
      const b = bind("test_display", key("W"));
      expect(getBindingDisplayName(b)).toBe("W");
    });

    it("returns LMB/RMB/MMB for mouse buttons", () => {
      expect(getBindingDisplayName(bind("m1", mouse("MouseButton1")))).toBe("LMB");
      expect(getBindingDisplayName(bind("m2", mouse("MouseButton2")))).toBe("RMB");
      expect(getBindingDisplayName(bind("m3", mouse("MouseButton3")))).toBe("MMB");
    });

    it("returns short name for gamepad buttons", () => {
      expect(getBindingDisplayName(bind("g_a", button("ButtonA")))).toBe("A");
      expect(getBindingDisplayName(bind("g_b", button("ButtonB")))).toBe("B");
      expect(getBindingDisplayName(bind("g_rb", button("ButtonR1")))).toBe("RB");
      expect(getBindingDisplayName(bind("start", button("ButtonStart")))).toBe("Start");
    });

    it("returns axis name for axis bindings", () => {
      expect(getBindingDisplayName(bind("look", axis("Thumbstick2")))).toBe("Thumbstick2");
    });

    it("returns gesture name for touch bindings", () => {
      expect(getBindingDisplayName(bind("tap", touch("Tap")))).toBe("Tap");
    });
  });

  describe("default binding arrays", () => {
    it("KeyboardDefaults has entries", () => {
      expect(KeyboardDefaults.length).toBeGreaterThan(0);
      expect(KeyboardDefaults.some((b) => b.action === "jump")).toBe(true);
    });

    it("GamepadDefaults has entries", () => {
      expect(GamepadDefaults.length).toBeGreaterThan(0);
      expect(GamepadDefaults.some((b) => b.action === "jump")).toBe(true);
    });
  });
});
