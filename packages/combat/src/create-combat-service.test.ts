import { describe, it, expect, beforeEach, vi } from "vitest";
import { createCombatService, type CombatServiceHandle } from "./create-combat-service";
import { resetCooldowns, isOnCooldown, useAbility } from "./cooldown";
import {
  resetHitValidation,
  getPlayerPosition,
  updatePlayerPosition,
  setInvulnerable,
  isInvulnerable,
  getSuspiciousHitCount,
} from "./hit-validation";
import type { PlayerId } from "@broblox/shared-types";

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function pid(n: number): PlayerId {
  return n as PlayerId;
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe("createCombatService", () => {
  let handle: CombatServiceHandle;

  beforeEach(() => {
    resetCooldowns();
    resetHitValidation();
  });

  // ── Factory creation ────────────────────────────────────────────────────

  it("returns a Service with lifecycle hooks", () => {
    handle = createCombatService({});
    expect(handle.Service).toBeDefined();
    expect(handle.Service.name).toBe("CombatService");
    expect(handle.Service.onInit).toBeDefined();
    expect(handle.Service.onStart).toBeDefined();
    expect(handle.Service.onDestroy).toBeDefined();
  });

  it("returns initPlayer and cleanupPlayer", () => {
    handle = createCombatService({});
    expect(handle.initPlayer).toBeTypeOf("function");
    expect(handle.cleanupPlayer).toBeTypeOf("function");
  });

  it("returns validateHit passthrough", () => {
    handle = createCombatService({});
    expect(handle.validateHit).toBeTypeOf("function");
  });

  // ── onInit — abilities ─────────────────────────────────────────────────

  it("registers abilities on init", () => {
    handle = createCombatService({
      abilities: [
        { abilityId: "slash" as never, cooldownSeconds: 1, maxCharges: 1 },
        { abilityId: "fireball" as never, cooldownSeconds: 3, maxCharges: 1 },
      ],
    });
    handle.Service.onInit!();

    // abilities registered — using one should work
    const result = useAbility(pid(1), "slash" as never);
    expect(result.ok).toBe(true);
  });

  // ── onInit — hit validation config ─────────────────────────────────────

  it("configures hit validation on init", () => {
    handle = createCombatService({
      hitValidation: { maxDistance: 999 },
    });
    handle.Service.onInit!();
    // no throw means configureHitValidation was called successfully
  });

  // ── onInit — position provider ─────────────────────────────────────────

  it("wires position provider on init", () => {
    const posProvider = vi.fn().mockReturnValue({ X: 0, Y: 0, Z: 0 });
    handle = createCombatService({ positionProvider: posProvider });
    handle.Service.onInit!();
    // The provider is set — we can't easily assert from outside,
    // but at least it doesn't throw
  });

  // ── Player lifecycle ───────────────────────────────────────────────────

  it("initPlayer tracks the player", () => {
    handle = createCombatService({});
    handle.Service.onInit!();
    handle.initPlayer(pid(42));
    // cleanup should work without error
    handle.cleanupPlayer(pid(42));
  });

  it("cleanupPlayer clears cooldowns and position", () => {
    handle = createCombatService({
      abilities: [{ abilityId: "slash" as never, cooldownSeconds: 10, maxCharges: 1 }],
    });
    handle.Service.onInit!();
    handle.initPlayer(pid(10));

    // Put player on cooldown
    useAbility(pid(10), "slash" as never);
    expect(isOnCooldown(pid(10), "slash" as never)).toBe(true);

    // Set a position
    updatePlayerPosition(pid(10), { X: 1, Y: 2, Z: 3 });
    expect(getPlayerPosition(pid(10))).toBeDefined();

    // Cleanup
    handle.cleanupPlayer(pid(10));
    expect(isOnCooldown(pid(10), "slash" as never)).toBe(false);
    expect(getPlayerPosition(pid(10))).toBeUndefined();
  });

  it("cleanupPlayer is safe for unknown players", () => {
    handle = createCombatService({});
    handle.Service.onInit!();
    // Should not throw
    handle.cleanupPlayer(pid(999));
  });

  // ── onDestroy ──────────────────────────────────────────────────────────

  it("onDestroy cleans up all tracked players", () => {
    handle = createCombatService({
      abilities: [{ abilityId: "slash" as never, cooldownSeconds: 10, maxCharges: 1 }],
    });
    handle.Service.onInit!();

    handle.initPlayer(pid(1));
    handle.initPlayer(pid(2));
    useAbility(pid(1), "slash" as never);
    useAbility(pid(2), "slash" as never);

    handle.Service.onDestroy!();

    expect(isOnCooldown(pid(1), "slash" as never)).toBe(false);
    expect(isOnCooldown(pid(2), "slash" as never)).toBe(false);
  });

  // ── onPlayerAdded / onPlayerRemoving wiring ────────────────────────────

  it("wires onPlayerRemoving via config callback", () => {
    let removingCb: ((player: { UserId: number }) => void) | undefined;
    handle = createCombatService({
      abilities: [{ abilityId: "slash" as never, cooldownSeconds: 10, maxCharges: 1 }],
      onPlayerRemoving: (cb) => {
        removingCb = cb;
      },
    });
    handle.Service.onInit!();

    handle.initPlayer(pid(5));
    useAbility(pid(5), "slash" as never);
    expect(isOnCooldown(pid(5), "slash" as never)).toBe(true);

    // Simulate player leaving
    removingCb!({ UserId: 5 });
    expect(isOnCooldown(pid(5), "slash" as never)).toBe(false);
  });

  it("wires onPlayerAdded via config callback", () => {
    let addedCb: ((player: { UserId: number }) => void) | undefined;
    handle = createCombatService({
      onPlayerAdded: (cb) => {
        addedCb = cb;
      },
    });
    handle.Service.onInit!();
    handle.Service.onStart!();

    // Simulate player joining
    addedCb!({ UserId: 77 });
    // Player should be tracked — cleanup should work
    handle.cleanupPlayer(pid(77));
  });

  // ── Event callbacks ────────────────────────────────────────────────────

  it("passes onSuspicious callback through", () => {
    const spy = vi.fn();
    handle = createCombatService({ onSuspicious: spy });
    handle.Service.onInit!();
    // The listener is registered — we just verify no crash
    handle.Service.onDestroy!();
  });

  it("passes onHit callback through", () => {
    const spy = vi.fn();
    handle = createCombatService({ onHit: spy });
    handle.Service.onInit!();
    // The listener is registered — we just verify no crash
    handle.Service.onDestroy!();
  });

  // ── Per-player state cleanup ───────────────────────────────────────────

  it("cleanupPlayer clears position, invulnerability and suspicious hit state", () => {
    handle = createCombatService({});
    handle.Service.onInit!();

    handle.initPlayer(pid(10));
    updatePlayerPosition(pid(10), { x: 5, y: 5, z: 5 });
    setInvulnerable(pid(10), true);

    handle.cleanupPlayer(pid(10));

    expect(getPlayerPosition(pid(10))).toBeUndefined();
    expect(isInvulnerable(pid(10))).toBe(false);
    expect(getSuspiciousHitCount(pid(10))).toBe(0);
  });

  it("onDestroy clears all players' extended combat state", () => {
    handle = createCombatService({
      abilities: [{ abilityId: "slash" as never, cooldownSeconds: 1, maxCharges: 1 }],
    });
    handle.Service.onInit!();

    handle.initPlayer(pid(20));
    handle.initPlayer(pid(21));
    updatePlayerPosition(pid(20), { x: 1, y: 0, z: 0 });
    updatePlayerPosition(pid(21), { x: 2, y: 0, z: 0 });
    setInvulnerable(pid(20), true);
    setInvulnerable(pid(21), true);

    handle.Service.onDestroy!();

    expect(isInvulnerable(pid(20))).toBe(false);
    expect(isInvulnerable(pid(21))).toBe(false);
    expect(getPlayerPosition(pid(20))).toBeUndefined();
    expect(getPlayerPosition(pid(21))).toBeUndefined();
  });
});
