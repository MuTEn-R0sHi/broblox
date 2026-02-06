/**
 * Quest Registry
 *
 * Central registry for quest definitions. Quests are registered once at startup.
 */

import type { QuestDefinition, QuestSchedule, QuestTier } from "./types";

export class QuestRegistry {
  private quests = new Map<string, QuestDefinition>();

  /** Register a quest definition. */
  register(quest: QuestDefinition): void {
    this.quests.set(quest.id, quest);
  }

  /** Unregister a quest. */
  unregister(id: string): boolean {
    return this.quests.delete(id);
  }

  /** Get a quest by ID. */
  get(id: string): QuestDefinition | undefined {
    return this.quests.get(id);
  }

  /** Check if a quest exists. */
  has(id: string): boolean {
    return this.quests.has(id);
  }

  /** Get all quest definitions. */
  getAll(): QuestDefinition[] {
    const result: QuestDefinition[] = [];
    this.quests.forEach((quest) => result.push(quest));
    return result;
  }

  /** Get quests by schedule type. */
  getBySchedule(schedule: QuestSchedule): QuestDefinition[] {
    const result: QuestDefinition[] = [];
    this.quests.forEach((quest) => {
      if (quest.schedule === schedule) {
        result.push(quest);
      }
    });
    return result;
  }

  /** Get quests by tier. */
  getByTier(tier: QuestTier): QuestDefinition[] {
    const result: QuestDefinition[] = [];
    this.quests.forEach((quest) => {
      if (quest.tier === tier) {
        result.push(quest);
      }
    });
    return result;
  }

  /** Get quests by tag. */
  getByTag(tag: string): QuestDefinition[] {
    const result: QuestDefinition[] = [];
    this.quests.forEach((quest) => {
      if (quest.tags) {
        for (const t of quest.tags) {
          if (t === tag) {
            result.push(quest);
            break;
          }
        }
      }
    });
    return result;
  }

  /** Get quests available for a given player level. */
  getAvailableForLevel(level: number): QuestDefinition[] {
    const result: QuestDefinition[] = [];
    this.quests.forEach((quest) => {
      const minOk = quest.minLevel === undefined || level >= quest.minLevel;
      const maxOk = quest.maxLevel === undefined || quest.maxLevel === 0 || level <= quest.maxLevel;
      if (minOk && maxOk) {
        result.push(quest);
      }
    });
    return result;
  }

  /** Count registered quests. */
  count(): number {
    let n = 0;
    this.quests.forEach(() => n++);
    return n;
  }

  /** Clear all registered quests. */
  clear(): void {
    this.quests.clear();
  }
}
