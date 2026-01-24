# CI/CD Secrets Setup

This guide covers setting up the required secrets and variables for the automated publishing workflows.

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

| Name                                                           | Description                     |
| -------------------------------------------------------------- | ------------------------------- |
| `DEV_UNIVERSE_ID` / `STAGING_UNIVERSE_ID` / `PROD_UNIVERSE_ID` | Universe ID for the environment |
| `DEV_PLACE_ID` / `STAGING_PLACE_ID` / `PROD_PLACE_ID`          | Place ID for the environment    |

> **Note**: Use repository-level variables with environment-specific prefixes (DEV*, STAGING*, PROD\_) so workflows can reference them based on the target environment.

## Step 4: Verify Setup

### Test Dev Publishing

1. Make a change and push to `main`
2. Check the **Actions** tab for the "Publish Dev" workflow
3. Verify it completes successfully

### Test Staging Promotion

1. Go to **Actions** → **Promote** workflow
2. Click **Run workflow**
3. Select `staging` environment
4. Enter the commit SHA from a successful dev build
5. Provide a reason for promotion
6. Approve the deployment when prompted

### Test Production Promotion

1. Create a version tag: `git tag v1.0.0 && git push origin v1.0.0`
2. Go to **Actions** → **Promote** workflow
3. Click **Run workflow**
4. Select `production` environment
5. Enter the version tag (e.g., `v1.0.0`)
6. Provide a reason for promotion
7. Get approval from required reviewers

## Troubleshooting

### "Invalid API Key" Error

- Verify the API key is correctly copied to GitHub secrets
- Check if the API key has expired
- Ensure the key has the correct experience permissions

### "Permission Denied" Error

- Verify the API key has **Write** permission for Place operations
- Check that the Universe ID and Place ID match the API key's experience

### "Artifact Not Found" Error

- Ensure a build artifact exists for the specified ref
- Check if the artifact has expired (30-day retention)
- Verify the artifact name matches the expected pattern

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
```

### Required Variables (Repository Level)

```
DEV_UNIVERSE_ID
DEV_PLACE_ID
STAGING_UNIVERSE_ID
STAGING_PLACE_ID
PROD_UNIVERSE_ID
PROD_PLACE_ID
```
