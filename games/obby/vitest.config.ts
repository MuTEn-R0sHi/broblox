/**
 * Game-specific vitest config for the Obby game.
 * Extends root config but overrides shared/* aliases to point to this game's files.
 *
 * Usage: pnpm --filter @broblox/game-obby test
 */
import { defineConfig, mergeConfig } from "vitest/config";
import { resolve } from "node:path";
import rootConfig from "../../vitest.config";

export default mergeConfig(
  rootConfig,
  defineConfig({
    resolve: {
      alias: {
        "shared/types": resolve(__dirname, "src/shared/types.ts"),
        "shared/remotes": resolve(__dirname, "src/shared/remotes.ts"),
        "shared/util": resolve(__dirname, "src/shared/util.ts"),
      },
    },
  })
);
