# praxis-devos — Project Overview

_Scanned: 2026-04-11 | Scope: full repository_

## Project Summary

`praxis-devos` is a CLI scaffold and orchestration harness (not a content generator) that connects three layers inside a user project: **OpenSpec** governance for propose/apply/validate/archive workflows, **SuperPowers** as the execution layer for skills like planning and debugging, and **agent-specific adapters** that make those rules natively discoverable in Claude Code, Codex, OpenCode, and GitHub Copilot. It installs and validates external dependencies, writes and refreshes managed blocks in project root files, and projects bundled skills/commands into each agent's native user-level discovery directories.

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
| `src/projection/copilot.js` | GitHub Copilot projection via shared Claude-compatible skills/commands surfaces |
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
5. `projectNativeSkills()` → `projection/index.js` → per-agent projector writes bundled `assets/skills/*/SKILL.md` files to agent native dirs
6. `populateOpenSpecConfig()` — optionally populates `openspec/config.yaml` context
7. `doctorProject()` — read-only health report

### `npx praxis-devos sync`

Refresh only: `syncProject()` + `projectNativeSkills()`. No dependency install.

### `npx praxis-devos doctor`

Read-only: checks OpenSpec runtime, per-agent SuperPowers, and projection coverage.

### Projection lifecycle

- Write: `projection/index.js` → agent adapter writes `<!-- PRAXIS_PROJECTION source=... version=... -->` marker into each SKILL.md via `markers.js`
- Stale cleanup: `cleanStaleProjections()` in each adapter removes skill dirs whose name is no longer in `assets/skills/`
- Safety: `managed-assets.js` registry prevents overwriting user-owned files

## External Surfaces and Dependencies

| Dependency | Source | Install path |
|---|---|---|
| `@fission-ai/openspec` | npm global | auto-installed by `setup`; needed for `openspec init` |
| SuperPowers (Claude) | Claude CLI plugin | `claude plugin install <plugin> --scope user` |
| SuperPowers (Copilot) | no extra runtime dependency | projects to `~/.claude/skills/` + `~/.claude/commands/` |
| SuperPowers (Codex) | git clone + symlink | `~/.codex/superpowers` + `~/.codex/skills/superpowers → ...` |
| SuperPowers (OpenCode) | JSON config merge | `~/.config/opencode/config.json` plugin array |

**Managed project files written by Praxis:**
- `AGENTS.md` — shared project rules block (`<!-- PRAXIS_DEVOS_START/END -->`)
- `CLAUDE.md` — thin `@AGENTS.md` import block
- `.opencode/README.md` — compatibility marker dir
- `openspec/` — OpenSpec workspace (`specs/`, `changes/`, `changes/archive/`)
- `openspec/config.yaml` — optional context injection

## Problem Routing

| Change type | Where to look |
|---|---|
| Adding/removing a CLI command | `src/core/praxis-devos.js` → `runCli()` + implement in `adapters.js` or `runtime/` |
| Changing managed block content | `src/core/project/adapters.js` → `renderManagedBlock()` or template at `src/templates/managed-entry.md` |
| Changing skill or command projection | `src/projection/<agent>.js` → `projectSkills()` / `projectCommands()` |
| Adding a new bundled skill | Drop a `SKILL.md` in `assets/skills/<name>/`; projection picks it up automatically |
| Adding a new bundled command | Add asset to `assets/commands/`; register name in `projection/claude.js:commandNames` |
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
- **OpenCode plugin entrypoint** — `opencode-plugin.js` at repo root (declared as `"main"` in `package.json`)
