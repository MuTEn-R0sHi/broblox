import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/font/google": path.resolve(__dirname, "./__mocks__/next-font.ts"),
    },
  },
  test: {
    name: "dashboard",
    environment: "jsdom",
    globals: true,
  },
});
