# Docs deployment

This repo does **not** use GitHub Pages.

MkDocs builds a static site into `site/`, which we deploy to our web host (currently lima-city).

## Local preview

- `python -m venv .venv`
- `source .venv/bin/activate`
- `pip install -r requirements-docs.txt`
- `mkdocs serve`

## CI build & deploy

Workflow: `.github/workflows/docs-deploy-limacity.yml`

- Runs on pushes to `main` and `workflow_dispatch`.
- Builds MkDocs and mirrors `site/` to lima-city via `lftp` with `--parallel=10` for faster uploads.

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
