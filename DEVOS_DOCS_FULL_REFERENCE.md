# DevOS Docs Skills — Full File Reference

## EXACT FILE CONTENTS

### 1. devos-docs-init.md
**Location**: `~/.claude/commands/devos-docs-init.md`

```markdown
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
- Use the stable docs routing order:
  - `docs/surfaces.yaml`
  - `docs/codemaps/project-overview.md`
  - `docs/codemaps/module-map.md` only for multi-module projects
  - `docs/codemaps/modules/<artifactId>.md` only when module routing is deterministic
- Canonical paths:
  - `docs/surfaces.yaml`
  - `docs/codemaps/**`
- Validation:
  - results must pass the existing docs contract before writeback

## Notes

- This is a thin wrapper. Core logic lives in the `devos-docs` skill.
- No CLI fallback is provided; use the projected host command or invoke the `devos-docs` skill directly.
```

### 2. devos-docs-refresh.md
**Location**: `~/.claude/commands/devos-docs-refresh.md`

```markdown
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
- Canonical paths:
  - `docs/surfaces.yaml`
  - `docs/codemaps/**`
- Validation:
  - results must pass the existing docs contract before writeback
- Refresh is non-destructive:
  - do not implicitly delete, rename, or relocate docs artifacts

## Notes

- This is a thin wrapper. Core logic lives in the `devos-docs` skill.
- No CLI fallback is provided; use the projected host command or invoke the `devos-docs` skill directly.
```

### 3. devos-docs SKILL.md (Core Implementation)
**Location**: `~/.claude/skills/devos-docs/SKILL.md` (projected from `assets/skills/devos-docs/SKILL.md`)

[Full content available in comprehensive guide above - 265 lines]

### 4. surfaces.yaml - Production Example
**Location**: `/Volumes/MacData/workspace/praxis-devos/docs/surfaces.yaml`

```yaml
primary_surface: cli
cli_entrypoint: bin/praxis-devos.js
npm_package: praxis-devos
opencode_plugin_entrypoint: opencode-plugin.js
supported_agents:
  - opencode
  - codex
  - claude
commands:
  - setup
  - init
  - sync
  - status
  - doctor
  - bootstrap
bundled_skills:
  - devos-docs
  - devos-change-docs
  - opsx-explore
  - opsx-propose
  - opsx-apply
  - opsx-archive
bundled_commands:
  - devos-docs-init
  - devos-docs-refresh
projection_targets:
  claude: ~/.claude/skills/<name>/SKILL.md
  codex: ~/.codex/skills/<name>/SKILL.md
  opencode: ~/.config/opencode/config.json (plugin registration)
external_dependencies:
  openspec: "@fission-ai/openspec (global npm)"
  superpowers_claude: "claude plugin install"
  superpowers_codex: "git clone + symlink at ~/.codex/superpowers"
  superpowers_opencode: "declared in ~/.config/opencode/config.json"
```

### 5. surfaces.yaml - Template Example
**Location**: `/Volumes/MacData/workspace/praxis-devos/src/templates/docs-lite/docs/surfaces.yaml`

```yaml
primary_surface: public-interface

surfaces:
  - id: public-interface
    kind: other
    location: src/index.ts
    description: Primary external surface for this project.
```

### 6. project-overview.md - Production Example (First 100 lines)
**Location**: `/Volumes/MacData/workspace/praxis-devos/docs/codemaps/project-overview.md`

```markdown
# praxis-devos — Project Overview

_Scanned: 2026-04-11 | Scope: full repository_

## Project Summary

`praxis-devos` is a CLI scaffold and orchestration harness (not a content generator) that connects three layers inside a user project: **OpenSpec** governance for propose/apply/validate/archive workflows, **SuperPowers** as the execution layer for skills like planning and debugging, and **agent-specific adapters** that make those rules natively discoverable in Claude Code, Codex, and OpenCode. It installs and validates external dependencies, writes and refreshes managed blocks in project root files, and projects bundled skills/commands into each agent's native user-level discovery directories.

## First-Read Paths

| Path | Why |
|---|---|
| `src/core/praxis-devos.js` | CLI command routing and top-level orchestration |
| `src/core/project/adapters.js` | Project init, sync, and managed-block logic |
| `src/core/runtime/dependencies.js` | Doctor/setup/bootstrap orchestration entry |
| `src/core/runtime/agent-dependencies.js` | Per-agent SuperPowers detection and install |
| `src/core/runtime/openspec.js` | OpenSpec detection, install, and bootstrap |
| `src/projection/index.js` | Projection dispatch to agent adapters |
| `src/projection/claude.js` | Claude skill and command projection |
| `src/core/project/state.js` | Shared paths, filesystem helpers, agent normalization |
| `src/projection/markers.js` | `<!-- PRAXIS_PROJECTION ... -->` marker read/write |
| `assets/` | Bundled SKILL.md files and slash command assets |

## System Architecture

```
CLI (bin/praxis-devos.js)
  └── praxis-devos.js (command router + orchestrator)
        ├── runtime/dependencies.js (doctor/bootstrap dispatch)
        │     ├── runtime/openspec.js (OpenSpec detect/install)
        │     └── runtime/agent-dependencies.js (per-agent detect/install)
        ├── project/adapters.js (init/sync: managed blocks + adapter files)
        │     └── project/state.js (paths, fs helpers)
        └── projection/index.js (user-level skill/command projection)
              ├── projection/claude.js
              ├── projection/codex.js
              ├── projection/opencode.js
              └── projection/markers.js (marker inject/parse)
```

[... continues for 260+ more lines ...]
```

### 7. project-overview.md - Template Example
**Location**: `/Volumes/MacData/workspace/praxis-devos/src/templates/docs-lite/docs/codemaps/project-overview.md`

```markdown
# Codemap: Project Overview

<!-- PRAXIS_DOCS_REFRESH_START -->
Praxis DevOS will refresh this block.
<!-- PRAXIS_DOCS_REFRESH_END -->

## User Notes

Add project-specific notes here. Praxis refresh preserves this section.
```

### 8. openspec/config.yaml - Language Configuration
**Location**: `/Volumes/MacData/workspace/praxis-devos/openspec/config.yaml`

```yaml
schema: spec-driven

context: |
  OpenSpec artifact language: zh-CN.
  Proposal, design, tasks, and spec artifacts must be written in Simplified Chinese by default.
  Keep code identifiers, commands, paths, capability names, and other technical tokens in their original form.

# Project context (optional)
# This is shown to AI when creating artifacts.
# Add your tech stack, conventions, style guides, domain knowledge, etc.
# Example:
#   context: |
#     Tech stack: TypeScript, React, Node.js
#     We use conventional commits
#     Domain: e-commerce platform

# Per-artifact rules (optional)
# Add custom rules for specific artifacts.
# Example:
#   rules:
#     proposal:
#       - Keep proposals under 500 words
#       - Always include a "Non-goals" section
#     tasks:
#       - Break tasks into chunks of max 2 hours
```

### 9. AI-First Codemap Guidance Specification
**Location**: `/Volumes/MacData/workspace/praxis-devos/openspec/specs/ai-first-codemap-guidance/spec.md`

```markdown
## ADDED Requirements

### Requirement: Codemap generation SHALL prioritize AI task routing over generic onboarding

The system SHALL generate codemap artifacts that help an implementation agent quickly determine system shape, likely edit locations, and high-risk paths instead of defaulting to thin file-navigation summaries.

#### Scenario: Project overview carries system-level routing context
- **WHEN** `devos-docs` generates `docs/codemaps/project-overview.md`
- **THEN** the artifact includes the project purpose, primary external surface, major subsystem map, and implementation-routing guidance
- **AND** it includes the most decision-relevant architecture, runtime flow, and constraint context supported by repository evidence

#### Scenario: Module map carries ownership and inspection guidance
- **WHEN** `devos-docs` generates `docs/codemaps/module-map.md`
- **THEN** the artifact helps an AI decide which module owns a change, what dependencies matter, and where to inspect first
- **AND** it does not degrade into a module name inventory with no routing value

#### Scenario: Module codemap carries edit hazards and local flows
- **WHEN** `devos-docs` generates `docs/codemaps/modules/<artifactId>.md`
- **THEN** the artifact includes entrypoints, key local flows, dependencies, and change hazards that affect edits inside that module
- **AND** it remains focused on task-relevant signal rather than repeating repository boilerplate

### Requirement: AI-first codemap guidance SHALL remain within the current docs contract

The system SHALL improve codemap density without widening the allowed writeback boundary beyond the current lightweight docs contract.

#### Scenario: Cross-cutting context is folded into existing codemap targets
- **WHEN** repository evidence would normally justify separate architecture, backend, or dependency summaries
- **THEN** `devos-docs` folds the most decision-relevant parts into the existing codemap artifacts
- **AND** it does not require new write targets outside `docs/surfaces.yaml` and `docs/codemaps/**`

#### Scenario: AI-first path is canonical for codemap quality
- **WHEN** codemap guidance is evaluated for quality expectations
- **THEN** the AI-first `devos-docs` skill path is treated as the canonical behavior
- **AND** compatibility or fallback paths do not set the quality bar for this capability
```

---

## Quick Reference: Callable Interfaces

### Calling devos-docs-init
```
Use the /devos-docs-init slash command in Claude Code to:
- Generate fresh docs/surfaces.yaml
- Generate fresh docs/codemaps/project-overview.md
- For Maven multi-module projects, also generate module codemaps
```

### Calling devos-docs-refresh
```
Use the /devos-docs-refresh slash command in Claude Code to:
- Update surfaces.yaml when external surface changes
- Update project overview codemap to match current repository structure
- Preserve existing content where possible
- Support change-aware refresh from OpenSpec integration
```

### Calling devos-docs Directly
The `devos-docs` skill expects invocation with:
```json
{
  "mode": "init" | "refresh",
  "projectDir": "/path/to/project",
  "existingDocs": { /* existing docs artifacts for refresh mode */ }
}
```

Returns JSON contract:
```json
{
  "schemaVersion": 1,
  "mode": "init|refresh",
  "surfacesYaml": "yaml_content_as_string",
  "codemaps": [
    {
      "path": "docs/codemaps/project-overview.md",
      "content": "markdown_content",
      "action": "upsert"
    }
  ]
}
```

---

## Key Integration Points

### In praxis-devos Project

1. **Command definitions** → `assets/commands/*.md`
2. **Skill definition** → `assets/skills/devos-docs/SKILL.md`
3. **Projection** → `src/projection/claude.js` copies to `~/.claude/`
4. **Project docs** → `docs/surfaces.yaml` + `docs/codemaps/**`
5. **Language config** → `openspec/config.yaml`
6. **Requirements** → `openspec/specs/ai-first-codemap-guidance/`

### Discovery Path

```
User opens Claude Code
  ↓
Claude discovers ~/.claude/commands/devos-docs-init.md
Claude discovers ~/.claude/commands/devos-docs-refresh.md
Claude discovers ~/.claude/skills/devos-docs/SKILL.md
  ↓
User invokes /devos-docs-init or /devos-docs-refresh
  ↓
Claude Code reads project structure
Claude Code invokes devos-docs skill in init or refresh mode
  ↓
Skill returns JSON contract
Claude Code validates and writes to docs/
```

