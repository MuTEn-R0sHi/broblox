/**
 * @rbx/tutorial — Tutorial Manager
 *
 * Manages per-player tutorial progression, step advancement, and completion tracking.
 */

import { createLogger } from "@rbx/core";
import type {
  TutorialConfig,
  TutorialProgress,
  TutorialResult,
  TutorialStep,
  StepStartedEvent,
  StepCompletedEvent,
  SequenceCompletedEvent,
  StepStartedCallback,
  StepCompletedCallback,
  SequenceCompletedCallback,
} from "./types";
import { DEFAULT_TUTORIAL_CONFIG } from "./types";
import { SequenceRegistry } from "./sequence-registry";

const PROGRESS_VERSION = 1;

export class TutorialManager {
  private playerId: number;
  private registry: SequenceRegistry;
  private config: TutorialConfig;
  private progress: TutorialProgress;
  private dirty = false;
  private logger;

  private stepStartedCallbacks: StepStartedCallback[] = [];
  private stepCompletedCallbacks: StepCompletedCallback[] = [];
  private sequenceCompletedCallbacks: SequenceCompletedCallback[] = [];

  constructor(playerId: number, registry: SequenceRegistry, config?: Partial<TutorialConfig>) {
    this.playerId = playerId;
    this.registry = registry;
    this.config = { ...DEFAULT_TUTORIAL_CONFIG, ...config };
    this.logger = this.config.enableLogging ? createLogger("TutorialManager") : undefined;
    this.progress = {
      completedSequences: [],
      activeStepIndex: 0,
      skippedSequences: [],
      totalStepsCompleted: 0,
      lastActivityAt: 0,
      version: PROGRESS_VERSION,
    };
  }

  // --------------------------------------------------------------------------
  // Start / Complete
  // --------------------------------------------------------------------------

  /** Start a tutorial sequence */
  startSequence(sequenceId: string): TutorialResult {
    const seq = this.registry.get(sequenceId);
    if (!seq) return { ok: false, status: "sequence_not_found" };

    if (this.progress.activeSequenceId !== undefined) {
      return { ok: false, status: "already_active" };
    }

    if (this.isCompleted(sequenceId)) {
      return { ok: false, status: "already_completed" };
    }

    // Check prerequisites
    for (let i = 0; i < seq.prerequisites.size(); i++) {
      if (!this.isCompleted(seq.prerequisites[i])) {
        return { ok: false, status: "prerequisites_not_met" };
      }
    }

    this.progress.activeSequenceId = sequenceId;
    this.progress.activeStepIndex = 0;
    this.progress.lastActivityAt = os.time();
    this.dirty = true;

    // Fire step started
    if (seq.steps.size() > 0) {
      this.fireStepStarted(sequenceId, seq.steps[0], 0);
    }

    this.logger?.info(`Started sequence: ${sequenceId}`);
    return { ok: true, status: "success", sequenceId, stepId: seq.steps[0]?.id };
  }

  /** Advance to the next step in the active sequence */
  advanceStep(): TutorialResult {
    if (this.progress.activeSequenceId === undefined) {
      return { ok: false, status: "no_active_sequence" };
    }

    const seq = this.registry.get(this.progress.activeSequenceId);
    if (!seq) return { ok: false, status: "sequence_not_found" };

    const currentIndex = this.progress.activeStepIndex;
    const currentStep = seq.steps[currentIndex];

    // Fire step completed
    if (currentStep) {
      this.fireStepCompleted(this.progress.activeSequenceId, currentStep, currentIndex);
    }
    this.progress.totalStepsCompleted++;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= seq.steps.size()) {
      // Sequence complete
      return this.completeActiveSequence(false);
    }

    this.progress.activeStepIndex = nextIndex;
    this.progress.lastActivityAt = os.time();
    this.dirty = true;

    // Fire next step started
    const nextStep = seq.steps[nextIndex];
    this.fireStepStarted(this.progress.activeSequenceId, nextStep, nextIndex);

    return { ok: true, status: "success", stepId: nextStep.id };
  }

  /** Skip the active sequence (if allowed) */
  skipSequence(): TutorialResult {
    if (this.progress.activeSequenceId === undefined) {
      return { ok: false, status: "no_active_sequence" };
    }

    const seq = this.registry.get(this.progress.activeSequenceId);
    if (!seq) return { ok: false, status: "sequence_not_found" };

    if (!seq.skippable && !this.config.allowSkipAll) {
      return { ok: false, status: "not_skippable" };
    }

    return this.completeActiveSequence(true);
  }

  /** Skip the current step (if allowed) */
  skipStep(): TutorialResult {
    if (this.progress.activeSequenceId === undefined) {
      return { ok: false, status: "no_active_sequence" };
    }

    const seq = this.registry.get(this.progress.activeSequenceId);
    if (!seq) return { ok: false, status: "sequence_not_found" };

    const currentStep = seq.steps[this.progress.activeStepIndex];
    if (currentStep && !currentStep.skippable && !this.config.allowSkipAll) {
      return { ok: false, status: "not_skippable" };
    }

    return this.advanceStep();
  }

  /** Complete an action — advances step if the action matches the current condition */
  completeAction(actionId: string): TutorialResult {
    if (this.progress.activeSequenceId === undefined) {
      return { ok: false, status: "no_active_sequence" };
    }

    const seq = this.registry.get(this.progress.activeSequenceId);
    if (!seq) return { ok: false, status: "sequence_not_found" };

    const currentStep = seq.steps[this.progress.activeStepIndex];
    if (!currentStep) return { ok: false, status: "step_not_found" };

    if (currentStep.condition.type === "action" && currentStep.condition.actionId === actionId) {
      return this.advanceStep();
    }

    return { ok: true, status: "success" }; // action didn't match, no-op
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /** Check if a sequence is completed */
  isCompleted(sequenceId: string): boolean {
    for (let i = 0; i < this.progress.completedSequences.size(); i++) {
      if (this.progress.completedSequences[i] === sequenceId) return true;
    }
    return false;
  }

  /** Check if a sequence was skipped */
  isSkipped(sequenceId: string): boolean {
    for (let i = 0; i < this.progress.skippedSequences.size(); i++) {
      if (this.progress.skippedSequences[i] === sequenceId) return true;
    }
    return false;
  }

  /** Get the active sequence ID */
  getActiveSequenceId(): string | undefined {
    return this.progress.activeSequenceId;
  }

  /** Get the current step index */
  getActiveStepIndex(): number {
    return this.progress.activeStepIndex;
  }

  /** Get the current step */
  getCurrentStep(): TutorialStep | undefined {
    if (this.progress.activeSequenceId === undefined) return undefined;
    const seq = this.registry.get(this.progress.activeSequenceId);
    if (!seq) return undefined;
    return seq.steps[this.progress.activeStepIndex];
  }

  /** Get completed count */
  completedCount(): number {
    return this.progress.completedSequences.size();
  }

  /** Get total steps completed */
  totalStepsCompleted(): number {
    return this.progress.totalStepsCompleted;
  }

  /** Check if dirty */
  isDirty(): boolean {
    return this.dirty;
  }

  /** Get full progress snapshot */
  getProgress(): TutorialProgress {
    return { ...this.progress };
  }

  /** Restore progress from saved data */
  restoreProgress(saved: TutorialProgress): void {
    this.progress = {
      completedSequences: saved.completedSequences ?? [],
      activeSequenceId: saved.activeSequenceId,
      activeStepIndex: math.max(0, saved.activeStepIndex ?? 0),
      skippedSequences: saved.skippedSequences ?? [],
      totalStepsCompleted: math.max(0, saved.totalStepsCompleted ?? 0),
      lastActivityAt: math.max(0, saved.lastActivityAt ?? 0),
      version: saved.version ?? PROGRESS_VERSION,
    };
    this.dirty = false;
  }

  /** Mark save complete */
  markClean(): void {
    this.dirty = false;
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onStepStarted(cb: StepStartedCallback): void {
    this.stepStartedCallbacks.push(cb);
  }

  onStepCompleted(cb: StepCompletedCallback): void {
    this.stepCompletedCallbacks.push(cb);
  }

  onSequenceCompleted(cb: SequenceCompletedCallback): void {
    this.sequenceCompletedCallbacks.push(cb);
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private completeActiveSequence(skipped: boolean): TutorialResult {
    const seqId = this.progress.activeSequenceId!;
    const seq = this.registry.get(seqId);

    this.progress.completedSequences.push(seqId);
    if (skipped) {
      this.progress.skippedSequences.push(seqId);
    }
    this.progress.activeSequenceId = undefined;
    this.progress.activeStepIndex = 0;
    this.progress.lastActivityAt = os.time();
    this.dirty = true;

    const evt: SequenceCompletedEvent = {
      playerId: this.playerId,
      sequenceId: seqId,
      totalSteps: seq?.steps.size() ?? 0,
      skipped,
      timestamp: os.time(),
    };
    for (let i = 0; i < this.sequenceCompletedCallbacks.size(); i++) {
      this.sequenceCompletedCallbacks[i](evt);
    }

    this.logger?.info(`${skipped ? "Skipped" : "Completed"} sequence: ${seqId}`);
    return {
      ok: true,
      status: skipped ? "sequence_skipped" : "sequence_completed",
      sequenceId: seqId,
    };
  }

  private fireStepStarted(seqId: string, step: TutorialStep, index: number): void {
    const evt: StepStartedEvent = {
      playerId: this.playerId,
      sequenceId: seqId,
      stepId: step.id,
      stepIndex: index,
      stepType: step.stepType,
      timestamp: os.time(),
    };
    for (let i = 0; i < this.stepStartedCallbacks.size(); i++) {
      this.stepStartedCallbacks[i](evt);
    }
  }

  private fireStepCompleted(seqId: string, step: TutorialStep, index: number): void {
    const evt: StepCompletedEvent = {
      playerId: this.playerId,
      sequenceId: seqId,
      stepId: step.id,
      stepIndex: index,
      timestamp: os.time(),
    };
    for (let i = 0; i < this.stepCompletedCallbacks.size(); i++) {
      this.stepCompletedCallbacks[i](evt);
    }
  }
}
