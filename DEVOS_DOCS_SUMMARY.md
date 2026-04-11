# DevOS Docs Skills — Quick Summary

## What Are They?

The **devos-docs-init** and **devos-docs** skills are part of the Praxis DevOS framework for generating AI-first project documentation artifacts.

- **devos-docs-init**: Initialize project documentation from scratch
- **devos-docs**: Core skill that generates/refreshes both init and refresh modes
- **devos-docs-refresh**: Refresh existing project documentation incrementally

---

## Core Philosophy

> Write for AI readers first. Optimize for fast orientation during feature work and debugging, not prose elegance or exhaustive human onboarding.

**Not**: File trees, directory listings, generic onboarding
**Yes**: Architecture routing, change ownership guidance, edit hazards, runtime flows

---

## What Gets Generated

### 1. docs/surfaces.yaml
Describes the project's primary external surface and capabilities:
- Entry points (CLI, API, plugin, etc.)
- Supported agents and commands
- Bundled skills and commands
- Projection targets and external dependencies

### 2. docs/codemaps/project-overview.md
AI-first system overview with:
- One-paragraph project purpose
- First-read file list
- System architecture diagram
- Main flows and workflows
- External surfaces and dependencies
- Problem routing (what to edit for which change)
- Constraints and repo rules

### 3. docs/codemaps/module-map.md (Multi-module projects)
Module inventory with routing guidance:
- Module list and responsibilities
- Cross-module boundaries
- Dependency direction
- Which module owns which changes

### 4. docs/codemaps/modules/<artifactId>.md (Per-module details)
Deep-dive per module with:
- Module purpose
- Entry points
- Core flows
- Internal/external dependencies
- Edit hazards and debugging tips

---

## Key Files

| File | Location | Purpose |
|------|----------|---------|
| devos-docs-init.md | `~/.claude/commands/` | Initialize docs |
| devos-docs-refresh.md | `~/.claude/commands/` | Refresh docs |
| devos-docs SKILL.md | `~/.claude/skills/devos-docs/` | Core implementation |
| surfaces.yaml | `docs/` | Surface definitions |
| project-overview.md | `docs/codemaps/` | System-level routing |
| module-map.md | `docs/codemaps/` | Module guidance (if multi-module) |
| modules/*.md | `docs/codemaps/modules/` | Per-module details (if multi-module) |

---

## How to Use

### In Claude Code
```
/devos-docs-init          # Generate fresh docs
/devos-docs-refresh       # Update existing docs
```

### What It Requires
- **For init**: Repository structure to understand project type
- **For refresh**: Existing docs artifacts + change context (optional)

### What It Validates
Before writing files:
- ✓ JSON schema is valid (v1)
- ✓ Mode is "init" or "refresh"
- ✓ All codemap paths are within allowed targets
- ✓ No duplicate paths
- ✓ Content is non-empty

---

## Allowed Write Targets

Only these paths can be written:
```
docs/surfaces.yaml
docs/codemaps/project-overview.md
docs/codemaps/module-map.md
docs/codemaps/modules/<artifactId>.md
```

Nothing else. By design.

---

## Quality Standards for AI Readers

✓ **Good**:
- "This module owns HTTP routing; edit src/http/router.js for new endpoints"
- Architecture facts with call paths
- Real entry points and config files named
- Runtime flows that matter for implementation

✗ **Bad**:
- "handles business logic"
- Directory tree listings
- File-by-file descriptions
- Generic onboarding prose

**Test**: Can an AI answer these?
- "What part of the system owns this change?"
- "What should I read before editing here?"
- "What other modules might I impact?"
- "What risky background flows are hiding?"

If not, the content is too thin.

---

## Language & Locale

### openspec/config.yaml
Configures language for artifacts:
```yaml
context: |
  OpenSpec artifact language: zh-CN.
  Proposal, design, tasks, and spec artifacts must be written in Simplified Chinese by default.
  Keep code identifiers, commands, paths, capability names, and other technical tokens in their original form.
```

Technical tokens (code, paths, commands) always stay in original language.

---

## How It Works

1. **Mode specification**: `init` or `refresh`
2. **Repository scan**: Reads manifests, codemaps, source files
3. **Content generation**: Builds YAML and Markdown with high-signal content
4. **Validation**: Checks schema, paths, allowed targets
5. **Return contract**: JSON with `schemaVersion`, `mode`, `surfacesYaml`, `codemaps` array
6. **Writeback**: Caller validates and writes to disk

---

## Examples in This Project

- **surfaces.yaml**: `/Volumes/MacData/workspace/praxis-devos/docs/surfaces.yaml`
- **project-overview.md**: `/Volumes/MacData/workspace/praxis-devos/docs/codemaps/project-overview.md`
- **Template surfaces.yaml**: `src/templates/docs-lite/docs/surfaces.yaml`
- **Template codemap**: `src/templates/docs-lite/docs/codemaps/project-overview.md`
- **AI Guidance spec**: `openspec/specs/ai-first-codemap-guidance/spec.md`

---

## Maven Multi-Module Rules

For Maven projects with `<modules>` aggregation:

- Treat as multi-module only when explicit `<modules>` found
- Recurse nested modules if they also have `<modules>`
- Use each module's `<artifactId>` as stable name
- Fall back to normalized path if `<artifactId>` missing

---

## For More Details

📖 **Comprehensive guide**: `DEVOS_DOCS_COMPREHENSIVE_GUIDE.md`
📋 **Full file reference**: `DEVOS_DOCS_FULL_REFERENCE.md`
🔍 **Skill spec**: `~/.claude/skills/devos-docs/SKILL.md`
🎯 **AI guidance**: `openspec/specs/ai-first-codemap-guidance/spec.md`

---

## Key Principles

1. **AI-First**: Written for machine readers, not humans
2. **High-Signal**: Architecture routing, not file listings
3. **Deterministic**: Stable ordering, no ambiguity
4. **Non-Destructive**: Refresh never deletes/renames
5. **Validated**: Contract checking before writeback
6. **Bounded**: Only 4 allowed write targets
7. **Multilingual**: Locale-aware, configurable language
8. **Managed**: User content outside managed sections is preserved

---

## Projection System

```
praxis-devos/assets/skills/devos-docs/SKILL.md
          ↓ (during `npx praxis-devos setup`)
~/.claude/skills/devos-docs/SKILL.md
          ↓ (discovered by Claude Code)
/devos-docs slash command available
```

Same for commands and other bundled skills.

---

## Integration Points

- **OpenSpec**: Change-aware refresh context during propose/apply workflows
- **Claude Code**: `/devos-docs-init` and `/devos-docs-refresh` commands
- **Project init**: `npx praxis-devos setup` projects skills to Claude
- **Project sync**: `npx praxis-devos sync` updates projected files

---

Last updated: 2026-04-11
