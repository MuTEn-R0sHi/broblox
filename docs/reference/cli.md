# Reference: CLI

Available commands for development, testing, and documentation.

## Development

```bash
pnpm install              # Install all dependencies
pnpm run build:packages   # Compile all roblox-ts packages
pnpm run build:starter    # Build starter game (builds packages first)
pnpm run game:starter:dev # Watch mode for development
pnpm run game:starter:rojo # Start Rojo server for Studio sync
```

## Quality

```bash
pnpm lint                 # Run ESLint across all packages
pnpm typecheck            # Run TypeScript/roblox-ts type checking
pnpm test                 # Run all tests with vitest
pnpm test:coverage        # Run tests with coverage report
```

## Documentation

```bash
mkdocs serve              # Local docs preview (http://127.0.0.1:8000)
mkdocs build              # Build static docs site
```

## Per-package commands

```bash
pnpm --filter @rbx/net test       # Test a single package
pnpm --filter @rbx/core typecheck # Typecheck a single package
```
