# devos-docs-refresh

Refresh existing project documentation using the `devos-docs` skill.

## What this does

- Updates `docs/surfaces.yaml` when the external surface changes
- Updates `docs/codemaps/project-overview.md` to match the current structure
- Preserves existing docs artifacts where possible

## Mode

`refresh`

## How to use

Run this command when:

- code structure has evolved
- new modules or surfaces have been added
- existing docs are out of date

## Implementation

- Invoke the `devos-docs` skill with `mode=refresh`
- Canonical paths:
  - `docs/surfaces.yaml`
  - `docs/codemaps/**`
- Validation:
  - results must pass the existing docs contract before writeback
- Refresh is non-destructive:
  - do not implicitly delete, rename, or relocate docs artifacts

## Notes

- This is a thin wrapper. Core logic lives in the `devos-docs` skill.
- If host commands are unavailable, fall back to `praxis-devos docs refresh`.
