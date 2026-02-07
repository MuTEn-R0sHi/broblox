/**
 * Obby Game Types Tests
 *
 * Placeholder tests for the obby game shared types.
 */

import { describe, it, expect } from "vitest";
import { OBBY_CONSTANTS } from "./types";

describe("obby constants", () => {
  it("should have valid stage constants", () => {
    expect(OBBY_CONSTANTS.DEFAULT_STAGE_COINS).toBeGreaterThan(0);
    expect(OBBY_CONSTANTS.TIME_BONUS_COINS).toBeGreaterThan(0);
    expect(OBBY_CONSTANTS.RESPAWN_DELAY).toBeGreaterThanOrEqual(0);
  });

  it("should have valid kill brick damage", () => {
    expect(OBBY_CONSTANTS.KILL_BRICK_DAMAGE).toBeGreaterThan(0);
  });

  it("should have valid collection service tags", () => {
    expect(OBBY_CONSTANTS.STAGE_TAG).toBe("ObbyStage");
    expect(OBBY_CONSTANTS.CHECKPOINT_TAG).toBe("ObbyCheckpoint");
    expect(OBBY_CONSTANTS.END_ZONE_TAG).toBe("ObbyEndZone");
    expect(OBBY_CONSTANTS.KILL_ZONE_TAG).toBe("ObbyKillZone");
    expect(OBBY_CONSTANTS.COIN_TAG).toBe("ObbyCoin");
  });
});
