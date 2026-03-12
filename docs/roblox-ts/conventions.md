# Roblox-TS: Conventions

## TypeScript strictness

- Prefer strict TypeScript settings for shared packages.
- Avoid `any`.
- Use branded types for ids (`PlayerId`, `MatchId`) to prevent mixups.

## Monorepo package rules

- Each `@broblox/*` package compiles independently with `--type package`
- Games compile with `--type game` to get RuntimeLib requires
- Package `types` field points to `out/index.d.ts` (compiled declarations)
- Packages should not import from other `@broblox/*` packages at compile time (inline shared types if needed)

## Package Configuration (Critical)

Every `@broblox/*` package **must** have proper configuration for both Node.js (vitest) and roblox-ts:

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
  "@broblox": {
    "$className": "Folder",
    "shared-types": {
      "$className": "Folder",
      "out": {
        "$path": "node_modules/@broblox/shared-types/out"
      }
    }
  }
}
```

**Why nested?** The compiled Luau does `TS.getModule(script, "@broblox", "shared-types").out` - it expects `.out` to be a child of the package folder.

## File naming

The codebase uses two naming conventions for TypeScript source files:

- **Packages** (`packages/*/src/`): **kebab-case** — e.g. `create-inventory-service.ts`, `hit-validation.ts`, `obstacle-manager.ts`.
- **Games** (`games/*/src/`): **PascalCase** — e.g. `InventoryService.ts`, `RemoteController.ts`, `StageService.ts`.

This split is intentional:

- Packages are reusable libraries with multiple source files per concern (factory, store, registry, types). Kebab-case matches the npm/Node.js ecosystem convention and keeps filenames visually distinct from their default exports.
- Game services and controllers are singletons — one file per service/controller. PascalCase matches the exported const name (`export const InventoryService: Service = { ... }`), making it easy to locate by name.

Both layers are consistent within themselves. New files should follow the convention of the layer they belong to.

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
