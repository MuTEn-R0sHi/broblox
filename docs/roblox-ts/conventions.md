# Roblox-TS: Conventions

## TypeScript strictness

- Prefer strict TypeScript settings for shared packages.
- Avoid `any`.
- Use branded types for ids (`PlayerId`, `MatchId`) to prevent mixups.

## Monorepo package rules

- Each `@rbx/*` package compiles independently with `--type package`
- Games compile with `--type game` to get RuntimeLib requires
- Package `types` field points to `out/index.d.ts` (compiled declarations)
- Packages should not import from other `@rbx/*` packages at compile time (inline shared types if needed)

## Package Configuration (Critical)

Every `@rbx/*` package **must** have proper configuration for both Node.js (vitest) and roblox-ts:

### tsconfig.roblox.json

Must include the `rbxts` section with `type: "package"`:

```jsonc
{
  "compilerOptions": {
    // ... compiler options
  },
  "rbxts": {
    "type": "package", // ⚠️ REQUIRED - without this, packages expect their own RuntimeLib
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"],
}
```

### package.json

Must point `main` to `out` for roblox-ts, with `exports` for Node.js:

```json
{
  "main": "out",
  "types": "out/index.d.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "require": "./src/index.ts",
      "default": "./out"
    }
  }
}
```

- `main: "out"` → roblox-ts uses this to find compiled Luau
- `exports.types/import/require` → Node.js/vitest uses these for testing
- `exports.default` → Fallback for roblox-ts

### Rojo project.json

Package paths need nested `out` folder to match compiled imports:

```json
{
  "@rbx": {
    "$className": "Folder",
    "shared-types": {
      "$className": "Folder",
      "out": {
        "$path": "node_modules/@rbx/shared-types/out"
      }
    }
  }
}
```

**Why nested?** The compiled Luau does `TS.getModule(script, "@rbx", "shared-types").out` - it expects `.out` to be a child of the package folder.

## Folder intent

- `client/`: UI, camera, input, effects, prediction
- `server/`: authority, persistence, matchmaking, validation
- `shared/`: DTOs, schemas, constants, deterministic math

## Error handling

- Use stable error codes for anything crossing boundaries.
- Never leak internal server details to clients.

## Roblox services

- Access services through `game.GetService()` once per module and reuse.
- Treat `Players`, `ReplicatedStorage`, `ServerStorage`, `ServerScriptService` as deliberate boundaries.

## Cleanup

- Everything that connects events must be disconnected on teardown.
- Every controller/service should support stop/dispose.
