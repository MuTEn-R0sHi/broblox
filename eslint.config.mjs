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
      "**/.next/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Dependency direction enforcement for packages
  {
    files: ["packages/shared-types/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@broblox/core", "@broblox/core/*"],
              message: "shared-types must not depend on core",
            },
            {
              group: ["@broblox/net", "@broblox/net/*"],
              message: "shared-types must not depend on net",
            },
            {
              group: ["@broblox/config-featureflags", "@broblox/config-featureflags/*"],
              message: "shared-types must not depend on config-featureflags",
            },
            {
              group: ["@broblox/game-*", "@broblox/game-*/*"],
              message: "packages must not depend on games",
            },
            {
              group: ["@rbxts/services"],
              message: "shared-types must not depend on Roblox services",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@broblox/net", "@broblox/net/*"], message: "core must not depend on net" },
            {
              group: ["@broblox/config-featureflags", "@broblox/config-featureflags/*"],
              message: "core must not depend on config-featureflags",
            },
            {
              group: ["@broblox/game-*", "@broblox/game-*/*"],
              message: "packages must not depend on games",
            },
            {
              group: ["@rbxts/services"],
              message: "core should not depend on Roblox services directly",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/net/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@broblox/config-featureflags", "@broblox/config-featureflags/*"],
              message: "net must not depend on config-featureflags",
            },
            {
              group: ["@broblox/game-*", "@broblox/game-*/*"],
              message: "packages must not depend on games",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/config-featureflags/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@broblox/net", "@broblox/net/*"],
              message: "config-featureflags must not depend on net",
            },
            {
              group: ["@broblox/game-*", "@broblox/game-*/*"],
              message: "packages must not depend on games",
            },
          ],
        },
      ],
    },
  },
];
