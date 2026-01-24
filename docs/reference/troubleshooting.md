# Reference: Troubleshooting

## MkDocs

- If MkDocs fails to start:
  - ensure `.venv` is activated
  - ensure `pip install -r requirements-docs.txt` succeeded

## Roblox-TS Runtime Errors

### "attempt to index nil with 'import'"

```
ServerScriptService.server.main:9: attempt to index nil with 'import'
```

**Cause**: Package is missing `"rbxts": { "type": "package" }` in tsconfig.roblox.json

**Fix**: Add to each package's `tsconfig.roblox.json`:

```jsonc
{
  "rbxts": {
    "type": "package",
  },
}
```

Then rebuild: `pnpm run build:packages`

### "out is not a valid member of ModuleScript"

```
out is not a valid member of ModuleScript "ReplicatedStorage.include.node_modules.@rbx.shared-types"
```

**Cause**: Rojo project.json has incorrect package path structure

**Fix**: Packages need nested `out` folder in Rojo config:

```json
// ❌ Wrong - flat structure
"shared-types": {
  "$path": "node_modules/@rbx/shared-types/out"
}

// ✅ Correct - nested out folder
"shared-types": {
  "$className": "Folder",
  "out": {
    "$path": "node_modules/@rbx/shared-types/out"
  }
}
```

### "Could not find Rojo data" during build

```
error TS roblox-ts: Could not find Rojo data. There is no $path in your Rojo config that covers node_modules/@rbx/constants/src/init.luau
```

**Cause**: Package's `package.json` has `"main": "src/index.ts"` instead of `"main": "out"`

**Fix**: Update the package's `package.json`:

```json
{
  "main": "out",
  "types": "out/index.d.ts"
}
```

See [Roblox-TS Conventions](../roblox-ts/conventions.md#package-configuration-critical) for full configuration requirements.

## Studio + Rojo

- Studio cannot connect to Rojo:
  - confirm Rojo server is running (`pnpm run game:starter:rojo`)
  - confirm the Rojo Studio plugin is installed
  - check firewall isn't blocking port 34872

- Changes not syncing:
  - rebuild packages first: `pnpm run build:packages`
  - regenerate sourcemap: `rojo sourcemap default.project.json -o sourcemap.json`

## "Works locally, fails in production"

Common causes:

- missing schema validation on server
- environment config mismatch (dev/stage/prod)
- relying on client state for authority

## PvP fairness issues

- Confirm server computes outcomes.
- Confirm hit validation is server-side.
- Confirm rate limits are active on combat remotes.
