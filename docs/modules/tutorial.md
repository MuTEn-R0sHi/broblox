# Modules: Tutorial

FTUE and guided tutorial framework (`@broblox/tutorial`). **Status: Implemented** (42 tests).

## Purpose

- First-time user experience with ordered step sequences.
- Multiple step types: dialog, highlight, action, teleport, delay, checkpoint, custom.
- Completion conditions: action-based, timeout, manual, event-driven.
- Progress persistence across sessions with skip support.

## Core rules

- Sequences have ordered steps with prerequisite sequences.
- Each step has a completion condition that must be met to advance.
- Skipping is opt-in per step and per sequence.
- Progress auto-saves via dirty flag tracking.
- Completed sequences are never replayed (unless version changes).

## Data model

- `TutorialSequence` — `id`, `name`, `steps[]`, `skippable`, `persistent`, `prerequisites[]`, `version`
- `TutorialStep` — `id`, `stepType`, `title`, `message`, `condition`, `skippable`
- `TutorialProgress` — `completedSequences[]`, `activeSequenceId?`, `activeStepIndex`, `skippedSequences[]`

## Security

- Server tracks progress.
- Client sends action completions; server validates against expected actions.
- Skip requests are gated by the `skippable` flag.

## Config/flags

- `tutorial.enabled` (kill-switch)
- `tutorial.autoStart` — auto-start first uncompleted sequence on join
- `tutorial.allowSkipAll` — global skip override

## Observability

- `tutorial.step_started` — step began
- `tutorial.step_completed` — step finished
- `tutorial.sequence_completed` — full sequence done
- `tutorial.sequence_skipped` — player skipped
