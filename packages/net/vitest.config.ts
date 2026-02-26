import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./test-setup.ts"],
  },
  resolve: {
    alias: {
      "@rbxts/t": path.resolve(__dirname, "../testing/src/t-mock.ts"),
      "@broblox/core": path.resolve(__dirname, "../core/src/index.ts"),
      "@broblox/constants": path.resolve(__dirname, "../constants/src/index.ts"),
      "@broblox/shared-types": path.resolve(__dirname, "../shared-types/src/index.ts"),
      "@broblox/testing": path.resolve(__dirname, "../testing/src/index.ts"),
    },
  },
});
