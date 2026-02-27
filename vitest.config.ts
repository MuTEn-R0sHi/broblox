import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      // Workspace packages compile to .luau in `out/`, which Node/Vitest can't import.
      // For tests, resolve to TS sources instead.
      "@broblox/shared-types": resolve(__dirname, "packages/shared-types/src/index.ts"),
      "@broblox/constants": resolve(__dirname, "packages/constants/src/index.ts"),
      "@broblox/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@broblox/config-featureflags": resolve(
        __dirname,
        "packages/config-featureflags/src/index.ts"
      ),
      "@broblox/net": resolve(__dirname, "packages/net/src/index.ts"),
      "@broblox/data": resolve(__dirname, "packages/data/src/index.ts"),
      "@broblox/security": resolve(__dirname, "packages/security/src/index.ts"),
      "@broblox/observability": resolve(__dirname, "packages/observability/src/index.ts"),
      "@broblox/combat": resolve(__dirname, "packages/combat/src/index.ts"),
      "@broblox/matchmaking": resolve(__dirname, "packages/matchmaking/src/index.ts"),
      "@broblox/moderation": resolve(__dirname, "packages/moderation/src/index.ts"),
      "@broblox/movement": resolve(__dirname, "packages/movement/src/index.ts"),
      "@broblox/codes": resolve(__dirname, "packages/codes/src/index.ts"),
      "@broblox/leaderboards": resolve(__dirname, "packages/leaderboards/src/index.ts"),
      "@broblox/analytics": resolve(__dirname, "packages/analytics/src/index.ts"),
      "@broblox/events": resolve(__dirname, "packages/events/src/index.ts"),
      "@broblox/notifications": resolve(__dirname, "packages/notifications/src/index.ts"),
      "@broblox/inventory": resolve(__dirname, "packages/inventory/src/index.ts"),
      "@broblox/progression": resolve(__dirname, "packages/progression/src/index.ts"),
      "@broblox/quests": resolve(__dirname, "packages/quests/src/index.ts"),
      "@broblox/rewards": resolve(__dirname, "packages/rewards/src/index.ts"),
      "@broblox/pets": resolve(__dirname, "packages/pets/src/index.ts"),
      "@broblox/gacha": resolve(__dirname, "packages/gacha/src/index.ts"),
      "@broblox/cosmetics": resolve(__dirname, "packages/cosmetics/src/index.ts"),
      "@broblox/battle-pass": resolve(__dirname, "packages/battle-pass/src/index.ts"),
      "@broblox/localization": resolve(__dirname, "packages/localization/src/index.ts"),
      "@broblox/audio": resolve(__dirname, "packages/audio/src/index.ts"),
      "@broblox/tutorial": resolve(__dirname, "packages/tutorial/src/index.ts"),
      "@broblox/world-systems": resolve(__dirname, "packages/world-systems/src/index.ts"),
      "@broblox/input": resolve(__dirname, "packages/input/src/index.ts"),
      "@broblox/ui": resolve(__dirname, "packages/ui/src/index.ts"),
      "@broblox/marketplace": resolve(__dirname, "packages/marketplace/src/index.ts"),
      "@broblox/testing": resolve(__dirname, "packages/testing/src/index.ts"),
      "@rbxts/t": resolve(__dirname, "packages/testing/src/t-mock.ts"),

      // Obby game shared path aliases (mirrors tsconfig "shared/*" → "src/shared/*")
      "shared/types": resolve(__dirname, "games/obby/src/shared/types.ts"),
      "shared/remotes": resolve(__dirname, "games/obby/src/shared/remotes.ts"),

      // @rbxts/services is a Lua file — stub it so vitest can parse it
      "@rbxts/services": resolve(__dirname, "packages/testing/src/services-mock.ts"),
    },
  },
  test: {
    globals: true,
    setupFiles: [resolve(__dirname, "test-setup.ts")],
    exclude: ["apps/**", "node_modules/**", "**/node_modules/**", "**/out/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      exclude: [
        "node_modules/**",
        "**/out/**",
        "**/dist/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
        "**/.vscode/**",
        "**/site/**",
        "**/.next/**",
        // Barrel re-export files (no executable logic)
        "**/src/index.ts",
        // Type-only files
        "packages/observability/src/types.ts",
        "packages/shared-types/src/do-action.ts",
        "packages/moderation/src/types.ts",
        // Testing infrastructure (tested indirectly, not production code)
        "packages/testing/src/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 65,
        statements: 80,
      },
    },
  },
});
