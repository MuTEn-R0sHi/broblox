# @rbx/tutorial

First-time user experience (FTUE) and guided tutorial framework.

## Purpose

This package provides a tutorial system:

- **Sequence definitions** — Ordered steps with prerequisites
- **Step types** — Dialog, highlight, action, teleport, delay, checkpoint, custom
- **Completion conditions** — Action-based, timeout, manual, or event-driven
- **Progress persistence** — Track completed/skipped sequences across sessions
- **Skip support** — Per-step and per-sequence skip toggles

## Dependencies

- `@rbx/core` — Service lifecycle, logging

## Architecture

### Registry → Manager Pattern

1. **SequenceRegistry** — Register tutorial sequences (steps, prerequisites, skip rules)
2. **TutorialManager** — Per-player state: active sequence, step index, progress
3. **`createTutorialService`** — Wires registry + per-player managers

### Tutorial Flow

1. Register sequences at startup with ordered steps
2. On player join → `initPlayer(playerId)` loads saved progress
3. Start a sequence → `manager.startSequence("intro")`
4. Player completes step conditions → `manager.completeAction(actionId)` or `manager.advanceStep()`
5. Sequence completes → `onSequenceCompleted` fires
6. Progress auto-persists via dirty tracking

## Usage

```typescript
import { createTutorialService } from "@rbx/tutorial";

const tutorial = createTutorialService({
  sequences: [
    {
      id: "intro",
      name: "Introduction",
      skippable: true,
      persistent: true,
      prerequisites: [],
      version: 1,
      steps: [
        {
          id: "welcome",
          stepType: "dialog",
          title: "Welcome!",
          message: "Let's learn the basics.",
          condition: { type: "manual" },
          skippable: true,
        },
        {
          id: "move",
          stepType: "action",
          title: "Move around",
          message: "Use WASD to move.",
          condition: { type: "action", actionId: "player_moved" },
          skippable: false,
        },
      ],
    },
  ],
  datastoreName: "Tutorial",
});

// On player join
tutorial.initPlayer(playerId);
const manager = tutorial.getTutorialManager(playerId);
manager.startSequence("intro");
```

## Related Docs

- [Module docs](../../docs/modules/tutorial.md)
