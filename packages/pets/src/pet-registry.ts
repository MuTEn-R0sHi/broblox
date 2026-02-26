/**
 * @broblox/pets — Pet Registry
 *
 * Holds static pet species definitions. Register once at startup.
 */

import { createLogger } from "@broblox/core";
import type { PetSpecies } from "./types";

export class PetRegistry {
  private species = new Map<string, PetSpecies>();
  private logger = createLogger("PetRegistry");

  /** Register a pet species definition. */
  register(species: PetSpecies): void {
    if (this.species.has(species.id)) {
      this.logger.warn(`Duplicate species ID: ${species.id}`);
      return;
    }
    this.species.set(species.id, species);
  }

  /** Register multiple species at once. */
  registerAll(list: PetSpecies[]): void {
    for (const s of list) {
      this.register(s);
    }
  }

  /** Get a species by ID. */
  get(id: string): PetSpecies | undefined {
    return this.species.get(id);
  }

  /** Check if a species exists. */
  has(id: string): boolean {
    return this.species.has(id);
  }

  /** Get all registered species. */
  getAll(): PetSpecies[] {
    const result: PetSpecies[] = [];
    this.species.forEach((s) => result.push(s));
    return result;
  }

  /** Filter species by rarity. */
  getByRarity(rarity: string): PetSpecies[] {
    const result: PetSpecies[] = [];
    this.species.forEach((s) => {
      if (s.rarity === rarity) result.push(s);
    });
    return result;
  }

  /** Filter species by element. */
  getByElement(element: string): PetSpecies[] {
    const result: PetSpecies[] = [];
    this.species.forEach((s) => {
      if (s.element === element) result.push(s);
    });
    return result;
  }

  /** Count of registered species. */
  count(): number {
    let n = 0;
    this.species.forEach(() => n++);
    return n;
  }

  /** Clear all species (for testing). */
  clear(): void {
    this.species.clear();
  }
}
