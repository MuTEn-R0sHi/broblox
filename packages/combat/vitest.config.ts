import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@rbx/shared-types": path.resolve(__dirname, "../shared-types/src/index.ts"),
      "@rbx/core": path.resolve(__dirname, "../core/src/index.ts"),
      "@rbx/testing": path.resolve(__dirname, "../testing/src/index.ts"),
    },
  },
});
