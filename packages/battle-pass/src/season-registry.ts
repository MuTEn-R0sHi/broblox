/**
 * @broblox/battle-pass — Season Registry
 *
 * Manages season definitions.
 */

import type { SeasonDefinition } from "./types";

export class SeasonRegistry {
  private seasons = new Map<string, SeasonDefinition>();

  /** Register a season */
  register(season: SeasonDefinition): void {
    this.seasons.set(season.id, season);
  }

  /** Bulk register */
  registerAll(seasons: ReadonlyArray<SeasonDefinition>): void {
    for (let i = 0; i < seasons.size(); i++) {
      this.register(seasons[i]);
    }
  }

  /** Get by id */
  get(id: string): SeasonDefinition | undefined {
    return this.seasons.get(id);
  }

  /** Check existence */
  has(id: string): boolean {
    return this.seasons.has(id);
  }

  /** Get all seasons */
  getAll(): SeasonDefinition[] {
    const result: SeasonDefinition[] = [];
    this.seasons.forEach((s) => result.push(s));
    return result;
  }

  /** Get the currently active season */
  getActive(): SeasonDefinition | undefined {
    let active: SeasonDefinition | undefined;
    this.seasons.forEach((s) => {
      if (s.active) active = s;
    });
    return active;
  }

  /** Count */
  count(): number {
    let n = 0;
    this.seasons.forEach(() => n++);
    return n;
  }

  /** Clear */
  clear(): void {
    this.seasons.clear();
  }
}
