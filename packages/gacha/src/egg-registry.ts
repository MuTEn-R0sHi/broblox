/**
 * @broblox/gacha — Egg Registry
 *
 * Manages egg definitions (loot tables, costs, pity thresholds).
 */

import type { EggDefinition, GachaRarity } from "./types";
import { rarityRank } from "./types";

export class EggRegistry {
  private eggs = new Map<string, EggDefinition>();

  /** Register an egg definition */
  register(egg: EggDefinition): void {
    this.eggs.set(egg.id, egg);
  }

  /** Bulk register */
  registerAll(eggs: ReadonlyArray<EggDefinition>): void {
    for (let i = 0; i < eggs.size(); i++) {
      this.register(eggs[i]);
    }
  }

  /** Get an egg by id */
  get(id: string): EggDefinition | undefined {
    return this.eggs.get(id);
  }

  /** Check existence */
  has(id: string): boolean {
    return this.eggs.has(id);
  }

  /** Get all eggs */
  getAll(): EggDefinition[] {
    const result: EggDefinition[] = [];
    this.eggs.forEach((egg) => result.push(egg));
    return result;
  }

  /** Get enabled eggs only */
  getEnabled(): EggDefinition[] {
    const result: EggDefinition[] = [];
    this.eggs.forEach((egg) => {
      if (egg.enabled) result.push(egg);
    });
    return result;
  }

  /** Count */
  count(): number {
    let n = 0;
    this.eggs.forEach(() => n++);
    return n;
  }

  /** Clear */
  clear(): void {
    this.eggs.clear();
  }

  /** Get rarity rank (useful externally) */
  static rarityRank(r: GachaRarity): number {
    return rarityRank(r);
  }
}
