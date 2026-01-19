# Reference: Troubleshooting

## MkDocs

- If MkDocs fails to start:
  - ensure `.venv` is activated
  - ensure `pip install -r requirements-docs.txt` succeeded

## Studio + Rojo (planned)

- Studio cannot connect to Rojo:
  - confirm Rojo server is running
  - confirm the Rojo Studio plugin is installed

## "Works locally, fails in production"

Common causes:

- missing schema validation on server
- environment config mismatch (dev/stage/prod)
- relying on client state for authority

## PvP fairness issues

- Confirm server computes outcomes.
- Confirm hit validation is server-side.
- Confirm rate limits are active on combat remotes.
