# Releasing

This repo releases by tagging SemVer versions. Releases are automatically published to Roblox via the Open Cloud API.

## Quick Reference

| Environment | Trigger         | Approval      | Version Required |
| ----------- | --------------- | ------------- | ---------------- |
| Dev         | Push to `main`  | None          | No               |
| Staging     | Manual workflow | 1-2 reviewers | No               |
| Production  | Manual workflow | 2+ reviewers  | Yes (tag)        |

## Release Checklist

1. Ensure green CI on `main`
2. Verify dev deployment succeeded (auto-deployed on merge)
3. Bump package versions in `package.json` files (use consistent version across all packages in the same phase)
4. Update `CHANGELOG.md`:
   - Move entries from **Unreleased** to a new version heading `## X.Y.Z`
   - Add release date
5. Create and push a version tag:

```bash
git pull
git tag v0.2.0
git push origin v0.2.0
```

6. Promote to staging (optional testing phase):
   - Go to Actions → Promote workflow
   - Select `staging` environment
   - Enter the commit SHA or tag
   - Provide a reason for promotion
   - Wait for approval

7. Promote to production:
   - Go to Actions → Promote workflow
   - Select `production` environment
   - Enter the version tag (e.g., `v0.2.0`)
   - Provide a reason for promotion
   - Wait for approval (requires 2+ reviewers)

## Automated Publishing

### Dev Environment (Automatic)

On every push to `main`:

1. Build packages and game
2. Generate `.rbxl` file with Rojo
3. Publish to dev experience via Open Cloud API

### Staging/Production (Manual Promotion)

The promote workflow rebuilds from a chosen git ref (commit SHA or tag) and publishes it:

```
GitHub Actions → Promote → [staging|production]
```

Key features:

- **Pinned ref promotions** - Promote by specifying the exact commit SHA or tag
- **Approval gates** - Required reviewers must approve before deployment
- **Audit trail** - All promotions are logged with actor, reason, and timestamp
- **Production requires tags** - Must use semantic version tag (e.g., `v1.0.0`)

## What Happens on Tag Push

1. GitHub Actions creates a GitHub Release for the tag
2. Release notes are generated automatically by GitHub
3. Tag is ready to be used as a promotion `source_ref`

## Rollback Procedure

If you need to rollback a production deployment:

1. Identify the previous good version tag
2. Go to Actions → Promote workflow
3. Select `production` environment
4. Enter the previous version tag
5. Reason: "Rollback from vX.Y.Z due to [issue]"
6. Get approval from required reviewers

## Setup Requirements

Before using automated publishing, ensure:

- Roblox Open Cloud API keys are configured
- GitHub Environments (dev, staging, production) are set up
- Required secrets and variables are added

See [CI/CD Secrets Setup](docs/reference/ci-cd-secrets.md) for detailed instructions.

## Troubleshooting

### Dev publish failing

Check the "Publish Dev" workflow logs for:

- API key validity
- Experience ID correctness
- Network/rate limiting issues

### Promotion workflow can't find artifact

The current promote workflow rebuilds from a git ref, so there is no separate build artifact to look up.

- Verify the `source_ref` exists (commit SHA or tag)
- For production, ensure the ref is a SemVer tag like `v1.2.3`
- If the publish step fails, check Open Cloud credentials and target universe/place IDs

### Production promotion rejected

- Ensure you're using a version tag (not a commit SHA)
- Verify tag exists: `git tag -l | grep v1.0.0`
- Get approval from required reviewers
