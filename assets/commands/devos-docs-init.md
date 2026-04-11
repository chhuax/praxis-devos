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
- If using a sub-agent for repository exploration, follow the Agent Collaboration protocol in the `devos-docs` skill — the sub-agent prompt must request the standard exploration return structure and prohibit writing to external files
- The main agent must consume the sub-agent's return; discarding it and rebuilding from scratch is a protocol violation
- Use the stable docs routing order:
  - `docs/surfaces.yaml`
  - `docs/codemaps/project-overview.md`
  - `docs/codemaps/module-map.md` only for multi-module projects
  - `docs/codemaps/modules/<artifactId>.md` only when module routing is deterministic
- Before writing any file, complete contract assembly and validation (see Validation Contract in the `devos-docs` skill) — writing files without a validated contract is a protocol violation
- Write all files in a single pass after validation; writing files incrementally during exploration is prohibited
- Canonical paths:
  - `docs/surfaces.yaml`
  - `docs/codemaps/**`

## Notes

- This is a thin wrapper. Core logic lives in the `devos-docs` skill.
- No CLI fallback is provided; use the projected host command or invoke the `devos-docs` skill directly.
