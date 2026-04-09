# devos-docs-init

Initialize project documentation using the `devos-docs` skill.

## What this does

- Generates `docs/surfaces.yaml`
- Generates `docs/codemaps/project-overview.md`
- Uses deterministic validation before writeback

## Mode

`init`

## How to use

Run this command when:

- setting up docs for the first time
- the project structure has changed significantly

## Implementation

- Invoke the `devos-docs` skill with `mode=init`
- Canonical paths:
  - `docs/surfaces.yaml`
  - `docs/codemaps/**`
- Validation:
  - results must pass the existing docs contract before writeback

## Notes

- This is a thin wrapper. Core logic lives in the `devos-docs` skill.
- If host commands are unavailable, fall back to `praxis-devos docs init`.
