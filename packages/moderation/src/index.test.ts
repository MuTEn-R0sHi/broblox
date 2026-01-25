/**
 * Moderation Package Tests
 *
 * Placeholder tests for the moderation system.
 * TODO: Add comprehensive tests for ban/mute logic.
 */

import { describe, it, expect } from "vitest";
import { DEFAULT_MODERATION_CONFIG } from "./types";

describe("moderation types", () => {
  it("should have valid default config", () => {
    expect(DEFAULT_MODERATION_CONFIG.datastoreName).toBe("PlayerModeration");
    expect(DEFAULT_MODERATION_CONFIG.syncInterval).toBe(60);
    expect(DEFAULT_MODERATION_CONFIG.messagingTopic).toBe("moderation");
    expect(DEFAULT_MODERATION_CONFIG.enableLogging).toBe(true);
  });

  it("should have required callback functions in default config", () => {
    expect(typeof DEFAULT_MODERATION_CONFIG.onBanCheck).toBe("function");
    expect(typeof DEFAULT_MODERATION_CONFIG.onMuteCheck).toBe("function");
  });
});
