/**
 * @broblox/cosmetics — Cosmetic Registry
 *
 * Manages cosmetic definitions and metadata.
 */

import type { CosmeticCategory, CosmeticDefinition } from "./types";

export class CosmeticRegistry {
  private cosmetics = new Map<string, CosmeticDefinition>();

  /** Register a cosmetic definition */
  register(cosmetic: CosmeticDefinition): void {
    this.cosmetics.set(cosmetic.id, cosmetic);
  }

  /** Bulk register */
  registerAll(items: ReadonlyArray<CosmeticDefinition>): void {
    for (let i = 0; i < items.size(); i++) {
      this.register(items[i]);
    }
  }

  /** Get by id */
  get(id: string): CosmeticDefinition | undefined {
    return this.cosmetics.get(id);
  }

  /** Check existence */
  has(id: string): boolean {
    return this.cosmetics.has(id);
  }

  /** Get all */
  getAll(): CosmeticDefinition[] {
    const result: CosmeticDefinition[] = [];
    this.cosmetics.forEach((c) => result.push(c));
    return result;
  }

  /** Get by category */
  getByCategory(category: CosmeticCategory): CosmeticDefinition[] {
    const result: CosmeticDefinition[] = [];
    this.cosmetics.forEach((c) => {
      if (c.category === category) result.push(c);
    });
    return result;
  }

  /** Get by rarity */
  getByRarity(rarity: string): CosmeticDefinition[] {
    const result: CosmeticDefinition[] = [];
    this.cosmetics.forEach((c) => {
      if (c.rarity === rarity) result.push(c);
    });
    return result;
  }

  /** Count */
  count(): number {
    let n = 0;
    this.cosmetics.forEach(() => n++);
    return n;
  }

  /** Clear */
  clear(): void {
    this.cosmetics.clear();
  }
}
