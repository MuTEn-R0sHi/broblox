# Releasing

This repo releases by tagging SemVer versions.

## Checklist

1. Ensure green CI on `main`.
2. Update `CHANGELOG.md`:
   - move entries from **Unreleased** to a new version heading `## X.Y.Z`
   - add release date
3. Create a tag and push it:

```bash
git pull
git tag v0.1.0
git push origin v0.1.0
```

## What happens on tag push

- GitHub Actions creates a GitHub Release for the tag.
- Release notes are generated automatically by GitHub (you can edit afterward).
