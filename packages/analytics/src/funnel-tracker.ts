/**
 * Funnel Tracker
 *
 * Tracks player progression through multi-step funnels
 * (e.g., tutorial completion, onboarding, purchase flow).
 */

import { createLogger } from "@broblox/core";
import { Counter } from "@broblox/observability";
import type { FunnelDefinition, FunnelProgress, FunnelStats, AnalyticsConfig } from "./types";

const funnelEnters = new Counter("analytics_funnel_enters");
const funnelCompletions = new Counter("analytics_funnel_completions");
const funnelTimeouts = new Counter("analytics_funnel_timeouts");

/**
 * Tracks multi-step funnels per player.
 */
export class FunnelTracker {
  private definitions = new Map<string, FunnelDefinition>();
  /** funnelName → playerId → progress */
  private progress = new Map<string, Map<number, FunnelProgress>>();
  private config: AnalyticsConfig;
  private logger: ReturnType<typeof createLogger> | undefined;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    if (config.enableLogging) {
      this.logger = createLogger("FunnelTracker");
    }
  }

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  /**
   * Register a funnel definition.
   */
  registerFunnel(def: FunnelDefinition): void {
    this.definitions.set(def.name, def);
    this.progress.set(def.name, new Map());
    this.logger?.info(`Registered funnel: ${def.name} (${def.steps.size()} steps)`);
  }

  /**
   * Get a funnel definition.
   */
  getFunnel(name: string): FunnelDefinition | undefined {
    return this.definitions.get(name);
  }

  // --------------------------------------------------------------------------
  // Progress
  // --------------------------------------------------------------------------

  /**
   * Enter a player into a funnel (step 0).
   */
  enterFunnel(funnel: string, playerId: number): boolean {
    const def = this.definitions.get(funnel);
    if (!def) {
      this.logger?.warn(`Unknown funnel: ${funnel}`);
      return false;
    }

    const map = this.progress.get(funnel)!;
    // Already in funnel?
    if (map.has(playerId)) {
      return false;
    }

    const now = os.time();
    map.set(playerId, {
      playerId,
      currentStep: 0,
      startedAt: now,
      lastStepAt: now,
      completed: false,
      timedOut: false,
    });

    funnelEnters.inc();
    this.logger?.info(`Player ${playerId} entered funnel "${funnel}" step 0/${def.steps.size()}`);
    return true;
  }

  /**
   * Advance a player to the next step in a funnel.
   * The `stepName` must match the next expected step.
   *
   * Returns: true if advanced, false if step doesn't match or player not in funnel.
   */
  advanceStep(funnel: string, playerId: number, stepName: string): boolean {
    const def = this.definitions.get(funnel);
    if (!def) return false;

    const map = this.progress.get(funnel)!;
    const prog = map.get(playerId);
    if (!prog || prog.completed || prog.timedOut) return false;

    // Check timeout
    if (def.timeoutSec !== undefined && def.timeoutSec > 0) {
      if (os.time() - prog.startedAt > def.timeoutSec) {
        prog.timedOut = true;
        funnelTimeouts.inc();
        this.logger?.info(`Player ${playerId} timed out of funnel "${funnel}"`);
        return false;
      }
    }

    const nextStepIndex = prog.currentStep + 1;
    if (nextStepIndex >= def.steps.size()) {
      return false; // Already at last step
    }

    const expectedStep = def.steps[nextStepIndex];
    if (expectedStep !== stepName) {
      this.logger?.warn(
        `Funnel "${funnel}" step mismatch for player ${playerId}: expected "${expectedStep}", got "${stepName}"`
      );
      return false;
    }

    prog.currentStep = nextStepIndex;
    prog.lastStepAt = os.time();

    // Check if completed (reached the last step)
    if (nextStepIndex === def.steps.size() - 1) {
      prog.completed = true;
      funnelCompletions.inc();

      const durationSec = prog.lastStepAt - prog.startedAt;
      this.logger?.info(`Player ${playerId} completed funnel "${funnel}" in ${durationSec}s`);
      if (this.config.onFunnelComplete) {
        pcall(() => this.config.onFunnelComplete!(funnel, playerId, durationSec));
      }
    } else {
      this.logger?.info(
        `Player ${playerId} advanced to step ${nextStepIndex} ("${stepName}") in funnel "${funnel}"`
      );
    }

    return true;
  }

  /**
   * Get a player's progress in a funnel.
   */
  getProgress(funnel: string, playerId: number): FunnelProgress | undefined {
    return this.progress.get(funnel)?.get(playerId);
  }

  /**
   * Remove a player from a funnel (e.g., on leave).
   */
  removePlayer(funnel: string, playerId: number): void {
    this.progress.get(funnel)?.delete(playerId);
  }

  /**
   * Remove a player from ALL funnels.
   */
  removePlayerFromAll(playerId: number): void {
    this.progress.forEach((map) => {
      map.delete(playerId);
    });
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  /**
   * Get aggregate stats for a funnel.
   */
  getStats(funnel: string): FunnelStats | undefined {
    const def = this.definitions.get(funnel);
    if (!def) return undefined;

    const map = this.progress.get(funnel)!;
    const stepCounts: number[] = [];
    for (let i = 0; i < def.steps.size(); i++) {
      stepCounts.push(0);
    }

    let entered = 0;
    let completed = 0;

    map.forEach((prog) => {
      entered++;
      for (let i = 0; i <= prog.currentStep && i < def.steps.size(); i++) {
        stepCounts[i]++;
      }
      if (prog.completed) {
        completed++;
      }
    });

    const conversionRate = entered > 0 ? completed / entered : 0;

    return { funnel, entered, stepCounts, completed, conversionRate };
  }

  /**
   * Reset all funnel progress (e.g., between rounds).
   */
  reset(funnel?: string): void {
    if (funnel) {
      const map = this.progress.get(funnel);
      if (map) map.clear();
    } else {
      this.progress.forEach((map) => map.clear());
    }
  }
}
