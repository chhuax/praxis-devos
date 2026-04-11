# DevOS Docs Skills — Comprehensive Guide

## Overview

The `devos-docs-init` and `devos-docs` skills are part of the Praxis DevOS orchestration harness. They generate and refresh project documentation contract artifacts (codemaps and surface definitions) using AI-first principles.

**Key Philosophy:** Write for AI readers first. Optimize for fast orientation during feature work and debugging, not prose elegance or exhaustive human onboarding.

---

## Skill Locations

### Command/Wrapper Files
- **devos-docs-init**: `~/.claude/commands/devos-docs-init.md`
- **devos-docs-refresh**: `~/.claude/commands/devos-docs-refresh.md`

### Skill Implementation
- **devos-docs**: `~/.claude/skills/devos-docs/SKILL.md`
- **Asset Source**: `/Volumes/MacData/workspace/praxis-devos/assets/skills/devos-docs/SKILL.md`
- **Bundled Skills**: `/Volumes/MacData/workspace/praxis-devos/assets/skills/`

---

## Skill Definitions

### 1. devos-docs-init

**File**: `~/.claude/commands/devos-docs-init.md`

**Purpose**: Initialize project documentation using the `devos-docs` skill.

**What it does**:
- Generates `docs/surfaces.yaml`
- Generates `docs/codemaps/project-overview.md`
- Uses deterministic validation before writeback

**Mode**: `init`

**When to use**:
- Setting up docs for the first time
- Project structure has changed significantly

**Implementation**:
- Thin wrapper around the `devos-docs` skill
- Invokes `devos-docs` skill with `mode=init`
- Uses stable docs routing order:
  1. `docs/surfaces.yaml`
  2. `docs/codemaps/project-overview.md`
  3. `docs/codemaps/module-map.md` (only for multi-module projects)
  4. `docs/codemaps/modules/<artifactId>.md` (only when module routing is deterministic)
- Validates results against existing docs contract before writeback
- No CLI fallback; use projected host command or invoke `devos-docs` skill directly

---

### 2. devos-docs-refresh

**File**: `~/.claude/commands/devos-docs-refresh.md`

**Purpose**: Refresh existing project documentation using the `devos-docs` skill.

**What it does**:
- Updates `docs/surfaces.yaml` when external surface changes
- Updates `docs/codemaps/project-overview.md` to match current structure
- Preserves existing docs artifacts where possible

**Mode**: `refresh`

**When to use**:
- Code structure has evolved
- New modules or surfaces have been added
- Existing docs are out of date

**Implementation**:
- Thin wrapper around the `devos-docs` skill
- Invokes `devos-docs` skill with `mode=refresh`
- Uses same stable docs routing order
- When available, passes change-aware refresh context:
  - active `changeId`
  - relevant OpenSpec artifact paths
  - changed paths
  - optional target module hints
- Non-destructive: does not implicitly delete, rename, or relocate docs artifacts
- Results must pass existing docs contract validation before writeback

---

### 3. devos-docs (Core Skill)

**File**: `~/.claude/skills/devos-docs/SKILL.md` (projected from assets)

**Purpose**: Generate or refresh docs contract artifacts for a user project using AI-first orchestration with deterministic writeback boundaries.

**Description**: Generate or refresh project docs contract artifacts for a user project, optimized for AI readers.

#### Input Requirements

The caller must provide:

1. **Mode specification**: `mode=init` or `mode=refresh`
2. **Repository context**: sufficient to identify the primary external surface
3. **Existing docs** (for refresh): current docs artifacts
4. **Docs context pack** (when routed intentionally):
   - `docs/surfaces.yaml`
   - `docs/codemaps/project-overview.md`
   - `docs/codemaps/module-map.md` (multi-module projects)
   - `docs/codemaps/modules/<artifactId>.md` (when routing deterministic)

**For `mode=refresh` from OpenSpec flows**, provide change-aware context:
- `changeId`
- Relevant OpenSpec artifact paths
- Changed paths
- Optional target module hints
- Existing docs artifacts

#### Output Contract

Return a structured result contract (JSON) rather than writing arbitrary files directly.

**Minimum contract shape**:
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

**Validation requirements**:
- `schemaVersion` is present and equals `1`
- `mode` is present and is either `init` or `refresh`
- `surfacesYaml` is non-empty
- `codemaps` is an array
- Each codemap entry has non-empty `path`, `content`, and `action=upsert`
- No duplicate codemap paths
- Paths outside allowed target set are invalid
- `contracts/surfaces.yaml` is NOT a valid output target

#### Allowed Write Targets

Only these repository paths are valid:
- `docs/surfaces.yaml`
- `docs/codemaps/project-overview.md`
- `docs/codemaps/module-map.md`
- `docs/codemaps/modules/<artifactId>.md`

No other repository path is a valid write target.

#### Mode Semantics

**mode=init**: Project does not yet have docs contract artifacts or needs first AI-generated baseline

Generate:
- `docs/surfaces.yaml`
- `docs/codemaps/project-overview.md`
- For Maven multi-module projects:
  - `docs/codemaps/module-map.md`
  - `docs/codemaps/modules/<artifactId>.md`

**mode=refresh**: Project has docs contract artifacts; caller wants incremental update

Rules:
- Update only files explicitly returned in validated contract
- Do not delete files
- Do not rename files
- Do not relocate files
- Preserve user-authored content outside managed sections
- If existing managed section is materially thinner than what repository evidence supports, replace with richer managed section

#### Content Quality Standards

**Codemap principle**: Write for AI readers first. Optimize for implementation agent orientation during feature work, not human onboarding.

**Preferred content**:
- Architecture facts, call paths, boundaries, routing guidance over directory listings
- Real modules, entry points, config files, integration surfaces (when determinable)
- Avoid filler ("handles business logic") unless specific logic is named
- Keep content token-lean for practical AI context
- Start generated codemaps with freshness header (scan date, scope)
- Never emit thin file tree when repository evidence supports architecture inference

**AI-First Quality Bar**: Generated codemaps should help an implementation agent answer:
- "What part of the system probably owns this change?"
- "What should I read before editing code here?"
- "What other modules or configs am I likely to impact?"
- "What background flows or integrations could make a local-looking change risky?"

If output cannot answer those questions, it is too thin.

#### Minimum Content Requirements

##### docs/codemaps/project-overview.md

Must include:
- One-paragraph system summary describing what the project is for
- Primary external surface and where it lives
- First-read file list for orientation
- Top-level subsystem or responsibility map
- System-level architecture summary (major parts and relationships)
- External integrations, important configuration surfaces, dependency hotspots
- Key runtime or request flows implementation agent likely touches
- Problem-routing guidance for common change types
- Key constraints or repo-specific rules affecting implementation behavior

**Recommended sections**:
- Project summary
- First-read paths
- System architecture
- Main flows
- External surfaces and dependencies
- Problem routing
- Constraints and repo rules

##### docs/codemaps/module-map.md (multi-module projects)

Must include:
- Module list with relative paths
- Each module's artifactId or fallback stable name
- Short responsibility summary for each
- Cross-module boundary hints
- Dependency direction or shared-infrastructure hints
- Guidance on which module to inspect first for common change categories

**Recommended sections**:
- Module inventory
- Responsibility slices
- Dependency direction
- Ownership hints
- Change routing

##### docs/codemaps/modules/<artifactId>.md

Must include:
- Module identity
- Module purpose or responsibility
- Key entry points or public interfaces
- Important in-repo dependencies
- Critical runtime or request flows inside module (when inferable)
- Important external integrations, background work, persistence touchpoints
- Module-specific gotchas, change hotspots, boundary rules

**Recommended sections**:
- Module identity
- Why it exists
- Main entrypoints
- Core flows
- Internal and external dependencies
- Persistence, async work, integration touchpoints
- Edit hazards and debugging notes

#### Maven Multi-Module Rules

- Treat as multi-module only when module discovery succeeds through explicit `<modules>` aggregation
- Recurse through nested modules only when discovered module also declares `<modules>`
- Use each module's own `<artifactId>` as preferred stable module name
- If `<artifactId>` missing, return stable fallback derived from normalized module path relative to repo root

#### Repository Interrogation Order

Before generating content, prefer this evidence order:

1. Root guidance files: `AGENTS.md`, `README.md`, existing codemaps
2. Manifest and topology files: `pom.xml`, `package.json`, workspace manifests, module declarations
3. Primary external surface and obvious entrypoints
4. Representative source files revealing architecture, routing, async work, integration clients, persistence boundaries
5. Change-aware context from OpenSpec artifacts and changed paths (during refresh)

**Important**: Do not stop after reading manifests if source files can cheaply reveal stronger system model.

---

## Surfaces.yaml Template & Structure

### Location
Real project example: `/Volumes/MacData/workspace/praxis-devos/docs/surfaces.yaml`
Lite template: `/Volumes/MacData/workspace/praxis-devos/src/templates/docs-lite/docs/surfaces.yaml`

### Example - Praxis DevOS Project

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

### Example - Minimal Template

```yaml
primary_surface: public-interface

surfaces:
  - id: public-interface
    kind: other
    location: src/index.ts
    description: Primary external surface for this project.
```

### Surface Fields

- **primary_surface**: Primary entry point type (e.g., `cli`, `public-interface`)
- **cli_entrypoint**: Path to CLI entry point (if applicable)
- **npm_package**: NPM package name (if applicable)
- **opencode_plugin_entrypoint**: Plugin entry point for OpenCode (if applicable)
- **supported_agents**: List of supported agents (opencode, codex, claude, etc.)
- **commands**: List of CLI commands
- **bundled_skills**: Skills bundled with project
- **bundled_commands**: Commands bundled with project
- **projection_targets**: Where skills project to for each agent
- **external_dependencies**: Required external dependencies
- **surfaces**: Array of surface definitions with `id`, `kind`, `location`, `description`

---

## Codemap Examples

### Project Overview Example (praxis-devos)

Located at: `/Volumes/MacData/workspace/praxis-devos/docs/codemaps/project-overview.md`

**Key characteristics**:
- Starts with metadata: `_Scanned: 2026-04-11 | Scope: full repository_`
- **Project Summary**: One paragraph describing system type, core responsibility, layers
- **First-Read Paths**: Table with paths and reasons for reading each
- **System Architecture**: ASCII diagram showing structure and data flow
- **Main Flows**: Descriptions of major workflows (setup, sync, doctor)
- **External Surfaces and Dependencies**: Table of dependencies, sources, install paths
- **Problem Routing**: Table mapping change types to where to look
- **Constraints and Repo Rules**: List of key constraints affecting behavior

**Structure example**:
```markdown
# praxis-devos — Project Overview

_Scanned: 2026-04-11 | Scope: full repository_

## Project Summary

[One paragraph describing what project does and its layers]

## First-Read Paths

| Path | Why |
|---|---|
| `src/core/praxis-devos.js` | CLI command routing and top-level orchestration |
| ... | ... |

## System Architecture

[ASCII diagram showing structure]

## Main Flows

### npx praxis-devos setup --agent <name>
[Numbered steps]

### npx praxis-devos sync
[Description]

## External Surfaces and Dependencies

| Dependency | Source | Install path |
|---|---|---|
| ... | ... | ... |

## Problem Routing

| Change type | Where to look |
|---|---|
| Adding/removing a CLI command | src/core/praxis-devos.js → runCli() + implement in adapters.js or runtime/ |
| ... | ... |

## Constraints and Repo Rules

- [Key constraints as bullet list]
```

### Minimal Template (Lite)

Located at: `/Volumes/MacData/workspace/praxis-devos/src/templates/docs-lite/docs/codemaps/project-overview.md`

```markdown
# Codemap: Project Overview

<!-- PRAXIS_DOCS_REFRESH_START -->
Praxis DevOS will refresh this block.
<!-- PRAXIS_DOCS_REFRESH_END -->

## User Notes

Add project-specific notes here. Praxis refresh preserves this section.
```

**Note**: Lite template has placeholder for AI-generated content and preserves user notes.

---

## Language & Locale Configuration

### OpenSpec Config (openspec/config.yaml)

Located at: `/Volumes/MacData/workspace/praxis-devos/openspec/config.yaml`

```yaml
schema: spec-driven

context: |
  OpenSpec artifact language: zh-CN.
  Proposal, design, tasks, and spec artifacts must be written in Simplified Chinese by default.
  Keep code identifiers, commands, paths, capability names, and other technical tokens in their original form.
```

**Key points**:
- `schema`: Defines spec-driven schema
- `context`: Specifies language, conventions, domain knowledge
- Language setting: `zh-CN` (Simplified Chinese)
- Important: Technical tokens (code, paths, commands) stay in original form
- Can include per-artifact rules for proposals, tasks, specs

### Language Support in Adapters

File: `/Volumes/MacData/workspace/praxis-devos/src/projection/index.js`

The `localeCompare()` method ensures stable, locale-aware sorting of skill names:
```javascript
.sort((a, b) => a.name.localeCompare(b.name))
```

This ensures:
- Consistent, deterministic skill ordering across locale environments
- Proper handling of Unicode sorting in different languages

### Project Management Templates

File: `/Volumes/MacData/workspace/praxis-devos/src/core/project/adapters.js`

**AGENTS.md template** (Chinese):
```markdown
# [项目名称]

> 请在此文件中描述项目上下文，帮助 AI 代理理解你的项目。

## 项目概述
<!-- Description -->

## 技术栈
<!-- Tech stack -->

## 模块结构
<!-- Module structure -->

## 构建命令
<!-- Build commands -->

## 分支策略
<!-- Git strategy -->

## 额外约定
<!-- Additional conventions -->
```

**CLAUDE.md template**:
```markdown
# Claude Code Project Memory

此文件由 Praxis DevOS 维护 Claude Code 的项目入门信息。
```

**Translation context**: Documentation adapters support multilingual project setup by providing templates in both English and Chinese.

---

## AI-First Codemap Guidance

### OpenSpec Specification

Located at: `/Volumes/MacData/workspace/praxis-devos/openspec/specs/ai-first-codemap-guidance/spec.md`

**Core Requirements**:

1. **Codemap generation SHALL prioritize AI task routing over generic onboarding**
   - Generate artifacts helping implementation agents quickly determine:
     - System shape
     - Likely edit locations
     - High-risk paths
   - Avoid thin file-navigation summaries

2. **AI-first codemap guidance SHALL remain within current docs contract**
   - Fold cross-cutting context (architecture, backend, dependencies) into existing targets
   - Keep canonical path as AI-first `devos-docs` skill
   - Do not require new write targets beyond `docs/surfaces.yaml` and `docs/codemaps/**`

**Scenarios**:

- **Project overview carries system-level routing context**
  - Include purpose, primary surface, subsystem map
  - Include routing guidance, architecture, runtime flows, constraints

- **Module map carries ownership and inspection guidance**
  - Help AI decide which module owns change
  - Show dependencies and first-inspection targets
  - Do not degrade into mere module inventory

- **Module codemap carries edit hazards and local flows**
  - Include entrypoints, local flows, dependencies
  - Focus on task-relevant signal

---

## Projection System

### How Skills Get to Users

**File**: `/Volumes/MacData/workspace/praxis-devos/src/projection/claude.js`

1. **Skill Discovery**:
   - Bundled skills in `assets/skills/<name>/SKILL.md`
   - Collected by `collectBundledSkillSources()`
   - Sorted using `localeCompare()` for deterministic order

2. **Projection to Claude**:
   - Target: `~/.claude/skills/<name>/SKILL.md`
   - Process:
     - Read source SKILL.md
     - Inject marker: `<!-- PRAXIS_PROJECTION source=... version=... -->`
     - Write to target with marker
     - Register as managed asset

3. **Command Projection**:
   - Target: `~/.claude/commands/<name>.md`
   - Commands: `devos-docs-init`, `devos-docs-refresh`

4. **Stale Cleanup**:
   - Remove skill directories no longer in `assets/skills/`
   - Prevents accumulation of deprecated skills

5. **Safety**:
   - `canSafelyOverwrite()` prevents overwriting non-Praxis files
   - `registerManagedAsset()` tracks version, source, ownership

---

## Integration Points

### When Docs Are Generated

1. **Project Setup** (`npx praxis-devos setup --agent claude`):
   - OpenSpec initialization
   - Managed blocks in AGENTS.md / CLAUDE.md
   - Skill and command projection

2. **Project Sync** (`npx praxis-devos sync`):
   - Refresh managed blocks
   - Re-project skills and commands
   - Clean stale projections

3. **Manual Refresh** (via `/devos-docs-refresh` command in Claude):
   - Called when code structure changes
   - Updates surface definitions and codemaps
   - Preserves user-authored content

4. **Change-Aware Refresh** (OpenSpec integration):
   - Triggered by change artifacts
   - Includes change context
   - Only updates affected codemaps

---

## Key Principles

1. **AI-First Content**: Written for machine readers optimizing implementation orientation
2. **High-Signal Only**: Architecture facts, not file listings
3. **Deterministic Routing**: Stable order, no ambiguity in module discovery
4. **Non-Destructive Updates**: Never delete, rename, or relocate existing content
5. **Managed Blocks**: User-authored content outside managed sections is preserved
6. **Validation Before Writeback**: Results validated against existing docs contract
7. **Multilingual Support**: Locale-aware sorting, configurable language context
8. **Bounded Writeback**: Only allowed targets: `docs/surfaces.yaml` and `docs/codemaps/**`

---

## Files in This Project Using These Skills

- **Command Wrappers**: `~/.claude/commands/devos-docs-*.md`
- **Skill Implementation**: `~/.claude/skills/devos-docs/SKILL.md`
- **Asset Sources**: `/Volumes/MacData/workspace/praxis-devos/assets/skills/devos-docs/SKILL.md`
- **Project Docs**: `/Volumes/MacData/workspace/praxis-devos/docs/surfaces.yaml`
- **Project Codemaps**: `/Volumes/MacData/workspace/praxis-devos/docs/codemaps/project-overview.md`
- **OpenSpec Config**: `/Volumes/MacData/workspace/praxis-devos/openspec/config.yaml`
- **Codemap Guidance**: `/Volumes/MacData/workspace/praxis-devos/openspec/specs/ai-first-codemap-guidance/spec.md`

