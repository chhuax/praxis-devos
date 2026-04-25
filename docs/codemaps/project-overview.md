# praxis-devos — Project Overview

_Scanned: 2026-04-11 | Scope: full repository_

## Project Summary

`praxis-devos` is a CLI scaffold and orchestration harness (not a content generator) that connects three layers inside a user project: **OpenSpec** governance for propose/apply/validate/archive workflows, **SuperPowers** as the execution layer for skills like planning and debugging, and **agent-specific adapters** that make those rules natively discoverable in Claude Code, Codex, OpenCode, and GitHub Copilot. It installs and validates external dependencies, writes and refreshes managed blocks in project root files, and projects bundled skills, configured external skill packs, plus supported host command entrypoints into each agent's native user-level discovery directories.

## First-Read Paths

| Path | Why |
|---|---|
| `src/core/praxis-devos.js` | CLI command routing and top-level orchestration |
| `src/core/project/adapters.js` | Project init, sync, and managed-block logic |
| `src/core/runtime/dependencies.js` | Doctor/setup/bootstrap orchestration entry |
| `src/core/runtime/agent-dependencies.js` | Per-agent SuperPowers detection and install |
| `src/core/runtime/openspec.js` | OpenSpec detection, install, and bootstrap |
| `src/projection/index.js` | Projection dispatch to agent adapters |
| `src/projection/service.js` | Resource-oriented projection orchestrator that runs supported resource projectors per agent |
| `src/projection/pack-resources.js` | External pack config parsing plus local/git resource discovery |
| `src/projection/claude.js` | Claude agent projector for skill and command resources |
| `src/projection/copilot.js` | GitHub Copilot projection via shared Claude-compatible skills surface |
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
              ├── projection/service.js (resource-oriented planning + execution)
              ├── projection/resources/*.js (skills, commands, future rules)
              ├── projection/pack-resources.js (project package.json external pack sources)
              ├── projection/claude.js
              ├── projection/copilot.js
              ├── projection/codex.js
              ├── projection/opencode.js
              └── projection/markers.js (marker inject/parse)
```

**Key boundary rule:** `src/core/praxis-devos.js` and all JS under `src/core/` and `src/projection/` are scaffold/deterministic code only. Human-facing doc generation belongs to skills, not JS.

## Main Flows

### `npx praxis-devos setup --agent <name>`

1. `setupProject()` in `praxis-devos.js`
2. `ensureOpenSpecRuntime()` — detect or npm-install `@fission-ai/openspec` globally
3. `ensureRuntimeDependencies()` — detect or install per-agent SuperPowers
4. `initProject()` or `syncProject()` based on whether `openspec/` exists
   - `initProject()` → runs `openspec init` + `ensureFrameworkFiles()` + `syncProject()`
   - `syncProject()` → calls per-agent sync to upsert managed blocks in `AGENTS.md` / `CLAUDE.md` / `.opencode/`
5. `projectNativeSkills()` → `projection/index.js` → projection service runs each supported resource projector (`skills`, `commands`, future `rules`) against the selected agent and projects bundled assets, configured external pack assets, and OpenSpec-generated workflow assets into agent native dirs
6. `populateOpenSpecConfig()` — binds `openspec/config.yaml` to `schema: spec-super`
7. `doctorProject()` — read-only health report

### `npx praxis-devos update`

Refreshes project and user-level Praxis/OpenSpec state: runs `syncProject()` + `projectNativeSkills()`, and also installs or refreshes the bundled OpenSpec schema and repairs the OpenSpec user config. It does not perform the broader dependency install flow used by `setup`.

### `npx praxis-devos install-pack <path-or-git-url> --stack <name>`

Projects the selected external pack directly into the user-level managed directories for every currently supported resource type without mutating project files. The source may be a local path or a git URL; git-backed packs are cached under `~/.praxis-devos/pack-cache` and refreshed on repeat installs. For `common/<resource> + stacks/*/<resource>` layouts, the command requires at least one explicit `--stack`.

### `npx praxis-devos doctor`

Read-only: checks OpenSpec runtime, per-agent SuperPowers, and projection coverage.

### Projection lifecycle

- Write: `projection/index.js` → agent adapter writes `<!-- PRAXIS_PROJECTION source=... version=... -->` marker into each SKILL.md via `markers.js`
- Stale cleanup: each resource projector owns its own managed cleanup so adding `rules` later does not require changing skill or command cleanup logic
- Safety: `managed-assets.js` registry prevents overwriting user-owned files

## External Surfaces and Dependencies

| Dependency | Source | Install path |
|---|---|---|
| `@fission-ai/openspec` | npm global | auto-installed by `setup`; needed for `openspec init` |
| SuperPowers (Claude) | Claude CLI plugin | `claude plugin install <plugin> --scope user` |
| SuperPowers (Copilot) | no extra runtime dependency | projects to `~/.claude/skills/` |
| SuperPowers (Codex) | git clone + symlink | `~/.codex/superpowers` + `~/.codex/skills/superpowers → ...` |
| SuperPowers (OpenCode) | JSON config merge | `~/.config/opencode/config.json` plugin array |

**Managed project files written by Praxis:**
- `AGENTS.md` — shared project rules block (`<!-- PRAXIS_DEVOS_START/END -->`)
- `CLAUDE.md` — thin `@AGENTS.md` import block
- `.opencode/README.md` — compatibility marker dir
- `openspec/` — OpenSpec workspace (`specs/`, `changes/`, `changes/archive/`)
- `openspec/config.yaml` — optional context injection

**Managed project configuration read by Praxis when project-bound external packs are used:**
- `package.json["praxis-devos"].skillPacks` — optional external enterprise pack list using local paths or git URLs; currently supports `skills/*`, `commands/*`, and their `common + stacks/*` layouts. The current `install-pack` command does not write this field.

## Problem Routing

| Change type | Where to look |
|---|---|
| Adding/removing a CLI command | `src/core/praxis-devos.js` → `runCli()` + implement in `adapters.js` or `runtime/` |
| Changing managed block content | `src/core/project/adapters.js` → `renderManagedBlock()` or template at `src/templates/managed-entry.md` |
| Changing skill or command projection | `src/projection/resources/*.js` + `src/projection/<agent>.js` |
| Adding a new bundled skill | Drop a `SKILL.md` in `assets/skills/<name>/`; projection picks it up automatically |
| Adding or debugging external enterprise pack resources | `package.json["praxis-devos"].skillPacks` + `src/projection/pack-resources.js` |
| Adding a new bundled command | Add asset to `assets/commands/`; resource projection picks it up automatically |
| Changing how OpenSpec is detected/installed | `src/core/runtime/openspec.js` |
| Changing per-agent SuperPowers detection/install | `src/core/runtime/agent-dependencies.js` |
| Adding a new agent | Add to `SUPPORTED_AGENTS` in `state.js`, add projector in `projection/`, add sync in `adapters.js`, add detection in `agent-dependencies.js` |
| Changing marker format | `src/projection/markers.js` — affects both write and stale detection |

## Constraints and Repo Rules

- **No build step** — pure ESM, Node >=20.19.0, runs directly
- **Scaffold boundary** — `src/core/` JS must not generate human-facing content; that belongs in `assets/skills/`
- **Immutable updates** — managed blocks use regex replace, not in-place mutation; stale projection cleanup uses `fs.rmSync` on the whole dir
- **Marker-gated writes** — `canSafelyOverwrite()` in `managed-assets.js` prevents overwriting files not owned by Praxis
- **Release safety** — never publish npm version or push release tags without explicit user confirmation (see `CLAUDE.md`)
- **Tests** — run with `node --test`; smoke test via `test/install-smoke-cli.mjs`
- **OpenCode integration** — OpenCode uses projected skills/commands plus runtime config cleanup; Praxis no longer ships an OpenCode plugin entrypoint
- **Projection extensibility** — new resource types such as `rules` should be added as a new resource projector plus per-agent handlers, without changing existing `skills` or `commands` projectors
