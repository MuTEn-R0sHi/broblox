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
