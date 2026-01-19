# Versioning

This repository uses **Semantic Versioning (SemVer)** for repo releases.

## Repo version

- Release tags look like `vX.Y.Z` (example: `v0.1.0`).
- `X` (**major**): breaking changes in public contracts (network protocol, config schema, dashboard APIs) or large breaking changes in platform packages.
- `Y` (**minor**): new backwards-compatible features.
- `Z` (**patch**): backwards-compatible fixes.

Because this is a monorepo with multiple deliverables (packages + games + dashboard), the tag represents the **coordinated platform release**.

## Protocol versioning

Network/protocol compatibility is additionally governed by:

- `docs/architecture/decisions/0002-network-protocol-versioning.md`

Guideline: a breaking protocol bump implies a major release tag.

## Changelog

- Keep user-facing changes in `CHANGELOG.md` under **Unreleased**.
- When cutting a release, move entries from **Unreleased** into a new section for that version.
