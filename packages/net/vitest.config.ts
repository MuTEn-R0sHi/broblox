import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./test-setup.ts"],
  },
  resolve: {
    alias: {
      "@rbxts/t": path.resolve(__dirname, "./src/__mocks__/t-mock.ts"),
      "@rbx/shared-types": path.resolve(__dirname, "../shared-types/src/index.ts"),
      "@rbx/constants": path.resolve(__dirname, "../constants/src/index.ts"),
      "@rbx/testing": path.resolve(__dirname, "../testing/src/index.ts"),
    },
  },
});
