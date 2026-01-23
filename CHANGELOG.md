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
- **MIT License** for open-source distribution.
- **Package README files** with comprehensive API documentation for all packages.
- **Build verification in CI** - packages and starter game are now built in CI pipeline.
- **Pre-commit hooks** using simple-git-hooks and lint-staged for automatic linting and formatting.
- **Test coverage configuration** with vitest, including coverage thresholds (50% minimum).
- **VSCode workspace settings** with recommended extensions, tasks, and editor configuration.
- **Tools directory** with error catalog generator script.
- **Error code reference documentation** auto-generated from ErrorCode enum.
- **Enhanced CONTRIBUTING.md** with detailed workflow, commit conventions, and branch protection info.

### Changed

- Consolidated docs workflows into single `docs-deploy-limacity.yml` (removed redundant `docs.yml`).
- Bumped GitHub Actions to v6 (checkout, setup-node, setup-python).
- **README.md** now includes MIT license info and build workflow documentation.
- **@rbx/net** now imports types from `@rbx/shared-types` instead of duplicating them.
- **.gitignore** updated with better patterns for coverage, VSCode settings, and build outputs.

### Removed

- **Duplicate types file** (`packages/net/src/types.ts`) - types now imported from @rbx/shared-types.
