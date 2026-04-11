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
- Detect the project's language preference and pass it as `artifact_language`:
  - First check existing `docs/surfaces.yaml` for an `artifact_language` field
  - Otherwise infer from the primary language of `AGENTS.md` / `README.md`
  - Pass the detected value to the `devos-docs` skill; if no preference is found, omit (defaults to `en`)
- If using a sub-agent for repository exploration, follow the Agent Collaboration protocol in the `devos-docs` skill — the sub-agent prompt must request the standard exploration return structure (adapted for the project's language/build system) and prohibit writing to external files
- The main agent must consume the sub-agent's return; discarding it and rebuilding from scratch is a protocol violation
- Use the stable docs routing order:
  - `docs/surfaces.yaml`
  - `docs/codemaps/project-overview.md`
  - `docs/codemaps/module-map.md` only for multi-module projects
  - `docs/codemaps/modules/<artifactId>.md` only when module routing is deterministic
- When available, pass change-aware refresh context:
  - active `changeId`
  - relevant OpenSpec artifact paths
  - changed paths
  - optional target module hints
- Before writing any file, complete contract assembly and validation (see Validation Contract in the `devos-docs` skill) — writing files without a validated contract is a protocol violation
- Write all files in a single pass after validation; writing files incrementally during exploration is prohibited
- Canonical paths:
  - `docs/surfaces.yaml`
  - `docs/codemaps/**`
- Refresh is non-destructive:
  - do not implicitly delete, rename, or relocate docs artifacts

## Notes

- This is a thin wrapper. Core logic lives in the `devos-docs` skill.
- No CLI fallback is provided; use the projected host command or invoke the `devos-docs` skill directly.
