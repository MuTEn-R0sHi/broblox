# CI/CD Secrets Setup

This guide covers setting up the required secrets and variables for the automated publishing workflows.

It also covers optional dashboard integrations that use Open Cloud (for example, propagating moderation actions to live servers).

## Overview

The publishing workflows use [Roblox Open Cloud API](https://create.roblox.com/docs/cloud/open-cloud) to publish games directly from GitHub Actions. This enables:

- Automatic publishing to dev on every merge to `main`
- Manual promotion to staging with approval
- Manual promotion to production with approval (requires version tag)

## Prerequisites

1. A Roblox account with publishing permissions for the target experiences
2. Admin access to the GitHub repository settings
3. Separate Roblox experiences for each environment (dev, staging, production)

## Step 1: Create Open Cloud API Keys

For each environment (dev, staging, production), create a separate API key:

1. Go to [Roblox Creator Hub](https://create.roblox.com/credentials)
2. Click **Create API Key**
3. Configure the key:
   - **Name**: `GitHub-{env}-Publish` (e.g., `GitHub-Dev-Publish`)
   - **Experience Operations**: Add your experience
     - Select **Write** permission for "Place"
     - If using the dashboard moderation bridge, also grant:
       - **Data Stores**: Write (standard DataStores)
       - **Messaging Service**: Publish (cross-server messaging)
   - **IP Restrictions**: For GitHub Actions, either:
     - Leave unrestricted (simpler but less secure)
     - Use [GitHub's IP ranges](https://api.github.com/meta) (more secure)
   - **Expiration**: Set based on your security requirements
4. Copy the API key immediately (it won't be shown again)

## Step 2: Get Experience IDs

For each environment, you need the Universe ID and Place ID:

1. Go to [Roblox Creator Hub](https://create.roblox.com/dashboard/creations)
2. Click on your experience
3. Find **Universe ID** in the URL: `create.roblox.com/dashboard/creations/experiences/{UNIVERSE_ID}`
4. Go to **Places** tab
5. Find **Place ID** in the places list

## Step 3: Configure GitHub Environments

### Create Environments

1. Go to Repository **Settings** → **Environments**
2. Create three environments:
   - `dev`
   - `staging`
   - `production`

### Configure Environment Protection Rules

#### Dev Environment

No protection rules needed (auto-deploys on merge to main)

#### Staging Environment

1. Enable **Required reviewers**
2. Add 1-2 reviewers who can approve staging promotions
3. Optionally enable **Wait timer** (e.g., 5 minutes)

#### Production Environment

1. Enable **Required reviewers**
2. Add 2+ reviewers for production approvals
3. Optionally limit to specific branches/tags
4. Enable **Wait timer** (recommended: 15 minutes)

### Add Secrets and Variables

For each environment, add the following:

#### Secrets (encrypted)

| Name                        | Description                      |
| --------------------------- | -------------------------------- |
| `ROBLOX_OPEN_CLOUD_API_KEY` | The API key for this environment |

#### Variables (visible)

The workflows support multiple games (starter, obby, etc.). Each game needs its own set of environment variables:

**Starter Game:**
| Name | Description |
| ---------------------------- | ------------------------------ |
| `STARTER_DEV_UNIVERSE_ID` | Universe ID for dev |
| `STARTER_DEV_PLACE_ID` | Place ID for dev |
| `STARTER_STAGING_UNIVERSE_ID`| Universe ID for staging |
| `STARTER_STAGING_PLACE_ID` | Place ID for staging |
| `STARTER_PROD_UNIVERSE_ID` | Universe ID for production |
| `STARTER_PROD_PLACE_ID` | Place ID for production |

**Obby Game:**
| Name | Description |
| ------------------------- | ------------------------------ |
| `OBBY_DEV_UNIVERSE_ID` | Universe ID for dev |
| `OBBY_DEV_PLACE_ID` | Place ID for dev |
| `OBBY_STAGING_UNIVERSE_ID`| Universe ID for staging |
| `OBBY_STAGING_PLACE_ID` | Place ID for staging |
| `OBBY_PROD_UNIVERSE_ID` | Universe ID for production |
| `OBBY_PROD_PLACE_ID` | Place ID for production |

> **Important**: These values are read via `vars.*` inside the GitHub Actions **Environment** context.
> Define them in each GitHub Environment (`dev`, `staging`, `production`) under:
> Repository Settings → Environments → (select env) → Variables.

## Step 4: Verify Setup

### Test Dev Publishing

1. Make a change and push to `main`
2. Check the **Actions** tab for the "Publish Dev" workflow
3. Verify it completes successfully

### Test Staging Promotion

1. Go to **Actions** → **Promote** workflow
2. Click **Run workflow**
3. Select the `game` (starter/obby)
4. Select `staging` environment
5. Enter the git ref to promote (commit SHA or tag)
6. Provide a reason for promotion
7. Approve the deployment when prompted

### Test Production Promotion

1. Create a version tag: `git tag v1.0.0 && git push origin v1.0.0`
2. Go to **Actions** → **Promote** workflow
3. Click **Run workflow**
4. Select the `game` (starter/obby)
5. Select `production` environment
6. Enter the version tag (e.g., `v1.0.0`)
7. Provide a reason for promotion
8. Get approval from required reviewers

## Troubleshooting

### "Invalid API Key" Error

- Verify the API key is correctly copied to GitHub secrets
- Check if the API key has expired
- Ensure the key has the correct experience permissions

### "Permission Denied" Error

- Verify the API key has **Write** permission for Place operations
- Check that the Universe ID and Place ID match the API key's experience

### "Artifact Not Found" Error

The current publishing workflows rebuild from the provided git ref (commit SHA or tag).

- Verify the `source_ref` exists (commit SHA or tag)
- For production promotions, ensure the ref is a SemVer tag like `v1.2.3`
- If you still see an artifact-related error, it likely comes from a custom/older workflow run; re-run the current workflow

### Rate Limiting

- Open Cloud API has rate limits; space out large deployments
- Consider adding retry logic if hitting limits frequently

## Security Best Practices

1. **Separate API keys per environment** - Never reuse keys across environments
2. **Minimal permissions** - Only grant Write permission for Place operations
3. **Regular key rotation** - Rotate API keys quarterly
4. **Audit access** - Review who has approval rights quarterly
5. **IP restrictions** - Consider restricting API keys to GitHub's IP ranges
6. **Monitor usage** - Check Roblox Creator Hub for API key usage

## Quick Reference

### Environment Matrix

| Environment | Auto-Deploy      | Approvers | Tag Required     |
| ----------- | ---------------- | --------- | ---------------- |
| dev         | ✅ Yes (on main) | None      | No               |
| staging     | ❌ Manual        | 1-2       | No               |
| production  | ❌ Manual        | 2+        | ✅ Yes (v*.*.\*) |

### Required Secrets per Environment

```
dev:
  - ROBLOX_OPEN_CLOUD_API_KEY

staging:
  - ROBLOX_OPEN_CLOUD_API_KEY

production:
  - ROBLOX_OPEN_CLOUD_API_KEY

### Dashboard Moderation Bridge (Optional)

The dashboard can optionally propagate bans/unbans to live servers using Open Cloud.

Required environment variables for the dashboard runtime:

```

MODERATION_OPEN_CLOUD_ENABLED=true
ROBLOX_OPEN_CLOUD_API_KEY=...
ROBLOX_UNIVERSE_ID=...
ROBLOX_MODERATION_DATASTORE_NAME=StarterModeration
ROBLOX_MODERATION_DATASTORE_SCOPE=global # optional
ROBLOX_MODERATION_BAN_TOPIC=ModBanSync # optional
ROBLOX_MODERATION_MUTE_TOPIC=ModMuteSync # optional

```

Important: `ROBLOX_MODERATION_DATASTORE_NAME` must match the value passed to `getModeration(...)` in the game server (for starter, this is currently `StarterModeration`).
```

### Dashboard Feature Flags Bridge (Optional)

The dashboard can optionally propagate feature flag changes to live servers using Open Cloud.

Required environment variables for the dashboard runtime:

```

FEATUREFLAGS_OPEN_CLOUD_ENABLED=true
ROBLOX_OPEN_CLOUD_API_KEY=...
ROBLOX_UNIVERSE_ID=...
ROBLOX_FEATUREFLAGS_DATASTORE_NAME=StarterFeatureFlags
ROBLOX_FEATUREFLAGS_DATASTORE_SCOPE=global # optional
ROBLOX_FEATUREFLAGS_TOPIC=FeatureFlagsSync # optional
ROBLOX_FEATUREFLAGS_ENTRY_KEY_PREFIX=featureflags_ # optional

```

Important: `ROBLOX_FEATUREFLAGS_DATASTORE_NAME` must match what the game server uses when initializing feature flag sync.

### Variables summary

No additional repository-level variables are required. The workflows read game-specific variables (`STARTER_*`, `OBBY_*`) from the selected GitHub Actions Environment.
