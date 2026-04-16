# devos-docs-refresh

Refresh existing project documentation using the `devos-docs` skill.

## What this does

- Updates `docs/surfaces.yaml` when the external surface changes
- Updates `docs/codemaps/project-overview.md` to match the current structure
- Updates module-level codemap docs when structure or responsibilities change
- Aligns documentation with the **current OpenSpec change**

## Mode

`refresh`

## When to use

Run this command when:

- code structure has evolved
- new modules or surfaces have been added
- existing docs are out of date
- an OpenSpec change is being archived (REQUIRED)

## Change-aware refresh (IMPORTANT)

When invoked during an OpenSpec flow, you MUST provide change context:

- active `changeId`
- OpenSpec artifacts:
  - proposal / design / spec / tasks
- changed code paths (if available)
- optional affected module hints

The refresh MUST:

- reflect actual implemented structure after the change
- align with spec and design decisions
- update both:
  - project overview
  - affected module docs

## Implementation

- Invoke the `devos-docs` skill with `mode=refresh`
- Detect `artifact_language`:
  - prefer `docs/surfaces.yaml`
  - fallback to `AGENTS.md` / `README.md`
- Pass change-aware context into the skill:
  - REQUIRED for OpenSpec archive / flow-driven refreshes
  - OPTIONAL for general refresh usage outside an active OpenSpec flow

- Use stable docs routing:
  - `docs/surfaces.yaml`
  - `docs/codemaps/project-overview.md`
  - `docs/codemaps/module-map.md` (multi-module)
  - `docs/codemaps/modules/<artifactId>.md` (deterministic only)

- Follow Agent Collaboration protocol if using sub-agent
- MUST consume sub-agent output (no rebuild from scratch)

- Validate contract BEFORE writing
- Write all files in a single pass

## Constraints

- Refresh is incremental (non-destructive)
- Do not create parallel structures or new CodeMap versions
- Do not write speculative / future-state content
- Must align with actual code and OpenSpec spec

## Notes

- This is a thin wrapper over `devos-docs`
- No CLI fallback
