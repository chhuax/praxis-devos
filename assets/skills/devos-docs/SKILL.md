---
name: devos-docs
description: Generate or refresh docs contract artifacts for a user project using AI-first orchestration with deterministic writeback boundaries.
license: MIT
compatibility: Host command integration is external; this skill defines the repository-side contract.
metadata:
  author: praxis-devos
  version: "0.1"
---

Generate or refresh project docs contract artifacts for a user project.

## Input

The caller must provide:

- `mode=init` or `mode=refresh`
- repository context sufficient to identify the primary external surface
- existing docs artifacts when running in `mode=refresh`

## Required Outputs

Return a structured result contract rather than writing arbitrary files directly.

Minimum contract shape:

```json
{
  "schemaVersion": 1,
  "mode": "init",
  "surfacesYaml": "primary_surface: ...",
  "codemaps": [
    {
      "path": "docs/codemaps/project-overview.md",
      "content": "...",
      "action": "upsert"
    }
  ]
}
```

## Allowed Write Targets

Only these repository paths are valid write targets in Phase 2:

- `docs/surfaces.yaml`
- `docs/codemaps/project-overview.md`
- `docs/codemaps/module-map.md`
- `docs/codemaps/modules/<artifactId>.md`

No other repository path is a valid write target for this skill result.

## Mode Semantics

### `mode=init`

Use when the project does not yet have docs contract artifacts or needs a first AI-generated baseline.

Generate:

- `docs/surfaces.yaml`
- `docs/codemaps/project-overview.md`
- For detected Maven multi-module projects:
  - `docs/codemaps/module-map.md`
  - `docs/codemaps/modules/<artifactId>.md`

### `mode=refresh`

Use when the project already has docs contract artifacts and the caller wants an incremental update.

Rules:

- update only files explicitly returned in the validated contract
- do not delete files
- do not rename files
- do not relocate files
- preserve user-authored content outside managed sections

## Maven Multi-Module Rules

- Treat a project as Maven multi-module only when module discovery succeeds through explicit `<modules>` aggregation
- Recurse through nested modules only when a discovered module also declares `<modules>`
- Use each module's own `<artifactId>` as the preferred stable module name
- If `<artifactId>` is missing, return a stable fallback name derived from the normalized module path relative to repository root

## Minimum Codemap Content

`docs/codemaps/module-map.md` must include:

- module list
- each module relative path
- each module artifactId or fallback stable name
- short responsibility summary

`docs/codemaps/modules/<artifactId>.md` must include:

- module identity
- module purpose or responsibility
- key entry points or public interfaces
- important in-repo dependencies

## Validation Expectations

The caller validates the result before writeback. Your result must satisfy:

- `schemaVersion` is present and equals `1`
- `mode` is present and is either `init` or `refresh`
- `surfacesYaml` is non-empty
- `codemaps` is an array
- each codemap entry has non-empty `path`, non-empty `content`, and `action=upsert`
- duplicate codemap paths are invalid
- paths outside the allowed target set are invalid
- `contracts/surfaces.yaml` is not a valid output target

## Compatibility Notes

The repository may still expose `praxis-devos docs init|refresh|check` as compatibility or fallback helpers. Those helpers must honor the same canonical path, allowed-target rules, and deterministic validation expectations as this skill contract.
