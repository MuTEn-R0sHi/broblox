# Contributing

This repo is **docs-first**: architecture and invariants are defined in `docs/`.

## Principles

- **Client is untrusted.** Client sends intent; server decides outcomes.
- **Networking is an API.** All remotes are registry-defined, schema-validated, and rate-limited.
- **Idempotency for grants.** Purchases/rewards/match results must be idempotent.
- **Privileged actions are audited.** Dashboard/admin/publish operations must emit immutable audit logs.

See `copilot-instructions.md` for binding invariants.

## Workflow

1. Create a branch from `main`.
2. Make changes.
3. Ensure checks pass:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
4. Open a PR.

## Docs + ADRs

- If you change **networking, security, data/persistence, CI/CD, dashboard privileges, or release flow**:
  - update the relevant doc pages under `docs/`
  - add/update an ADR under `docs/architecture/decisions/` when the decision is hard to reverse or breaks compatibility

## Versioning + changelog

- Add an entry to `CHANGELOG.md` under **Unreleased** for user-facing changes.
- For breaking network/protocol changes, follow ADR-0002 and bump the protocol version.
