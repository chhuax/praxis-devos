---
name: devos-docs
description: "Generate or refresh project documentation artifacts including surfaces.yaml and codemaps. Use when the user needs to initialize project docs, update codemaps after changes, or create AI-readable project overviews."
license: MIT
compatibility: Host command integration is external; this skill defines the repository-side contract.
metadata:
  author: praxis-devos
  version: "0.1"
---

Generate or refresh project docs contract artifacts for a user project.

Write for AI readers first. Optimize for fast orientation during feature work and debugging, not prose elegance or exhaustive human onboarding.

Treat the AI-first skill path as canonical. Do not optimize for non-AI fallback consumers when choosing content shape.

## End-to-End Workflow

1. Receive input (`mode`, repository context, optional `artifact_language`)
2. Gather evidence following the Repository Interrogation Order
3. Check Evidence Completeness checkpoints
4. Assemble JSON result contract (see Required Outputs)
5. Run Validation checks
6. Return validated contract (caller writes files)

## Input

The caller must provide:

- `mode=init` or `mode=refresh`
- repository context sufficient to identify the primary external surface
- existing docs artifacts when running in `mode=refresh`
- a docs context pack when docs consumption is routed intentionally

Optional:

- `artifact_language` — language preference for generated content (e.g., `zh-CN`); defaults to `en` when not provided

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
  "artifact_language": "en",
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

## Large Project Strategy

When the target project contains more than 5 modules (or equivalent workspace members), enable a batched generation strategy to prevent context-window pressure from causing cross-module information pollution. When the total module count cannot be determined before manifest scanning completes, default to batched mode.

### Batching Order

1. **Global phase** (completed in a single pass):
   - Scan all module manifests (e.g., `pom.xml`, `package.json` workspaces, `Cargo.toml` workspace members) and build the module topology
   - Generate `docs/surfaces.yaml`
   - Generate `docs/codemaps/project-overview.md`
   - Generate `docs/codemaps/module-map.md`

2. **Module phase** (completed in batches):
   - Process at most 3 modules per batch — this limit keeps each batch within a comfortable context-window budget while still amortizing the global-phase overhead
   - Each module's codemap generation runs in an **isolated sub-agent context**
   - The sub-agent receives only: the module's own topology information, the dependency relationships established in the global phase, and the module's own source code
   - Passing detailed source code from other modules into the current batch's context is prohibited

### Batching Goals

- Prevent cross-module information pollution that degrades codemap accuracy
- Ensure consistent inference quality per module regardless of processing order
- Reduce per-execution token consumption

### Batch Failure Handling

If a module batch fails or produces an incomplete codemap:

- The agent must not retry the same batch with identical parameters (consistent with the Exploration failure handling rules in Evidence Completeness)
- Successfully completed batches are preserved — failure of one batch does not invalidate others
- The failed module's codemap entry should be omitted from the result contract or annotated as low-confidence
- The agent must report which modules failed and why, so the user can decide whether to retry with a different approach

### State Transfer Between Batches

The global phase produces a shared context that every module batch consumes:

- Module topology (names, paths, packaging types)
- Inter-module dependency graph
- Controller-to-module ownership map (when applicable)
- Primary external surface summary

Each module batch's output is a standalone codemap entry in the result contract. Module batches do not depend on each other's output.

## Codemap Content Requirements

### Composition Strategy

The allowed write-target set is intentionally narrow. Therefore each codemap should carry more semantic weight than a simple filename suggests.

- `docs/codemaps/project-overview.md` is not just a welcome page; it should act as the system-level architecture, external surface, dependency, and routing summary when no dedicated cross-cutting files are allowed
- `docs/codemaps/module-map.md` is not just a module inventory; it should help an agent decide module ownership, dependency direction, and first inspection targets
- `docs/codemaps/modules/<artifactId>.md` is the deep-dive layer for module-local flows, entrypoints, dependencies, and edit hazards

When information would normally belong in separate files such as `architecture.md`, `backend.md`, or `dependencies.md`, fold the most decision-relevant parts into the allowed codemap targets instead of omitting them.

### `docs/codemaps/project-overview.md`

Required content:

- **Project summary**: one-paragraph system summary describing what the project is for, system type, and primary responsibility
- **First-read paths**: file list for orientation, main entrypoints and operator entrypaths
- **System architecture**: top-level subsystem or responsibility map describing the major parts and their relationship
- **Main flows**: key runtime or request flows that an implementation agent is likely to touch
- **External surfaces and dependencies**: primary external surface and where it lives, external integrations, important configuration surfaces, important contracts, and dependency hotspots when they can be inferred
- **Problem routing**: guidance telling an AI where to look for common change types, change-routing hints
- **Constraints and repo rules**: key constraints or repo-specific rules that strongly affect implementation behavior

### `docs/codemaps/module-map.md`

Required content:

- **Module inventory**: module list with each module's relative path, artifactId or fallback stable name, and short responsibility summary
- **Dependency direction**: inter-module dependency relationships, shared infrastructure modules versus feature modules, common dependency directions
- **Ownership hints**: cross-module boundary hints when they can be inferred
- **Change routing**: guidance on which module to inspect first for common categories of change, which module likely owns which class of change

### `docs/codemaps/modules/<artifactId>.md`

Required content:

- **Module identity**: module name and why the module exists
- **Main entrypoints**: key entry points, public interfaces, or main code entrypoints
- **Core flows**: critical runtime or request flows inside the module, core lifecycle when they can be inferred
- **Internal and external dependencies**: important in-repo dependencies and external dependencies
- **Persistence, async work, or integration touchpoints**: background work, persistence boundaries, or integration clients when they exist
- **Edit hazards and debugging notes**: module-specific gotchas, change hotspots, boundary rules, or modification tips that help an AI avoid the wrong edit path

## Agent Collaboration

When the main agent uses a sub-agent (Explore or other types) for repository exploration, the following protocol is mandatory.

### Sub-agent prompt requirements

The main agent's prompt to the sub-agent must include:

1. An explicit return format requirement — the sub-agent must return results **as a text message**, never write to `/tmp` or other external files
2. The expected return structure (see "Standard exploration return structure" below)
3. The target repository path

Vague prompts such as "explore the repository to gather evidence" are prohibited.

### Standard exploration return structure

The sub-agent should return the following structured information as text (not as a file).

The example below uses Maven/Java field names. For non-Java projects, adapt field names to the project's topology conventions (e.g., `package.json` workspaces for Node.js, `go.work` for Go, `Cargo.toml` workspace members for Rust). Fields that are not applicable to the project type should be omitted; an omitted field is not the same as a missing required field.

```yaml
module_topology:
  - artifactId: xxx
    path: relative/path
    packaging: jar|war|pom
    parent_artifactId: xxx

package_roots:
  <module_artifactId>:
    - com.example.module.package1
    - com.example.module.package2

controller_map:
  - controller_class: XxxController
    module: <module_artifactId>
    url_prefixes:
      - /api/v1/xxx

integration_points:
  - system: kubernetes
    classes:
      - com.example.KubeService
    module: <module_artifactId>

dependency_graph:
  <module_a>:
    - <module_b>
    - <module_c>
```

### Sub-agent result usage rules

1. The main agent **must evaluate the sub-agent's return first** before any additional exploration — skipping this step is a protocol violation
2. Supplementary scanning is permitted only when the sub-agent's return contains **enumerable factual errors** — the main agent must list each specific error
3. Supplementary scanning must build incrementally on the sub-agent's result; starting from scratch is prohibited
4. If the main agent judges the sub-agent's result unusable, the output must list concrete reasons (which fields are missing, which facts are incorrect); vague justifications such as "didn't gather the raw file content I need" are prohibited

## Evidence Completeness

Before claiming "sufficient evidence" and entering the contract assembly phase, the following checkpoints must pass.

### Required information (missing any one blocks writeback)

The checkpoints below are stated in Maven/Java terms. For other project types, apply analogous checkpoints based on the project's manifest and topology conventions (e.g., `package.json` workspaces, Go modules, Cargo workspace members). The principle is the same: every checkpoint must be satisfied by confirmed source evidence, not inference.

For `mode=init`:

- Module topology: every module declared in `<modules>` (or equivalent workspace manifest) has been scanned; artifactId and path confirmed
- Package roots: actual top-level packages under each module's source root confirmed from source (not inferred)
- Main entry point: the primary application entry point located

Additional requirements for multi-module projects:

- Controller-to-module mapping: for each module that exposes HTTP endpoints, the owning module of each controller or route handler is confirmed
- Dependency direction: inter-module dependency relationships confirmed from manifest declarations

For `mode=refresh`:

- Existing docs artifacts: current `surfaces.yaml` and all codemap files have been read
- Changed scope: the set of files or modules that changed since the last generation is identified
- Module topology for affected modules: every module touched by the change has been scanned with the same rigour as `mode=init`
- Surface validity: if URL namespace owners or integration points are being updated, the controller-to-module mapping for affected modules is confirmed

### Exploration failure handling

- If a scan command is Cancelled or errored, the information that command was responsible for is treated as **missing**
- Retrying the same command with identical parameters is prohibited — either use a different approach or accept the gap
- Codemap content that depends on missing information must be annotated as low-confidence or omitted entirely
- Filling information gaps with inference and then writing the inferred content as factual statements is prohibited

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

## Language Policy

Honor the `artifact_language` provided by the caller.

When `artifact_language` is set (e.g., `zh-CN`), all generated documentation content — section headings, descriptive text, constraint explanations, and routing guidance — must be written in that language.

When `artifact_language` is not provided, default to `en`.

The first implementation must support heading aliases for at least:

- `zh-CN`
- `en`

The following must always remain in their original form regardless of language setting:

- Code identifiers (class names, method names, package names)
- Commands and CLI arguments
- File paths
- Technical proper nouns (e.g., artifactId, Tekton, fabric8, Spring Boot, MyBatis)
- YAML/JSON field names
- URL paths and patterns

## Validation Contract

### Contract assembly (mandatory before any Write)

Before calling Write on any file, the complete JSON contract must be assembled and output.
Skipping this step and writing files directly is a protocol violation.

Assembly steps:

1. Assemble all content to be written into the JSON structure defined in the Required Outputs section
2. Execute each validation check below
3. Output the validation result (pass/fail with reasons)
4. Only after all checks pass, execute Write for each file

### Validation checks

- `schemaVersion` is present and equals `1`
- `mode` is present and is either `init` or `refresh`
- `surfacesYaml` is non-empty and is valid YAML containing at least a `primary_surface` key
- `codemaps` is an array
- each codemap entry has non-empty `path`, non-empty `content`, and `action=upsert`
- duplicate codemap paths are invalid
- paths outside the allowed target set are invalid
- `contracts/surfaces.yaml` is not a valid output target
- `artifact_language` when present must be a supported language code (`en`, `zh-CN`)

### Failure handling

When any validation check fails:

1. **All-or-nothing**: if any single entry fails validation, nothing is written
2. Return a structured error that still includes `schemaVersion` and `mode` for traceability:

```json
{
  "schemaVersion": 1,
  "mode": "init",
  "status": "validation-failed",
  "errors": [
    { "path": "docs/codemaps/modules/foo.md", "reason": "path outside allowed target set" }
  ]
}
```

The result contract therefore has two variants: a success variant (as defined in Required Outputs) and this error variant. Callers must check for the `status` field to distinguish them.

3. Return control to the user with the error — do not automatically retry
4. Report the failure reason to the user

## Compatibility Notes

Wrapper commands may exist, but they are transport only. The AI-first skill contract is the authoritative definition of content quality, allowed targets, and refresh behavior.
