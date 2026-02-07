/**
 * @rbx/cosmetics — Cosmetic Store
 *
 * Manages cosmetic ownership, equipping, and persistence per player.
 */

import type {
  CosmeticEquipCallback,
  CosmeticPlayerData,
  CosmeticResult,
  CosmeticsConfig,
  EquipSlot,
} from "./types";
import { CATEGORY_SLOTS, DEFAULT_COSMETICS_CONFIG } from "./types";
import { CosmeticRegistry } from "./cosmetic-registry";

export class CosmeticStore {
  private playerId: number;
  private registry: CosmeticRegistry;
  private config: CosmeticsConfig;
  private data: CosmeticPlayerData;
  private dirty = false;
  private dataStore:
    | { GetAsync: (key: string) => unknown; SetAsync: (key: string, value: unknown) => void }
    | undefined;

  private equipCallbacks: CosmeticEquipCallback[] = [];

  constructor(playerId: number, registry: CosmeticRegistry, config?: Partial<CosmeticsConfig>) {
    this.playerId = playerId;
    this.registry = registry;
    this.config = { ...DEFAULT_COSMETICS_CONFIG, ...config };
    this.data = {
      ownedCosmetics: [],
      equippedCosmetics: new Map(),
    };
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  init(): void {
    const dss = game.GetService("DataStoreService") as {
      GetDataStore(name: string): {
        GetAsync: (key: string) => unknown;
        SetAsync: (key: string, value: unknown) => void;
      };
    };
    this.dataStore = dss.GetDataStore(this.config.datastoreName ?? "CosmeticsData");
    if (this.config.enableLogging) print(`[CosmeticStore] init for player ${this.playerId}`);
  }

  load(): void {
    if (!this.dataStore) return;
    const [ok, raw] = pcall(
      () =>
        this.dataStore!.GetAsync(`cosmetics_${this.playerId}`) as
          | { ownedCosmetics?: string[]; equippedCosmetics?: Array<[string, string]> }
          | undefined
    );
    if (!ok || raw === undefined) {
      this.dirty = false;
      return;
    }
    this.data.ownedCosmetics = raw.ownedCosmetics ?? [];
    this.data.equippedCosmetics = new Map<string, string>();
    if (raw.equippedCosmetics) {
      for (let i = 0; i < raw.equippedCosmetics.size(); i++) {
        const pair = raw.equippedCosmetics[i];
        this.data.equippedCosmetics.set(pair[0], pair[1]);
      }
    }
    this.dirty = false;
  }

  save(): void {
    if (!this.dataStore) return;
    const equippedArr: Array<[string, string]> = [];
    this.data.equippedCosmetics.forEach((v, k) => equippedArr.push([k, v]));
    pcall(() =>
      this.dataStore!.SetAsync(`cosmetics_${this.playerId}`, {
        ownedCosmetics: this.data.ownedCosmetics,
        equippedCosmetics: equippedArr,
      })
    );
    this.dirty = false;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  // -------------------------------------------------------------------------
  // Ownership
  // -------------------------------------------------------------------------

  /** Grant a cosmetic to the player */
  grant(cosmeticId: string): CosmeticResult {
    if (!this.registry.has(cosmeticId)) {
      return { ok: false, status: "cosmetic_not_found" };
    }
    if (this.owns(cosmeticId)) {
      return { ok: false, status: "already_owned" };
    }
    this.data.ownedCosmetics.push(cosmeticId);
    this.dirty = true;
    return { ok: true, status: "success" };
  }

  /** Revoke a cosmetic from the player */
  revoke(cosmeticId: string): CosmeticResult {
    if (!this.owns(cosmeticId)) {
      return { ok: false, status: "not_owned" };
    }
    // Unequip if currently equipped
    this.data.equippedCosmetics.forEach((equipped, slot) => {
      if (equipped === cosmeticId) {
        this.data.equippedCosmetics.delete(slot);
      }
    });
    // Remove from owned (rebuild array)
    const newOwned: string[] = [];
    for (let i = 0; i < this.data.ownedCosmetics.size(); i++) {
      if (this.data.ownedCosmetics[i] !== cosmeticId) {
        newOwned.push(this.data.ownedCosmetics[i]);
      }
    }
    this.data.ownedCosmetics = newOwned;
    this.dirty = true;
    return { ok: true, status: "success" };
  }

  /** Check ownership */
  owns(cosmeticId: string): boolean {
    for (let i = 0; i < this.data.ownedCosmetics.size(); i++) {
      if (this.data.ownedCosmetics[i] === cosmeticId) return true;
    }
    return false;
  }

  /** Get all owned cosmetic IDs */
  getOwned(): string[] {
    const result: string[] = [];
    for (let i = 0; i < this.data.ownedCosmetics.size(); i++) {
      result.push(this.data.ownedCosmetics[i]);
    }
    return result;
  }

  /** Count owned */
  ownedCount(): number {
    return this.data.ownedCosmetics.size();
  }

  // -------------------------------------------------------------------------
  // Equip / Unequip
  // -------------------------------------------------------------------------

  /** Equip a cosmetic to a slot */
  equip(cosmeticId: string, slot: EquipSlot): CosmeticResult {
    if (!this.registry.has(cosmeticId)) {
      return { ok: false, status: "cosmetic_not_found" };
    }
    if (!this.owns(cosmeticId)) {
      return { ok: false, status: "not_owned" };
    }

    // Validate slot matches cosmetic category
    const cosmetic = this.registry.get(cosmeticId)!;
    if (!this.isSlotValidForCategory(cosmetic.category, slot)) {
      return { ok: false, status: "slot_category_mismatch" };
    }

    // Check if already equipped in this slot
    const current = this.data.equippedCosmetics.get(slot);
    if (current === cosmeticId) {
      return { ok: false, status: "already_equipped" };
    }

    this.data.equippedCosmetics.set(slot, cosmeticId);
    this.dirty = true;

    for (let i = 0; i < this.equipCallbacks.size(); i++) {
      this.equipCallbacks[i]({
        playerId: this.playerId,
        cosmeticId,
        slot,
        equipped: true,
        timestamp: os.time(),
      });
    }

    return { ok: true, status: "success" };
  }

  /** Unequip a slot */
  unequip(slot: EquipSlot): CosmeticResult {
    if (!this.data.equippedCosmetics.has(slot)) {
      return { ok: false, status: "not_equipped" };
    }
    const cosmeticId = this.data.equippedCosmetics.get(slot)!;
    this.data.equippedCosmetics.delete(slot);
    this.dirty = true;

    for (let i = 0; i < this.equipCallbacks.size(); i++) {
      this.equipCallbacks[i]({
        playerId: this.playerId,
        cosmeticId,
        slot,
        equipped: false,
        timestamp: os.time(),
      });
    }

    return { ok: true, status: "success" };
  }

  /** Get equipped cosmetic for a slot */
  getEquipped(slot: EquipSlot): string | undefined {
    return this.data.equippedCosmetics.get(slot);
  }

  /** Get all equipped slots */
  getAllEquipped(): Map<string, string> {
    const result = new Map<string, string>();
    this.data.equippedCosmetics.forEach((cosmeticId, slot) => {
      result.set(slot, cosmeticId);
    });
    return result;
  }

  /** Count equipped slots */
  equippedCount(): number {
    let count = 0;
    this.data.equippedCosmetics.forEach(() => count++);
    return count;
  }

  // -------------------------------------------------------------------------
  // Slot validation
  // -------------------------------------------------------------------------

  private isSlotValidForCategory(category: string, slot: EquipSlot): boolean {
    for (let i = 0; i < CATEGORY_SLOTS.size(); i++) {
      const pair = CATEGORY_SLOTS[i];
      if (pair[0] === category && pair[1] === slot) return true;
    }
    // Allow emote category in emote_2 as well
    if (category === "emote" && slot === "emote_2") return true;
    return false;
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  onEquip(cb: CosmeticEquipCallback): void {
    this.equipCallbacks.push(cb);
  }
}
