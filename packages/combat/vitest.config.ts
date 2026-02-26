import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: [path.resolve(__dirname, "../../test-setup.ts")],
  },
  resolve: {
    alias: {
      "@broblox/shared-types": path.resolve(__dirname, "../shared-types/src/index.ts"),
      "@broblox/core": path.resolve(__dirname, "../core/src/index.ts"),
      "@broblox/testing": path.resolve(__dirname, "../testing/src/index.ts"),
    },
  },
});
