# Getting started: Build & publish

This page defines the release model used by this repo.

## Environments

- **dev**: auto-published on merge to `main`
- **staging**: manual approval gate; used for QA and canary
- **production**: tagged releases only; must support rollback

## Artifact philosophy

Build from a pinned ref, then publish.

- Roblox-TS compile output + Rojo project files form a reproducible build.
- Today, promotions rebuild from a specific git ref (commit SHA or tag) and publish that output.
  If/when we add persisted build artifacts, the goal is to promote the exact same artifact between environments.

## Open Cloud usage

- CI uses Open Cloud to publish versions to each environment.
- Credentials are stored in GitHub environments (dev/staging/production) with required reviewers.

## Rollback expectations

- Every prod release has a rollback path to the previous known-good version.
- A global kill-switch exists (feature flags) to disable:
  - ranked matchmaking
  - trading/economy features
  - specific weapons/abilities

## Audit

- Every publish/promote action must emit an audit log event (dashboard stores this).
