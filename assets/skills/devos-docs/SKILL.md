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

Write for AI readers first. Optimize for fast orientation during feature work and debugging, not prose elegance or exhaustive human onboarding.

Treat the AI-first skill path as canonical. Do not optimize for non-AI fallback consumers when choosing content shape.

## Input

The caller must provide:

- `mode=init` or `mode=refresh`
- repository context sufficient to identify the primary external surface
- existing docs artifacts when running in `mode=refresh`
- a docs context pack when docs consumption is routed intentionally

For deterministic routing, the docs context pack should follow this order:

1. `docs/surfaces.yaml`
2. `docs/codemaps/project-overview.md`
3. `docs/codemaps/module-map.md` when the project is multi-module
4. `docs/codemaps/modules/<artifactId>.md` only when module routing can be determined

When `mode=refresh` is invoked from an OpenSpec-linked flow, the caller should also provide a change-aware refresh context containing:

- `changeId`
- relevant OpenSpec artifact paths
- changed paths
- optional target module hints
- existing docs artifacts

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

Each codemap content body should be high-signal and concrete:

- prefer architecture facts, call paths, boundaries, and routing guidance over directory listings
- name real modules, entry points, config files, and integration surfaces when they can be determined
- avoid filler such as "handles business logic" unless the specific logic is also named
- keep content token-lean enough to be practical as AI context, while still preserving the main system model
- when possible, start generated codemaps with a brief freshness header containing scan date and relevant scope
- never emit a thin file tree summary when repository evidence is strong enough to infer architecture, ownership, or runtime flow

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
- if an existing managed section is materially thinner than what current repository evidence supports, replace it with a richer managed section instead of preserving the weaker shape

## Maven Multi-Module Rules

- Treat a project as Maven multi-module only when module discovery succeeds through explicit `<modules>` aggregation
- Recurse through nested modules only when a discovered module also declares `<modules>`
- Use each module's own `<artifactId>` as the preferred stable module name
- If `<artifactId>` is missing, return a stable fallback name derived from the normalized module path relative to repository root

## Minimum Codemap Content

### Codemap Composition Strategy

The allowed write-target set is intentionally narrow. Therefore each codemap should carry more semantic weight than a simple filename suggests.

- `docs/codemaps/project-overview.md` is not just a welcome page; it should act as the system-level architecture, external surface, dependency, and routing summary when no dedicated cross-cutting files are allowed
- `docs/codemaps/module-map.md` is not just a module inventory; it should help an agent decide module ownership, dependency direction, and first inspection targets
- `docs/codemaps/modules/<artifactId>.md` is the deep-dive layer for module-local flows, entrypoints, dependencies, and edit hazards

When information would normally belong in separate files such as `architecture.md`, `backend.md`, or `dependencies.md`, fold the most decision-relevant parts into the allowed codemap targets instead of omitting them.

`docs/codemaps/project-overview.md` must include:

- one-paragraph system summary describing what the project is for
- primary external surface and where it lives
- first-read file list for orientation
- top-level subsystem or responsibility map
- system-level architecture summary describing the major parts and their relationship
- external integrations, important configuration surfaces, and dependency hotspots when they can be inferred
- key runtime or request flows that an implementation agent is likely to touch
- problem-routing guidance telling an AI where to look for common change types
- key constraints or repo-specific rules that strongly affect implementation behavior

`docs/codemaps/module-map.md` must include:

- module list
- each module relative path
- each module artifactId or fallback stable name
- short responsibility summary
- cross-module boundary hints when they can be inferred
- dependency direction or shared-infrastructure hints when they can be inferred
- guidance on which module to inspect first for common categories of change

`docs/codemaps/modules/<artifactId>.md` must include:

- module identity
- module purpose or responsibility
- key entry points or public interfaces
- important in-repo dependencies
- critical runtime or request flows inside the module when they can be inferred
- important external integrations, background work, or persistence touchpoints when they exist
- module-specific gotchas, change hotspots, or boundary rules that help an AI avoid the wrong edit path

## Recommended Section Templates

When repository context is sufficient, prefer these exact section types and keep them concise.

### `docs/codemaps/project-overview.md`

- Project summary
- First-read paths
- System architecture
- Main flows
- External surfaces and dependencies
- Problem routing
- Constraints and repo rules

### `docs/codemaps/module-map.md`

- Module inventory
- Responsibility slices
- Dependency direction
- Ownership hints
- Change routing

### `docs/codemaps/modules/<artifactId>.md`

- Module identity
- Why it exists
- Main entrypoints
- Core flows
- Internal and external dependencies
- Persistence, async work, or integration touchpoints
- Edit hazards and debugging notes

## Preferred Information Shape

When enough repository context is available, prefer content with these sections:

### Project overview

- System type and primary responsibility
- Main entrypoints and operator entrypaths
- Subsystem map
- Key runtime flows
- External surfaces and important contracts
- Important dependency and configuration hotspots
- Change-routing hints

### Module map

- Module inventory
- Shared infrastructure modules versus feature modules
- Common dependency directions
- Which module likely owns which class of change

### Module codemap

- Module identity
- Why the module exists
- Main code entrypoints
- Core flows or lifecycle
- Internal dependencies
- External dependencies
- Persistence, async, or background work touchpoints
- Debugging or modification tips

## Repository Interrogation Order

Before generating content, prefer this evidence order:

1. root guidance files such as `AGENTS.md`, `README.md`, and existing codemaps
2. manifest and topology files such as `pom.xml`, `package.json`, workspace manifests, and module declarations
3. primary external surface and obvious entrypoints
4. representative source files that reveal architecture, routing, async work, integration clients, and persistence boundaries
5. change-aware context from OpenSpec artifacts and changed paths during refresh

Do not stop after reading manifests if source files can cheaply reveal a stronger system model.

## AI-First Quality Bar

The generated codemap should help an implementation agent answer:

- "What part of the system probably owns this change?"
- "What should I read before editing code here?"
- "What other modules or configs am I likely to impact?"
- "What background flows or integrations could make a local-looking change risky?"

If the output cannot answer those questions, it is too thin.

If two candidate outputs have the same factual accuracy, prefer the one that reduces future search work for an implementation agent.

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

Wrapper commands may exist, but they are transport only. The AI-first skill contract is the authoritative definition of content quality, allowed targets, and refresh behavior.
