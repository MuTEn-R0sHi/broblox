# Contributing

This repo is **docs-first**: architecture and invariants are defined in `docs/`.

## Principles

- **Client is untrusted.** Client sends intent; server decides outcomes.
- **Networking is an API.** All remotes are registry-defined, schema-validated, and rate-limited.
- **Idempotency for grants.** Purchases/rewards/match results must be idempotent.
- **Privileged actions are audited.** Dashboard/admin/publish operations must emit immutable audit logs.

See `copilot-instructions.md` for binding invariants.

## Development Workflow

### 1. Set up your environment

```bash
# Install dependencies
pnpm install

# Set up pre-commit hooks
pnpm prepare
```

### 2. Create a branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 3. Make changes

Follow our conventions:

- Use TypeScript strict mode
- Write tests for new functionality
- Update documentation as needed
- Follow the architecture patterns in `docs/architecture/`

### 4. Test your changes

```bash
# Lint
pnpm lint

# Type check
pnpm typecheck

# Run tests
pnpm test

# Build packages
pnpm run build:packages

# Build starter game
pnpm run build:starter
```

### 5. Commit conventions

We use conventional commits, enforced by **commitlint** on the `commit-msg` hook:

```
feat: add new feature
fix: bug fix
docs: documentation changes
chore: maintenance tasks
refactor: code refactoring
test: test additions or updates
ci: CI/CD changes
perf: performance improvements
build: build system changes
style: code style (formatting, semicolons, etc.)
revert: revert a previous commit
```

Examples:

- `feat(net): add rate limiting to handshake remote`
- `fix(core): janitor cleanup race condition`
- `docs(architecture): update networking diagram`
- `chore(deps): bump roblox-ts to 3.0.1`

> **Note**: Subject must be lowercase, no period at end, max 100 characters.

### 6. Open a Pull Request

- Ensure all CI checks pass
- Fill out the PR template
- Request reviews
- Link related issues

## Branch Protection

The `main` branch is protected with the following requirements:

- ✅ All CI checks must pass
- ✅ At least one approval required
- ✅ No force push allowed
- ✅ Branch must be up to date before merge

## Pre-commit Hooks

We use `simple-git-hooks` to run checks automatically:

**pre-commit:**

- ESLint auto-fix on TypeScript/JavaScript files
- Prettier formatting on all supported files

**commit-msg:**

- Commitlint validation for conventional commit format

These run automatically. If they fail, fix the issues and retry your commit.

## Docs + ADRs

- If you change **networking, security, data/persistence, CI/CD, dashboard privileges, or release flow**:
  - update the relevant doc pages under `docs/`
  - add/update an ADR under `docs/architecture/decisions/` when the decision is hard to reverse or breaks compatibility

## Versioning + changelog

- Add an entry to `CHANGELOG.md` under **Unreleased** for user-facing changes.
- For breaking network/protocol changes, follow ADR-0002 and bump the protocol version.

## Code Review Guidelines

When reviewing PRs:

- Check for adherence to architecture principles
- Verify security invariants are maintained
- Ensure tests cover new functionality
- Confirm documentation is updated
- Look for performance implications

## Getting Help

- Check `docs/` for architecture guidance
- See `docs/reference/troubleshooting.md` for common issues
- Review existing ADRs for past decisions
- Ask questions in PR comments
