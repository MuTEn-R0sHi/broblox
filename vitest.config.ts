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
      "@rbx/shared-types": resolve(__dirname, "packages/shared-types/src/index.ts"),
      "@rbx/constants": resolve(__dirname, "packages/constants/src/index.ts"),
      "@rbx/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@rbx/config-featureflags": resolve(__dirname, "packages/config-featureflags/src/index.ts"),
      "@rbx/net": resolve(__dirname, "packages/net/src/index.ts"),
      "@rbx/data": resolve(__dirname, "packages/data/src/index.ts"),
      "@rbx/security": resolve(__dirname, "packages/security/src/index.ts"),
      "@rbx/observability": resolve(__dirname, "packages/observability/src/index.ts"),
      "@rbx/combat": resolve(__dirname, "packages/combat/src/index.ts"),
      "@rbx/matchmaking": resolve(__dirname, "packages/matchmaking/src/index.ts"),
      "@rbx/moderation": resolve(__dirname, "packages/moderation/src/index.ts"),
      "@rbx/movement": resolve(__dirname, "packages/movement/src/index.ts"),
      "@rbx/codes": resolve(__dirname, "packages/codes/src/index.ts"),
      "@rbx/leaderboards": resolve(__dirname, "packages/leaderboards/src/index.ts"),
      "@rbx/analytics": resolve(__dirname, "packages/analytics/src/index.ts"),
      "@rbx/events": resolve(__dirname, "packages/events/src/index.ts"),
      "@rbx/notifications": resolve(__dirname, "packages/notifications/src/index.ts"),
      "@rbx/inventory": resolve(__dirname, "packages/inventory/src/index.ts"),
      "@rbx/progression": resolve(__dirname, "packages/progression/src/index.ts"),
      "@rbx/quests": resolve(__dirname, "packages/quests/src/index.ts"),
      "@rbx/rewards": resolve(__dirname, "packages/rewards/src/index.ts"),
      "@rbx/pets": resolve(__dirname, "packages/pets/src/index.ts"),
      "@rbx/gacha": resolve(__dirname, "packages/gacha/src/index.ts"),
      "@rbx/cosmetics": resolve(__dirname, "packages/cosmetics/src/index.ts"),
      "@rbx/battle-pass": resolve(__dirname, "packages/battle-pass/src/index.ts"),
      "@rbx/localization": resolve(__dirname, "packages/localization/src/index.ts"),
      "@rbx/audio": resolve(__dirname, "packages/audio/src/index.ts"),
      "@rbx/tutorial": resolve(__dirname, "packages/tutorial/src/index.ts"),
      "@rbx/world-systems": resolve(__dirname, "packages/world-systems/src/index.ts"),
      "@rbx/input": resolve(__dirname, "packages/input/src/index.ts"),
      "@rbx/ui": resolve(__dirname, "packages/ui/src/index.ts"),
      "@rbx/marketplace": resolve(__dirname, "packages/marketplace/src/index.ts"),
      "@rbx/testing": resolve(__dirname, "packages/testing/src/index.ts"),
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
