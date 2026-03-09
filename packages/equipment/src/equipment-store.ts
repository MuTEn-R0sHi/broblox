/**
 * @broblox/equipment — Equipment Store
 *
 * Per-player equipment state: owned gear, equipped gear, stat computation.
 * This store does NOT own persistence — the game's DataService is responsible
 * for loading/saving the EquipmentData.
 */

import type {
  EquipmentData,
  EquipmentResult,
  GearEquipEvent,
  GearEquipCallback,
  StatModifier,
} from "./types";
import type { GearRegistry } from "./gear-registry";

export class EquipmentStore {
  private readonly playerId: number;
  private readonly registry: GearRegistry;
  private readonly listeners: GearEquipCallback[] = [];

  /** Slot name → gear ID */
  private equipped = new Map<string, string>();
  /** Set of owned gear IDs */
  private ownedGear = new Set<string>();
  private dirty = false;

  constructor(playerId: number, registry: GearRegistry) {
    this.playerId = playerId;
    this.registry = registry;
  }

  // ── Serialization ────────────────────────────────────────────────────

  /** Load from a previously-serialized EquipmentData. */
  loadFrom(data: EquipmentData): void {
    this.equipped.clear();
    this.ownedGear.clear();

    for (const gearId of data.ownedGear) {
      if (this.registry.has(gearId)) {
        this.ownedGear.add(gearId);
      }
    }

    for (const [slot, gearId] of Object.entries(data.equipped)) {
      if (this.registry.has(gearId) && this.ownedGear.has(gearId)) {
        this.equipped.set(slot, gearId);
      }
    }

    this.dirty = false;
  }

  /** Serialize to a plain data object for persistence. */
  serialize(): EquipmentData {
    const equipped: Record<string, string> = {};
    this.equipped.forEach((gearId, slot) => {
      equipped[slot] = gearId;
    });

    const ownedGear: string[] = [];
    this.ownedGear.forEach((id) => ownedGear.push(id));

    return { equipped, ownedGear };
  }

  // ── Ownership ────────────────────────────────────────────────────────

  /** Grant a gear item to the player. */
  grantGear(gearId: string): EquipmentResult {
    if (!this.registry.has(gearId)) {
      return { ok: false, status: "gear_not_found" };
    }
    if (this.ownedGear.has(gearId)) {
      return { ok: false, status: "already_owned" };
    }

    this.ownedGear.add(gearId);
    this.dirty = true;
    return { ok: true, status: "success" };
  }

  /** Check if the player owns a specific gear. */
  ownsGear(gearId: string): boolean {
    return this.ownedGear.has(gearId);
  }

  /** Get all owned gear IDs. */
  getOwnedGear(): string[] {
    const result: string[] = [];
    this.ownedGear.forEach((id) => result.push(id));
    return result;
  }

  // ── Equip / Unequip ─────────────────────────────────────────────────

  /** Equip a gear item into its designated slot. */
  equip(gearId: string, playerLevel?: number): EquipmentResult {
    const def = this.registry.get(gearId);
    if (!def) {
      return { ok: false, status: "gear_not_found" };
    }
    if (!this.ownedGear.has(gearId)) {
      return { ok: false, status: "not_owned" };
    }

    // Check level requirement
    if (def.levelRequirement !== undefined && def.levelRequirement > 0) {
      if (playerLevel !== undefined && playerLevel < def.levelRequirement) {
        return { ok: false, status: "level_too_low" };
      }
    }

    // Check if already equipped in the correct slot
    const currentInSlot = this.equipped.get(def.slot);
    if (currentInSlot === gearId) {
      return { ok: false, status: "already_equipped" };
    }

    this.equipped.set(def.slot, gearId);
    this.dirty = true;
    this.fireEvent(gearId, def.slot, true);
    return { ok: true, status: "success" };
  }

  /** Unequip the gear in a specific slot. */
  unequip(slot: string): EquipmentResult {
    const gearId = this.equipped.get(slot);
    if (!gearId) {
      return { ok: false, status: "slot_empty" };
    }

    this.equipped.delete(slot);
    this.dirty = true;
    this.fireEvent(gearId, slot, false);
    return { ok: true, status: "success" };
  }

  /** Get the gear ID equipped in a given slot. */
  getEquipped(slot: string): string | undefined {
    return this.equipped.get(slot);
  }

  /** Get all equipped slots as a Record. */
  getAllEquipped(): Record<string, string> {
    const result: Record<string, string> = {};
    this.equipped.forEach((gearId, slot) => {
      result[slot] = gearId;
    });
    return result;
  }

  // ── Stat Computation ─────────────────────────────────────────────────

  /**
   * Compute the total stat bonuses from all currently-equipped gear.
   * Returns a map of stat name → total flat bonus.
   */
  computeBonuses(): Map<string, number> {
    const bonuses = new Map<string, number>();

    this.equipped.forEach((gearId) => {
      const def = this.registry.get(gearId);
      if (!def) return;

      for (const mod of def.modifiers) {
        const current = bonuses.get(mod.stat) ?? 0;
        bonuses.set(mod.stat, current + mod.flat);
      }
    });

    return bonuses;
  }

  /**
   * Get the flat bonus for a specific stat from all equipped gear.
   */
  getStatBonus(stat: string): number {
    let total = 0;

    this.equipped.forEach((gearId) => {
      const def = this.registry.get(gearId);
      if (!def) return;

      for (const mod of def.modifiers) {
        if (mod.stat === stat) {
          total += mod.flat;
        }
      }
    });

    return total;
  }

  /**
   * Get all stat modifiers from a specific gear item (for tooltip display).
   */
  getGearModifiers(gearId: string): readonly StatModifier[] {
    const def = this.registry.get(gearId);
    return def?.modifiers ?? [];
  }

  // ── Event Listeners ──────────────────────────────────────────────────

  /** Register a callback for equip/unequip events. */
  onEquipChanged(callback: GearEquipCallback): void {
    this.listeners.push(callback);
  }

  // ── Dirty tracking ──────────────────────────────────────────────────

  isDirty(): boolean {
    return this.dirty;
  }

  clearDirty(): void {
    this.dirty = false;
  }

  // ── Private ──────────────────────────────────────────────────────────

  private fireEvent(gearId: string, slot: string, equipped: boolean): void {
    const event: GearEquipEvent = {
      playerId: this.playerId,
      gearId,
      slot,
      equipped,
      timestamp: os.clock(),
    };
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
