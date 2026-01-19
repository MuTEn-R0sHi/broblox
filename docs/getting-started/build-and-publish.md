# Getting started: Build & publish

This page defines the release model, even before code exists.

## Environments

- **dev**: auto-published on merge to `main`
- **stage**: manual approval gate; used for QA and canary
- **prod**: tagged releases only; must support rollback

## Artifact philosophy

Build once, promote the same artifact.

- Roblox-TS compile output + Rojo project files form a reproducible build.
- Promotion should not rebuild gameplay code; it should publish the exact same artifact.

## Open Cloud usage

- CI uses Open Cloud to publish versions and promote between environments.
- Credentials are stored in GitHub environments (dev/stage/prod) with required reviewers.

## Rollback expectations

- Every prod release has a rollback path to the previous known-good version.
- A global kill-switch exists (feature flags) to disable:
  - ranked matchmaking
  - trading/economy features
  - specific weapons/abilities

## Audit

- Every publish/promote action must emit an audit log event (dashboard stores this).
