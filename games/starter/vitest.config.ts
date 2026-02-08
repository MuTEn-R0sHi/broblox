/**
 * Game-specific vitest config for the Starter game.
 * Extends root config but overrides shared/* aliases to point to this game's files.
 *
 * Usage: pnpm --filter @rbx/game-starter test
 */
import { defineConfig, mergeConfig } from "vitest/config";
import { resolve } from "node:path";
import rootConfig from "../../vitest.config";

export default mergeConfig(
  rootConfig,
  defineConfig({
    resolve: {
      alias: {
        "shared/remotes": resolve(__dirname, "src/shared/remotes.ts"),
      },
    },
  })
);
