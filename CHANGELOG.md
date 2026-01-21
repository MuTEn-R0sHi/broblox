# Changelog

All notable changes to this project will be documented in this file.

This project follows **Keep a Changelog** and aims to follow **Semantic Versioning** once we cut the first tagged release.

Notes:

- Platform/API compatibility is also governed by protocol versioning rules in `docs/architecture/decisions/0002-network-protocol-versioning.md`.
- Release flow and environment promotion is governed by `docs/architecture/decisions/0004-ci-publish-promote-open-cloud.md`.

## Unreleased

### Added

- Initial docs site (MkDocs) and architecture plan.
- Monorepo scaffold (pnpm workspaces) for platform packages, starter game, and dashboard.
- CI workflows for JS checks and docs publishing.
- roblox-ts monorepo architecture: packages (`@rbx/*`) compile independently with `--type package`, games consume them via Rojo symlinks.
- Parallel docs deployment to lima-city (`lftp --parallel=10`).
- Dependabot configuration with grouped updates (dev-dependencies, roblox-ts, eslint).
- Branch protection on `main` requiring CI and PR reviews.

### Changed

- Consolidated docs workflows into single `docs-deploy-limacity.yml` (removed redundant `docs.yml`).
- Bumped GitHub Actions to v6 (checkout, setup-node, setup-python).
