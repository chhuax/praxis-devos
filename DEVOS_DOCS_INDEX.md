# DevOS Docs Skills — Documentation Index

This directory now contains comprehensive documentation about the `devos-docs-init`, `devos-docs`, and `devos-docs-refresh` skills used in the Praxis DevOS project.

## 📚 Documents in This Project

### 1. **DEVOS_DOCS_SUMMARY.md** ⭐ START HERE
Quick 2-minute overview of what these skills do, how to use them, and key concepts.

**Best for**: Getting oriented quickly

**Covers**:
- What are devos-docs skills?
- Core philosophy (AI-first documentation)
- What files get generated
- How to use them in Claude Code
- Quality standards for AI readers
- Language & locale configuration

---

### 2. **DEVOS_DOCS_COMPREHENSIVE_GUIDE.md** 📖 DETAILED REFERENCE
Complete 3000-line reference guide with all details.

**Best for**: Deep understanding and implementation

**Covers**:
- Complete skill definitions
- Input/output contracts
- Content quality standards
- Codemap examples from production
- Surfaces.yaml templates
- Maven multi-module rules
- Repository interrogation order
- AI-first quality bar
- Language and locale configuration
- Projection system details
- Integration points
- Key principles

---

### 3. **DEVOS_DOCS_FULL_REFERENCE.md** 📋 EXACT FILE CONTENTS
Contains exact, copy-paste ready content from all related files.

**Best for**: When you need the exact code/config

**Contains**:
- Full text of `devos-docs-init.md`
- Full text of `devos-docs-refresh.md`
- Full text of `devos-docs` SKILL.md
- Production `surfaces.yaml` example
- Template `surfaces.yaml` example
- Production `project-overview.md` example (first 100 lines)
- Template `project-overview.md` example
- `openspec/config.yaml` with language config
- AI-First Codemap Guidance specification
- Callable interfaces (JSON contract examples)
- Integration points overview

---

### 4. **DEVOS_DOCS_INDEX.md** (This file)
Navigation guide for all DevOS Docs documentation.

---

## 🔍 File Locations

### Skill Definition Files
- **devos-docs-init command**: `~/.claude/commands/devos-docs-init.md`
- **devos-docs-refresh command**: `~/.claude/commands/devos-docs-refresh.md`
- **devos-docs skill**: `~/.claude/skills/devos-docs/SKILL.md`

### Project Source Files
- **Skill source asset**: `/Volumes/MacData/workspace/praxis-devos/assets/skills/devos-docs/SKILL.md`
- **Command source assets**: `/Volumes/MacData/workspace/praxis-devos/assets/commands/devos-docs-*.md`

### Generated Documentation
- **surfaces.yaml**: `/Volumes/MacData/workspace/praxis-devos/docs/surfaces.yaml`
- **project-overview.md**: `/Volumes/MacData/workspace/praxis-devos/docs/codemaps/project-overview.md`

### Templates
- **Template surfaces.yaml**: `/Volumes/MacData/workspace/praxis-devos/src/templates/docs-lite/docs/surfaces.yaml`
- **Template codemap**: `/Volumes/MacData/workspace/praxis-devos/src/templates/docs-lite/docs/codemaps/project-overview.md`

### Configuration
- **Language config**: `/Volumes/MacData/workspace/praxis-devos/openspec/config.yaml`
- **AI guidance spec**: `/Volumes/MacData/workspace/praxis-devos/openspec/specs/ai-first-codemap-guidance/spec.md`

### Implementation Files
- **Projection system**: `/Volumes/MacData/workspace/praxis-devos/src/projection/claude.js`
- **Project adapters**: `/Volumes/MacData/workspace/praxis-devos/src/core/project/adapters.js`
- **Project state**: `/Volumes/MacData/workspace/praxis-devos/src/core/project/state.js`

---

## 🎯 Quick Navigation by Task

### "I want to understand what this does"
→ Read: **DEVOS_DOCS_SUMMARY.md**

### "I need to implement something similar"
→ Read: **DEVOS_DOCS_COMPREHENSIVE_GUIDE.md** then **DEVOS_DOCS_FULL_REFERENCE.md**

### "I need exact content from a specific file"
→ Go to: **DEVOS_DOCS_FULL_REFERENCE.md** → find section

### "I need to see a production example"
→ Go to: **DEVOS_DOCS_FULL_REFERENCE.md** → section "4. surfaces.yaml - Production Example"

### "I need to understand the AI quality bar"
→ Read: **DEVOS_DOCS_COMPREHENSIVE_GUIDE.md** → section "Content Quality Standards"

### "I need to know about language configuration"
→ Read: **DEVOS_DOCS_COMPREHENSIVE_GUIDE.md** → section "Language & Locale Configuration"

### "I want to see how projection works"
→ Read: **DEVOS_DOCS_COMPREHENSIVE_GUIDE.md** → section "Projection System"

### "I need the JSON contract specification"
→ Go to: **DEVOS_DOCS_FULL_REFERENCE.md** → section "Quick Reference: Callable Interfaces"

---

## 📊 Key Concepts at a Glance

### Three Skills
1. **devos-docs-init**: Initialize docs from scratch (`mode=init`)
2. **devos-docs**: Core skill with both init and refresh capabilities
3. **devos-docs-refresh**: Refresh existing docs (`mode=refresh`)

### Generated Artifacts
1. `docs/surfaces.yaml` - Project surface definitions
2. `docs/codemaps/project-overview.md` - System-level routing
3. `docs/codemaps/module-map.md` - Module guidance (multi-module only)
4. `docs/codemaps/modules/<artifactId>.md` - Per-module details (multi-module only)

### Core Philosophy
**Write for AI readers first.** Optimize for implementation agent orientation during feature work and debugging, not human onboarding.

### Quality Standards
A codemap should help an implementation agent answer:
- "What part of the system owns this change?"
- "What should I read before editing here?"
- "What other modules might I impact?"
- "What risky background flows are hiding?"

If it can't answer these, it's too thin.

### Allowed Write Targets
Only these paths:
- `docs/surfaces.yaml`
- `docs/codemaps/project-overview.md`
- `docs/codemaps/module-map.md`
- `docs/codemaps/modules/<artifactId>.md`

No other paths can be written.

### Key Rules
- **Non-destructive**: Refresh never deletes/renames
- **Validated**: JSON schema checked before writeback
- **Deterministic**: Stable ordering across environments
- **Multilingual**: Locale-aware, configurable language
- **Managed**: User content outside managed sections preserved

---

## 🔄 How It Works (Overview)

```
1. User invokes /devos-docs-init or /devos-docs-refresh
        ↓
2. Claude Code reads project repository
        ↓
3. devos-docs skill scans: manifests, existing codemaps, source files
        ↓
4. Generates high-signal content:
   - surfaces.yaml (YAML)
   - project-overview.md (Markdown)
   - (optional: module-map.md, modules/*.md)
        ↓
5. Returns JSON contract:
   {
     "schemaVersion": 1,
     "mode": "init|refresh",
     "surfacesYaml": "...",
     "codemaps": [...]
   }
        ↓
6. Claude Code validates schema and paths
        ↓
7. Claude Code writes validated content to docs/
```

---

## 🌍 Language & Locale

The project uses **Simplified Chinese (zh-CN)** by default for documentation artifacts.

**Important**: Code identifiers, paths, commands, and technical tokens stay in their original form regardless of language setting.

Configuration in `openspec/config.yaml`:
```yaml
context: |
  OpenSpec artifact language: zh-CN.
  Proposal, design, tasks, and spec artifacts must be written in Simplified Chinese by default.
  Keep code identifiers, commands, paths, capability names, and other technical tokens in their original form.
```

---

## 📖 Recommended Reading Order

1. **First**: DEVOS_DOCS_SUMMARY.md (5 min)
2. **Then**: DEVOS_DOCS_COMPREHENSIVE_GUIDE.md sections on:
   - Skill Definitions (understand input/output)
   - Content Quality Standards (understand AI quality bar)
   - Surfaces.yaml Template & Structure (see examples)
   - Codemap Examples (see production examples)
3. **Reference**: DEVOS_DOCS_FULL_REFERENCE.md (exact content as needed)

---

## 🔗 Related Documentation

### In This Project
- `openspec/specs/ai-first-codemap-guidance/spec.md` - Full specification for AI-first codemap requirements
- `docs/surfaces.yaml` - Production example
- `docs/codemaps/project-overview.md` - Production example
- `src/templates/docs-lite/` - Minimal templates

### Generated By praxis-devos
- `~/.claude/skills/devos-docs/SKILL.md` - Installed skill definition
- `~/.claude/commands/devos-docs-*.md` - Installed commands

### In praxis-devos Source
- `assets/skills/devos-docs/SKILL.md` - Source skill definition
- `assets/commands/` - Command definitions
- `src/projection/claude.js` - How skills get projected to Claude
- `src/core/project/adapters.js` - How docs get written

---

## ✨ Key Takeaways

1. **AI-First Design**: These skills prioritize helping AI readers (implementation agents) over human onboarding
2. **High-Signal Content**: Focus on architecture routing, not file listings
3. **Bounded Writeback**: Only 4 allowed write targets prevent sprawl
4. **Non-Destructive Updates**: Refresh mode never loses existing content
5. **Deterministic**: Stable ordering ensures consistency across environments
6. **Validated**: Contract validation before writeback prevents errors
7. **Multilingual**: Language-configurable with locale-aware sorting
8. **Managed**: User-authored content outside managed sections is preserved

---

## 📝 Document Maintenance

These documents were generated on **2026-04-11** by analyzing:
- Skill definition files in `~/.claude/`
- Source assets in `/Volumes/MacData/workspace/praxis-devos/assets/`
- Implementation files in project source
- Production examples in project
- Configuration in `openspec/config.yaml`
- Specification in `openspec/specs/ai-first-codemap-guidance/`

To keep these documents current, cross-reference with:
- `~/.claude/skills/devos-docs/SKILL.md` (projected version)
- `/Volumes/MacData/workspace/praxis-devos/assets/skills/devos-docs/SKILL.md` (source version)
- OpenSpec configuration and specifications

---

**Last Updated**: 2026-04-11
**Status**: Complete and comprehensive
**Questions?** Check the relevant section in DEVOS_DOCS_COMPREHENSIVE_GUIDE.md
