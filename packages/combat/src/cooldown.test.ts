/**
 * Unit tests for cooldown system.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mockRobloxGlobals, createPlayerId } from "@broblox/testing";
import {
  registerAbility,
  getAbilityConfig,
  getRegisteredAbilities,
  useAbility,
  isOnCooldown,
  getRemainingCooldown,
  getCooldownState,
  getAvailableCharges,
  startCooldown,
  resetCooldown,
  resetAllCooldowns,
  clearPlayerCooldowns,
  onCooldownStarted,
  onCooldownEnded,
  onAbilityRejected,
  resetCooldowns,
} from "./cooldown";
import type { CooldownStartedEvent, CooldownEndedEvent, AbilityRejectedEvent } from "./types";

// Mock Roblox globals with controllable time
let mockTime = 0;
beforeEach(() => {
  mockTime = 0;
  mockRobloxGlobals();
  // Override os.clock to use controllable time
  (globalThis as Record<string, unknown>).os = {
    clock: () => mockTime,
    time: () => Math.floor(mockTime),
  };
  resetCooldowns();
});

function advanceTime(seconds: number): void {
  mockTime += seconds;
}

describe("Ability Configuration", () => {
  it("registers an ability", () => {
    registerAbility({
      abilityId: "fireball",
      durationSeconds: 5,
    });

    expect(getAbilityConfig("fireball")).toBeDefined();
    expect(getAbilityConfig("fireball")?.durationSeconds).toBe(5);
  });

  it("returns undefined for unknown ability", () => {
    expect(getAbilityConfig("unknown")).toBeUndefined();
  });

  it("lists registered abilities", () => {
    registerAbility({ abilityId: "fireball", durationSeconds: 5 });
    registerAbility({ abilityId: "icebolt", durationSeconds: 3 });

    const abilities = getRegisteredAbilities();
    expect(abilities).toContain("fireball");
    expect(abilities).toContain("icebolt");
  });

  it("defaults charges to 1", () => {
    registerAbility({
      abilityId: "fireball",
      durationSeconds: 5,
    });

    expect(getAbilityConfig("fireball")?.charges).toBe(1);
  });

  it("allows custom charge count", () => {
    registerAbility({
      abilityId: "dash",
      durationSeconds: 5,
      charges: 3,
    });

    expect(getAbilityConfig("dash")?.charges).toBe(3);
  });
});

describe("useAbility", () => {
  beforeEach(() => {
    registerAbility({
      abilityId: "fireball",
      durationSeconds: 5,
    });
  });

  it("allows ability use when not on cooldown", () => {
    const result = useAbility(createPlayerId(1), "fireball");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.allowed).toBe(true);
      expect(result.value.remainingCharges).toBe(0);
    }
  });

  it("rejects ability use when on cooldown", () => {
    const playerId = createPlayerId(1);

    // Use the ability
    useAbility(playerId, "fireball");

    // Try to use again immediately
    const result = useAbility(playerId, "fireball");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.allowed).toBe(false);
      expect(result.value.reason).toBe("on_cooldown");
      expect(result.value.cooldownRemaining).toBeGreaterThan(0);
    }
  });

  it("allows ability use after cooldown expires", () => {
    const playerId = createPlayerId(1);

    // Use the ability
    useAbility(playerId, "fireball");

    // Advance time past cooldown
    advanceTime(6);

    // Should be allowed again
    const result = useAbility(playerId, "fireball");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.allowed).toBe(true);
    }
  });

  it("rejects unknown ability", () => {
    const result = useAbility(createPlayerId(1), "unknown");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.allowed).toBe(false);
      expect(result.value.reason).toBe("unknown_ability");
    }
  });

  it("tracks cooldown per player", () => {
    const player1 = createPlayerId(1);
    const player2 = createPlayerId(2);

    // Player 1 uses ability
    useAbility(player1, "fireball");

    // Player 2 should still be able to use it
    const result = useAbility(player2, "fireball");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.allowed).toBe(true);
    }
  });
});

describe("Multi-Charge Abilities", () => {
  beforeEach(() => {
    registerAbility({
      abilityId: "dash",
      durationSeconds: 10,
      charges: 3,
      chargeRecoverySeconds: 5,
    });
  });

  it("starts with max charges", () => {
    expect(getAvailableCharges(createPlayerId(1), "dash")).toBe(3);
  });

  it("allows multiple uses before cooldown", () => {
    const playerId = createPlayerId(1);

    // Use first charge
    const result1 = useAbility(playerId, "dash");
    expect(result1.ok).toBe(true);
    if (result1.ok) expect(result1.value.allowed).toBe(true);
    expect(getAvailableCharges(playerId, "dash")).toBe(2);

    // Use second charge
    const result2 = useAbility(playerId, "dash");
    expect(result2.ok).toBe(true);
    expect(getAvailableCharges(playerId, "dash")).toBe(1);

    // Use third charge
    const result3 = useAbility(playerId, "dash");
    expect(result3.ok).toBe(true);
    expect(getAvailableCharges(playerId, "dash")).toBe(0);

    // Fourth use should fail
    const result4 = useAbility(playerId, "dash");
    expect(result4.ok).toBe(true);
    if (result4.ok) {
      expect(result4.value.allowed).toBe(false);
    }
  });

  it("recovers charges over time", () => {
    const playerId = createPlayerId(1);

    // Use all charges
    useAbility(playerId, "dash");
    useAbility(playerId, "dash");
    useAbility(playerId, "dash");

    expect(getAvailableCharges(playerId, "dash")).toBe(0);

    // Wait for one charge recovery (5 seconds)
    advanceTime(5);
    expect(getAvailableCharges(playerId, "dash")).toBe(1);

    // Wait for another charge recovery
    advanceTime(5);
    expect(getAvailableCharges(playerId, "dash")).toBe(2);

    // Wait for final charge recovery
    advanceTime(5);
    expect(getAvailableCharges(playerId, "dash")).toBe(3);
  });

  it("recovers charges while using ability", () => {
    const playerId = createPlayerId(1);

    // Use one charge
    useAbility(playerId, "dash");
    expect(getAvailableCharges(playerId, "dash")).toBe(2);

    // Wait partial recovery
    advanceTime(3);
    expect(getAvailableCharges(playerId, "dash")).toBe(2); // Still 2

    // Use another charge
    useAbility(playerId, "dash");
    expect(getAvailableCharges(playerId, "dash")).toBe(1);

    // Wait for recovery
    advanceTime(5);
    expect(getAvailableCharges(playerId, "dash")).toBe(2);
  });
});

describe("isOnCooldown", () => {
  beforeEach(() => {
    registerAbility({
      abilityId: "fireball",
      durationSeconds: 5,
    });
  });

  it("returns false when ability is ready", () => {
    expect(isOnCooldown(createPlayerId(1), "fireball")).toBe(false);
  });

  it("returns true when on cooldown", () => {
    const playerId = createPlayerId(1);
    useAbility(playerId, "fireball");

    expect(isOnCooldown(playerId, "fireball")).toBe(true);
  });

  it("returns false after cooldown expires", () => {
    const playerId = createPlayerId(1);
    useAbility(playerId, "fireball");

    advanceTime(6);

    expect(isOnCooldown(playerId, "fireball")).toBe(false);
  });

  it("returns false for unknown ability", () => {
    expect(isOnCooldown(createPlayerId(1), "unknown")).toBe(false);
  });
});

describe("getRemainingCooldown", () => {
  beforeEach(() => {
    registerAbility({
      abilityId: "fireball",
      durationSeconds: 5,
    });
  });

  it("returns 0 when ability is ready", () => {
    expect(getRemainingCooldown(createPlayerId(1), "fireball")).toBe(0);
  });

  it("returns remaining time when on cooldown", () => {
    const playerId = createPlayerId(1);
    useAbility(playerId, "fireball");

    expect(getRemainingCooldown(playerId, "fireball")).toBe(5);

    advanceTime(2);
    expect(getRemainingCooldown(playerId, "fireball")).toBe(3);
  });

  it("returns 0 after cooldown expires", () => {
    const playerId = createPlayerId(1);
    useAbility(playerId, "fireball");

    advanceTime(6);

    expect(getRemainingCooldown(playerId, "fireball")).toBe(0);
  });
});

describe("getCooldownState", () => {
  beforeEach(() => {
    registerAbility({
      abilityId: "fireball",
      durationSeconds: 5,
    });
  });

  it("returns full state", () => {
    const playerId = createPlayerId(1);
    const state = getCooldownState(playerId, "fireball");

    expect(state).toBeDefined();
    expect(state?.abilityId).toBe("fireball");
    expect(state?.charges).toBe(1);
    expect(state?.maxCharges).toBe(1);
  });

  it("returns undefined for unknown ability", () => {
    expect(getCooldownState(createPlayerId(1), "unknown")).toBeUndefined();
  });
});

describe("startCooldown", () => {
  beforeEach(() => {
    registerAbility({
      abilityId: "fireball",
      durationSeconds: 5,
    });
  });

  it("manually starts a cooldown", () => {
    const playerId = createPlayerId(1);

    const result = startCooldown(playerId, "fireball");

    expect(result.ok).toBe(true);
    expect(isOnCooldown(playerId, "fireball")).toBe(true);
  });

  it("allows custom duration override", () => {
    const playerId = createPlayerId(1);

    startCooldown(playerId, "fireball", 10);

    expect(getRemainingCooldown(playerId, "fireball")).toBe(10);
  });

  it("rejects unknown ability", () => {
    const result = startCooldown(createPlayerId(1), "unknown");

    expect(result.ok).toBe(false);
  });
});

describe("resetCooldown", () => {
  beforeEach(() => {
    registerAbility({
      abilityId: "fireball",
      durationSeconds: 5,
    });
  });

  it("resets a single cooldown", () => {
    const playerId = createPlayerId(1);

    useAbility(playerId, "fireball");
    expect(isOnCooldown(playerId, "fireball")).toBe(true);

    resetCooldown(playerId, "fireball");
    expect(isOnCooldown(playerId, "fireball")).toBe(false);
  });

  it("restores max charges", () => {
    registerAbility({
      abilityId: "dash",
      durationSeconds: 5,
      charges: 3,
    });

    const playerId = createPlayerId(1);
    useAbility(playerId, "dash");
    useAbility(playerId, "dash");

    expect(getAvailableCharges(playerId, "dash")).toBe(1);

    resetCooldown(playerId, "dash");

    expect(getAvailableCharges(playerId, "dash")).toBe(3);
  });
});

describe("resetAllCooldowns", () => {
  beforeEach(() => {
    registerAbility({ abilityId: "fireball", durationSeconds: 5 });
    registerAbility({ abilityId: "icebolt", durationSeconds: 3 });
  });

  it("resets all cooldowns for a player", () => {
    const playerId = createPlayerId(1);

    useAbility(playerId, "fireball");
    useAbility(playerId, "icebolt");

    expect(isOnCooldown(playerId, "fireball")).toBe(true);
    expect(isOnCooldown(playerId, "icebolt")).toBe(true);

    resetAllCooldowns(playerId);

    expect(isOnCooldown(playerId, "fireball")).toBe(false);
    expect(isOnCooldown(playerId, "icebolt")).toBe(false);
  });

  it("does not affect other players", () => {
    const player1 = createPlayerId(1);
    const player2 = createPlayerId(2);

    useAbility(player1, "fireball");
    useAbility(player2, "fireball");

    resetAllCooldowns(player1);

    expect(isOnCooldown(player1, "fireball")).toBe(false);
    expect(isOnCooldown(player2, "fireball")).toBe(true);
  });
});

describe("clearPlayerCooldowns", () => {
  beforeEach(() => {
    registerAbility({ abilityId: "fireball", durationSeconds: 5 });
  });

  it("removes all state for a player", () => {
    const playerId = createPlayerId(1);

    useAbility(playerId, "fireball");

    clearPlayerCooldowns(playerId);

    // State should be recreated fresh
    expect(isOnCooldown(playerId, "fireball")).toBe(false);
  });
});

describe("Event Listeners", () => {
  beforeEach(() => {
    registerAbility({
      abilityId: "fireball",
      durationSeconds: 5,
    });
  });

  it("emits cooldown started event on use", () => {
    const events: CooldownStartedEvent[] = [];
    onCooldownStarted((e) => events.push(e));

    useAbility(createPlayerId(1), "fireball");

    expect(events).toHaveLength(1);
    expect(events[0].abilityId).toBe("fireball");
    expect(events[0].durationSeconds).toBe(5);
  });

  it("emits cooldown ended event on reset", () => {
    const events: CooldownEndedEvent[] = [];
    onCooldownEnded((e) => events.push(e));

    const playerId = createPlayerId(1);
    useAbility(playerId, "fireball");
    resetCooldown(playerId, "fireball");

    expect(events).toHaveLength(1);
    expect(events[0].abilityId).toBe("fireball");
  });

  it("emits ability rejected event", () => {
    const events: AbilityRejectedEvent[] = [];
    onAbilityRejected((e) => events.push(e));

    const playerId = createPlayerId(1);
    useAbility(playerId, "fireball");
    useAbility(playerId, "fireball"); // Should be rejected

    expect(events).toHaveLength(1);
    expect(events[0].reason).toBe("on_cooldown");
  });

  it("emits rejected event for unknown ability", () => {
    const events: AbilityRejectedEvent[] = [];
    onAbilityRejected((e) => events.push(e));

    useAbility(createPlayerId(1), "unknown");

    expect(events).toHaveLength(1);
    expect(events[0].reason).toBe("unknown_ability");
  });

  it("allows unsubscribing", () => {
    const events: CooldownStartedEvent[] = [];
    const unsubscribe = onCooldownStarted((e) => events.push(e));

    useAbility(createPlayerId(1), "fireball");
    expect(events).toHaveLength(1);

    unsubscribe();

    useAbility(createPlayerId(2), "fireball");
    expect(events).toHaveLength(1); // Still 1
  });

  it("unsubscribe is idempotent", () => {
    const events: CooldownStartedEvent[] = [];
    const unsubscribe = onCooldownStarted((e) => events.push(e));

    unsubscribe();
    unsubscribe(); // calling again should not throw

    useAbility(createPlayerId(1), "fireball");
    expect(events).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Edge-case tests for branch coverage
// ---------------------------------------------------------------------------

describe("getAvailableCharges", () => {
  it("returns 0 for unknown ability", () => {
    expect(getAvailableCharges(createPlayerId(1), "nonexistent")).toBe(0);
  });

  it("returns current charges for known ability", () => {
    registerAbility({ abilityId: "fireball", durationSeconds: 5 });
    expect(getAvailableCharges(createPlayerId(1), "fireball")).toBe(1);
  });

  it("returns 0 after ability used and on cooldown", () => {
    registerAbility({ abilityId: "fireball", durationSeconds: 5 });
    const pid = createPlayerId(1);
    useAbility(pid, "fireball");
    expect(getAvailableCharges(pid, "fireball")).toBe(0);
  });

  it("returns restored charges after recovery time", () => {
    registerAbility({ abilityId: "fireball", durationSeconds: 5 });
    const pid = createPlayerId(1);
    useAbility(pid, "fireball");
    advanceTime(6);
    expect(getAvailableCharges(pid, "fireball")).toBe(1);
  });
});

describe("resetCooldown edge cases", () => {
  it("returns NotFound for unknown ability", () => {
    const result = resetCooldown(createPlayerId(1), "unknown");
    expect(result.ok).toBe(false);
  });

  it("returns ok when player has no state", () => {
    registerAbility({ abilityId: "fireball", durationSeconds: 5 });
    const result = resetCooldown(createPlayerId(99), "fireball");
    expect(result.ok).toBe(true);
  });

  it("returns ok when ability has no state for player", () => {
    registerAbility({ abilityId: "fireball", durationSeconds: 5 });
    registerAbility({ abilityId: "icebolt", durationSeconds: 3 });
    const pid = createPlayerId(1);
    useAbility(pid, "fireball"); // creates state for fireball only
    const result = resetCooldown(pid, "icebolt");
    expect(result.ok).toBe(true);
  });
});

describe("resetAllCooldowns edge cases", () => {
  it("is no-op for unknown player", () => {
    registerAbility({ abilityId: "fireball", durationSeconds: 5 });
    // Should not throw
    resetAllCooldowns(createPlayerId(999));
  });
});

describe("multi-charge recovery", () => {
  it("uses durationSeconds as recovery fallback when chargeRecoverySeconds is omitted", () => {
    registerAbility({ abilityId: "triple", durationSeconds: 2, charges: 3 });
    const pid = createPlayerId(1);
    useAbility(pid, "triple"); // 3→2
    useAbility(pid, "triple"); // 2→1
    useAbility(pid, "triple"); // 1→0

    // After 2s (durationSeconds) one charge should recover
    advanceTime(2);
    expect(getAvailableCharges(pid, "triple")).toBe(1);

    // After 2 more, another charge
    advanceTime(2);
    expect(getAvailableCharges(pid, "triple")).toBe(2);
  });

  it("getRemainingCooldown returns time for partial charge recovery", () => {
    registerAbility({ abilityId: "dual", durationSeconds: 4, charges: 2 });
    const pid = createPlayerId(1);
    useAbility(pid, "dual");
    useAbility(pid, "dual");
    advanceTime(1);
    const remaining = getRemainingCooldown(pid, "dual");
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(3);
  });
});
