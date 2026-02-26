/**
 * @broblox/tutorial — Public API
 */

export { SequenceRegistry } from "./sequence-registry";
export { TutorialManager } from "./tutorial-manager";
export { createTutorialService } from "./create-tutorial-service";
export type { TutorialServiceConfig, TutorialServiceHandle } from "./create-tutorial-service";
export type {
  StepType,
  StepCondition,
  TutorialStep,
  TutorialSequence,
  TutorialProgress,
  TutorialConfig,
  TutorialResult,
  StepStartedEvent,
  StepCompletedEvent,
  SequenceCompletedEvent,
  StepStartedCallback,
  StepCompletedCallback,
  SequenceCompletedCallback,
} from "./types";
export { DEFAULT_TUTORIAL_CONFIG } from "./types";
