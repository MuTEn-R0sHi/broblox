# Tools

Utility scripts and templates for the platform.

## Scripts

### generate-error-catalog.mjs

Generates error code documentation from the `ErrorCode` enum in `@broblox/shared-types`.

```bash
node tools/generate-error-catalog.mjs > docs/reference/error-codes.md
```

### check-testing-sync.mjs

Verifies that the manual copies of `error-codes.ts` and `result.ts` in
`@broblox/testing` stay in sync with the canonical versions in `@broblox/shared-types`.
Runs automatically in CI.

```bash
node tools/check-testing-sync.mjs   # or: pnpm run check:sync
```

## Templates

Coming soon:

- Package template
- Game template
- Module template
- Remote endpoint template

## Scaffolding

Future scripts for:

- Creating new packages
- Creating new games
- Adding remote endpoints
- Setting up new modules
