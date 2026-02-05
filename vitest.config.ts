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
      "@rbx/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@rbx/observability": resolve(__dirname, "packages/observability/src/index.ts"),
    },
  },
  test: {
    globals: true,
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
