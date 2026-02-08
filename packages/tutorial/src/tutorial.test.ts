/**
 * @rbx/tutorial — Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  TutorialStep,
  TutorialSequence,
  StepStartedEvent,
  StepCompletedEvent,
  SequenceCompletedEvent,
} from "./types";

// ---------------------------------------------------------------------------
// Roblox global mocks
// ---------------------------------------------------------------------------

let mockTime = 1000;

function setupGlobals() {
  mockTime = 1000;
  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = { time: vi.fn(() => mockTime), clock: vi.fn(() => mockTime / 1000) };
  g.math = {
    floor: Math.floor,
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
    huge: Infinity,
  };
  g.typeIs = (value: unknown, typeName: string) => {
    if (typeName === "table") return typeof value === "object" && value !== null;
    return typeof value === typeName;
  };
  g.pcall = (fn: (...a: unknown[]) => unknown) => {
    try {
      return [true, fn()];
    } catch (e) {
      return [false, e];
    }
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStep(overrides: Partial<TutorialStep> = {}): TutorialStep {
  return {
    id: overrides.id ?? "step-1",
    stepType: overrides.stepType ?? "dialog",
    title: overrides.title ?? "Test Step",
    message: overrides.message ?? "Do the thing",
    condition: overrides.condition ?? { type: "manual" },
    skippable: overrides.skippable ?? true,
    ...overrides,
  };
}

function makeSequence(overrides: Partial<TutorialSequence> = {}): TutorialSequence {
  return {
    id: overrides.id ?? "seq-1",
    name: overrides.name ?? "Test Sequence",
    steps: overrides.steps ?? [makeStep()],
    skippable: overrides.skippable ?? true,
    persistent: overrides.persistent ?? false,
    prerequisites: overrides.prerequisites ?? [],
    version: overrides.version ?? 1,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SequenceRegistry", () => {
  beforeEach(() => {
    setupGlobals();
  });

  // Lazy import to let globals initialize
  async function loadRegistry() {
    const mod = await import("./sequence-registry");
    return new mod.SequenceRegistry();
  }

  it("registers and retrieves a sequence", async () => {
    const r = await loadRegistry();
    const seq = makeSequence();
    r.register(seq);
    expect(r.get("seq-1")).toEqual(seq);
    expect(r.has("seq-1")).toBe(true);
    expect(r.count()).toBe(1);
  });

  it("prevents duplicate registration", async () => {
    const r = await loadRegistry();
    r.register(makeSequence());
    r.register(makeSequence()); // same id
    expect(r.count()).toBe(1);
  });

  it("registers all in bulk", async () => {
    const r = await loadRegistry();
    r.registerAll([makeSequence({ id: "a" }), makeSequence({ id: "b" })]);
    expect(r.count()).toBe(2);
  });

  it("returns undefined for unknown ID", async () => {
    const r = await loadRegistry();
    expect(r.get("nope")).toBeUndefined();
    expect(r.has("nope")).toBe(false);
  });

  it("getAll returns all registered sequences", async () => {
    const r = await loadRegistry();
    r.registerAll([makeSequence({ id: "a" }), makeSequence({ id: "b" })]);
    const all = r.getAll();
    expect(all.size()).toBe(2);
  });

  it("clears all sequences", async () => {
    const r = await loadRegistry();
    r.register(makeSequence());
    r.clear();
    expect(r.count()).toBe(0);
  });
});

describe("TutorialManager", () => {
  beforeEach(() => {
    setupGlobals();
  });

  async function loadManager(sequences?: TutorialSequence[], config?: Record<string, unknown>) {
    const { SequenceRegistry } = await import("./sequence-registry");
    const { TutorialManager } = await import("./tutorial-manager");
    const registry = new SequenceRegistry();
    if (sequences) {
      for (const s of sequences) registry.register(s);
    }
    return { manager: new TutorialManager(1, registry, config), registry };
  }

  // ------ Start ------

  it("starts a sequence successfully", async () => {
    const { manager } = await loadManager([makeSequence()]);
    const res = manager.startSequence("seq-1");
    expect(res.ok).toBe(true);
    expect(res.sequenceId).toBe("seq-1");
    expect(manager.getActiveSequenceId()).toBe("seq-1");
    expect(manager.getActiveStepIndex()).toBe(0);
  });

  it("rejects start for unknown sequence", async () => {
    const { manager } = await loadManager();
    const res = manager.startSequence("nope");
    expect(res.ok).toBe(false);
    expect(res.status).toBe("sequence_not_found");
  });

  it("rejects start when another is active", async () => {
    const { manager } = await loadManager([makeSequence()]);
    manager.startSequence("seq-1");
    const res = manager.startSequence("seq-1");
    expect(res.ok).toBe(false);
    expect(res.status).toBe("already_active");
  });

  it("rejects start for already completed sequence", async () => {
    const seq = makeSequence({ steps: [makeStep()] });
    const { manager } = await loadManager([seq]);
    manager.startSequence("seq-1");
    manager.advanceStep(); // completes it
    const res = manager.startSequence("seq-1");
    expect(res.ok).toBe(false);
    expect(res.status).toBe("already_completed");
  });

  // ------ Prerequisites ------

  it("rejects start when prerequisites not met", async () => {
    const { manager } = await loadManager([
      makeSequence({ id: "prereq" }),
      makeSequence({ id: "locked", prerequisites: ["prereq"] }),
    ]);
    const res = manager.startSequence("locked");
    expect(res.ok).toBe(false);
    expect(res.status).toBe("prerequisites_not_met");
  });

  it("allows start when prerequisites are met", async () => {
    const { manager } = await loadManager([
      makeSequence({ id: "prereq", steps: [makeStep()] }),
      makeSequence({ id: "locked", prerequisites: ["prereq"] }),
    ]);
    manager.startSequence("prereq");
    manager.advanceStep(); // completes prereq
    const res = manager.startSequence("locked");
    expect(res.ok).toBe(true);
  });

  // ------ Advance ------

  it("advances through multi-step sequences", async () => {
    const steps = [makeStep({ id: "s1" }), makeStep({ id: "s2" }), makeStep({ id: "s3" })];
    const { manager } = await loadManager([makeSequence({ steps })]);
    manager.startSequence("seq-1");

    const r1 = manager.advanceStep();
    expect(r1.ok).toBe(true);
    expect(r1.stepId).toBe("s2");
    expect(manager.getActiveStepIndex()).toBe(1);

    const r2 = manager.advanceStep();
    expect(r2.ok).toBe(true);
    expect(r2.stepId).toBe("s3");

    const r3 = manager.advanceStep();
    expect(r3.ok).toBe(true);
    expect(r3.status).toBe("sequence_completed");
    expect(manager.getActiveSequenceId()).toBeUndefined();
  });

  it("rejects advance with no active sequence", async () => {
    const { manager } = await loadManager();
    const res = manager.advanceStep();
    expect(res.ok).toBe(false);
    expect(res.status).toBe("no_active_sequence");
  });

  // ------ Skip ------

  it("skips a skippable sequence", async () => {
    const { manager } = await loadManager([makeSequence({ skippable: true })]);
    manager.startSequence("seq-1");
    const res = manager.skipSequence();
    expect(res.ok).toBe(true);
    expect(res.status).toBe("sequence_skipped");
    expect(manager.isSkipped("seq-1")).toBe(true);
    expect(manager.isCompleted("seq-1")).toBe(true);
  });

  it("rejects skip for non-skippable sequence", async () => {
    const { manager } = await loadManager([makeSequence({ skippable: false })]);
    manager.startSequence("seq-1");
    const res = manager.skipSequence();
    expect(res.ok).toBe(false);
    expect(res.status).toBe("not_skippable");
  });

  it("allows skip for non-skippable when config allows all", async () => {
    const { manager } = await loadManager([makeSequence({ skippable: false })], {
      allowSkipAll: true,
    });
    manager.startSequence("seq-1");
    const res = manager.skipSequence();
    expect(res.ok).toBe(true);
  });

  it("skips a skippable step", async () => {
    const steps = [makeStep({ id: "s1", skippable: true }), makeStep({ id: "s2" })];
    const { manager } = await loadManager([makeSequence({ steps })]);
    manager.startSequence("seq-1");
    const res = manager.skipStep();
    expect(res.ok).toBe(true);
    expect(manager.getActiveStepIndex()).toBe(1);
  });

  it("rejects skip for non-skippable step", async () => {
    const steps = [makeStep({ id: "s1", skippable: false })];
    const { manager } = await loadManager([makeSequence({ steps })]);
    manager.startSequence("seq-1");
    const res = manager.skipStep();
    expect(res.ok).toBe(false);
    expect(res.status).toBe("not_skippable");
  });

  // ------ Action ------

  it("completes action matching step condition", async () => {
    const steps = [
      makeStep({ id: "s1", condition: { type: "action", actionId: "jump" } }),
      makeStep({ id: "s2" }),
    ];
    const { manager } = await loadManager([makeSequence({ steps })]);
    manager.startSequence("seq-1");
    const res = manager.completeAction("jump");
    expect(res.ok).toBe(true);
    expect(manager.getActiveStepIndex()).toBe(1);
  });

  it("no-op when action doesn't match", async () => {
    const steps = [makeStep({ id: "s1", condition: { type: "action", actionId: "jump" } })];
    const { manager } = await loadManager([makeSequence({ steps })]);
    manager.startSequence("seq-1");
    const res = manager.completeAction("run");
    expect(res.ok).toBe(true);
    expect(manager.getActiveStepIndex()).toBe(0);
  });

  // ------ Queries ------

  it("getCurrentStep returns active step", async () => {
    const step = makeStep({ id: "my-step", title: "hello" });
    const { manager } = await loadManager([makeSequence({ steps: [step] })]);
    manager.startSequence("seq-1");
    const current = manager.getCurrentStep();
    expect(current?.id).toBe("my-step");
    expect(current?.title).toBe("hello");
  });

  it("getCurrentStep returns undefined with no active", async () => {
    const { manager } = await loadManager();
    expect(manager.getCurrentStep()).toBeUndefined();
  });

  it("tracks totalStepsCompleted", async () => {
    const steps = [makeStep({ id: "s1" }), makeStep({ id: "s2" })];
    const { manager } = await loadManager([makeSequence({ steps })]);
    manager.startSequence("seq-1");
    manager.advanceStep();
    manager.advanceStep();
    expect(manager.totalStepsCompleted()).toBe(2);
  });

  it("completedCount increments", async () => {
    const { manager } = await loadManager([
      makeSequence({ id: "a", steps: [makeStep()] }),
      makeSequence({ id: "b", steps: [makeStep()] }),
    ]);
    manager.startSequence("a");
    manager.advanceStep();
    expect(manager.completedCount()).toBe(1);
    manager.startSequence("b");
    manager.advanceStep();
    expect(manager.completedCount()).toBe(2);
  });

  // ------ Progress / Dirty ------

  it("isDirty after changes", async () => {
    const { manager } = await loadManager([makeSequence()]);
    expect(manager.isDirty()).toBe(false);
    manager.startSequence("seq-1");
    expect(manager.isDirty()).toBe(true);
    manager.markClean();
    expect(manager.isDirty()).toBe(false);
  });

  it("restoreProgress re-hydrates state", async () => {
    const { manager } = await loadManager([makeSequence()]);
    manager.restoreProgress({
      completedSequences: ["old"],
      activeStepIndex: 0,
      skippedSequences: [],
      totalStepsCompleted: 5,
      lastActivityAt: 999,
      version: 1,
    });
    expect(manager.isCompleted("old")).toBe(true);
    expect(manager.totalStepsCompleted()).toBe(5);
    expect(manager.isDirty()).toBe(false);
  });

  it("getProgress returns snapshot", async () => {
    const { manager } = await loadManager([makeSequence()]);
    manager.startSequence("seq-1");
    const p = manager.getProgress();
    expect(p.activeSequenceId).toBe("seq-1");
    expect(p.activeStepIndex).toBe(0);
  });

  // ------ Callbacks ------

  it("fires stepStarted on sequence start and advance", async () => {
    const steps = [makeStep({ id: "s1" }), makeStep({ id: "s2" })];
    const { manager } = await loadManager([makeSequence({ steps })]);
    const events: StepStartedEvent[] = [];
    manager.onStepStarted((e) => events.push(e));

    manager.startSequence("seq-1");
    expect(events.size()).toBe(1);
    expect(events[0].stepId).toBe("s1");

    manager.advanceStep();
    expect(events.size()).toBe(2);
    expect(events[1].stepId).toBe("s2");
  });

  it("fires stepCompleted on advance", async () => {
    const steps = [makeStep({ id: "s1" }), makeStep({ id: "s2" })];
    const { manager } = await loadManager([makeSequence({ steps })]);
    const events: StepCompletedEvent[] = [];
    manager.onStepCompleted((e) => events.push(e));

    manager.startSequence("seq-1");
    manager.advanceStep();
    expect(events.size()).toBe(1);
    expect(events[0].stepId).toBe("s1");
  });

  it("fires sequenceCompleted", async () => {
    const { manager } = await loadManager([makeSequence({ steps: [makeStep()] })]);
    const events: SequenceCompletedEvent[] = [];
    manager.onSequenceCompleted((e) => events.push(e));

    manager.startSequence("seq-1");
    manager.advanceStep();
    expect(events.size()).toBe(1);
    expect(events[0].sequenceId).toBe("seq-1");
    expect(events[0].skipped).toBe(false);
  });

  it("sequenceCompleted marks skipped=true on skip", async () => {
    const { manager } = await loadManager([makeSequence({ skippable: true })]);
    const events: SequenceCompletedEvent[] = [];
    manager.onSequenceCompleted((e) => events.push(e));

    manager.startSequence("seq-1");
    manager.skipSequence();
    expect(events.size()).toBe(1);
    expect(events[0].skipped).toBe(true);
  });

  // ------ restoreProgress clamps negative values ------

  it("restoreProgress clamps negative activeStepIndex to 0", async () => {
    const { manager } = await loadManager([makeSequence()]);
    manager.restoreProgress({
      completedSequences: [],
      activeStepIndex: -5,
      skippedSequences: [],
      totalStepsCompleted: -3,
      lastActivityAt: -1,
      version: 1,
    });
    expect(manager.getActiveStepIndex()).toBe(0);
    expect(manager.totalStepsCompleted()).toBe(0);
    const progress = manager.getProgress();
    expect(progress.lastActivityAt).toBe(0);
  });
});
