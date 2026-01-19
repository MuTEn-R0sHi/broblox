# Docs deployment

This repo does **not** use GitHub Pages.

MkDocs builds a static site into `site/`, which we deploy to our web host (currently lima-city).

## Local preview

- `python -m venv .venv`
- `source .venv/bin/activate`
- `pip install -r requirements-docs.txt`
- `mkdocs serve`

## CI build (validation)

Workflow: `.github/workflows/docs.yml`

- Runs `mkdocs build` on PRs and pushes.
- Does not upload artifacts (GitHub Actions storage quota can be limited).

## Deploy to lima-city

Workflow: `.github/workflows/docs-deploy-limacity.yml`

It builds MkDocs and mirrors `site/` to your webspace via `lftp`.

Required GitHub repo secrets:

- `LIMACITY_PROTOCOL`: `ftps`
- `LIMACITY_HOST`: e.g. `roshi.lima-ftp.de`
- `LIMACITY_PORT`: `21` (optional)
- `LIMACITY_USER`: your FTP username
- `LIMACITY_PASS`: your FTP password
- `LIMACITY_REMOTE_DIR`: your webspace directory (e.g. `broblox-games.com`)

Notes:

- lima-city uses **explicit FTPS** on port 21 (TLS via `AUTH TLS`).
- If the deploy succeeds but the website is blank/404, the most common cause is that `LIMACITY_REMOTE_DIR` should be a deeper document root (e.g. `.../html` or `.../htdocs`).
