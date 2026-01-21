import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/build/**",
      "**/site/**",
      "**/.next/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ]
    }
  },
  // Dependency direction enforcement for packages
  {
    files: ["packages/shared-types/src/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@rbx/core", "@rbx/core/*"], message: "shared-types must not depend on core" },
          { group: ["@rbx/net", "@rbx/net/*"], message: "shared-types must not depend on net" },
          { group: ["@rbx/config-featureflags", "@rbx/config-featureflags/*"], message: "shared-types must not depend on config-featureflags" },
          { group: ["@rbx/game-*", "@rbx/game-*/*"], message: "packages must not depend on games" },
          { group: ["@rbxts/services"], message: "shared-types must not depend on Roblox services" }
        ]
      }]
    }
  },
  {
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@rbx/net", "@rbx/net/*"], message: "core must not depend on net" },
          { group: ["@rbx/config-featureflags", "@rbx/config-featureflags/*"], message: "core must not depend on config-featureflags" },
          { group: ["@rbx/game-*", "@rbx/game-*/*"], message: "packages must not depend on games" },
          { group: ["@rbxts/services"], message: "core should not depend on Roblox services directly" }
        ]
      }]
    }
  },
  {
    files: ["packages/net/src/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@rbx/config-featureflags", "@rbx/config-featureflags/*"], message: "net must not depend on config-featureflags" },
          { group: ["@rbx/game-*", "@rbx/game-*/*"], message: "packages must not depend on games" }
        ]
      }]
    }
  },
  {
    files: ["packages/config-featureflags/src/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@rbx/net", "@rbx/net/*"], message: "config-featureflags must not depend on net" },
          { group: ["@rbx/game-*", "@rbx/game-*/*"], message: "packages must not depend on games" }
        ]
      }]
    }
  }
];
