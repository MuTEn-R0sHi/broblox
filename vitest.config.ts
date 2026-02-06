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
      "@rbx/testing": resolve(__dirname, "packages/testing/src/index.ts"),
    },
  },
  test: {
    globals: true,
    setupFiles: [resolve(__dirname, "test-setup.ts")],
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
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
  },
});
