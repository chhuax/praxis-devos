# praxis-devos

> A lightweight harness that connects OpenSpec governance, SuperPowers skills, and agent-specific adapters inside a user project.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## What It Is

`praxis-devos` prepares a project so OpenCode, Codex, and Claude Code can follow the same outer workflow:

- OpenSpec stays the visible governance flow for propose, apply, validate, and archive
- SuperPowers stays the execution layer for planning, debugging, verification, and similar skills
- agent-specific adapters make those rules discoverable in each tool's native entrypoints

`praxis-devos` is intentionally thin. It is a scaffold and orchestration harness, not a content generator.

## What `setup` Changes

Running `npx praxis-devos setup ...` can touch both the project and the local user environment.

Inside the project, Praxis may create or refresh:

```text
your-project/
├── AGENTS.md          # Shared project rules for supported agents
├── CLAUDE.md          # Thin Claude wrapper that imports @AGENTS.md
├── openspec/          # OpenSpec workspace
├── .opencode/         # OpenCode compatibility marker when selected
└── opencode.json      # Project-level OpenCode config when selected
```

Outside the project, Praxis may also:

- project bundled skills and commands into the selected agent's native discovery location
- configure OpenCode plugins in the user's OpenCode config when automation is supported
- install or validate OpenSpec availability
- install or validate agent-specific SuperPowers integration

## Quick Start

### Codex

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
```

### Claude Code

```bash
npx praxis-devos setup --agent claude
npx praxis-devos doctor --strict
```

### OpenCode

```bash
npx praxis-devos setup --agent opencode
npx praxis-devos doctor --strict
```

### Multi-Agent Project

```bash
npx praxis-devos setup --agents opencode,codex,claude
npx praxis-devos doctor --strict
```

## Commands

| Command | Purpose |
|---|---|
| `setup` | Primary onboarding and repair entrypoint |
| `init` | Initialize the project skeleton and managed adapters |
| `sync` | Refresh managed adapters and native projections |
| `status` | Show current project and dependency state |
| `doctor` | Check OpenSpec, agent dependencies, and projections |
| `bootstrap` | Print or apply dependency bootstrap guidance |

## Docs Workflows

Praxis treats codemaps and API docs as harnessed workflows rather than hardcoded JS generation. The JS scaffold routes, projects, validates, and constrains these workflows — it does not generate the human-facing document content itself.

### Project-level docs

Use the `devos-docs` skill (available after `setup`) for project-wide codemap and surface docs:

| Mode | What it produces |
|---|---|
| `init` | `docs/surfaces.yaml`, `docs/codemaps/project-overview.md`, and related codemap files |
| `refresh` | Refreshes existing codemap files based on current codebase state |

Invoke via your agent's skill system, for example `/devos-docs-init` or `/devos-docs-refresh`.

### Change-level docs

Use the `devos-change-docs` skill during an OpenSpec change for change-scoped documentation:

| Mode | What it produces |
|---|---|
| `change-blackbox` | `openspec/changes/<change>/blackbox-test.md` — observable behavior from the outside |
| `change-api` | `openspec/changes/<change>/api-doc.md` — API contract changes for this change |
| `project-api-sync` | Updates `docs/reference/api.md` with stable API changes after a change lands |

`opsx-propose` injects the relevant doc tasks automatically based on the change type. `opsx-archive` checks for API sync evidence or an explicit waiver before archiving API-impacting changes.

## How Agent Setup Works

Praxis keeps the same high-level contract across tools, but each agent has a different runtime path:

- OpenCode: merges required plugin declarations into the user's OpenCode config and projects bundled assets
- Codex: validates or installs the SuperPowers clone/link layout under `~/.codex/`
- Claude Code: validates or installs the official SuperPowers plugin through the Claude CLI

`bootstrap` is the lower-friction repair path when you want dependency guidance without running the full project setup flow.

## Extension Packs

Praxis is meant to stay small at the framework layer. Company-specific rules, skills, hooks, or stack conventions are better shipped as separate extension packs instead of being hardcoded into this repository.

That split keeps responsibilities clean:

- `praxis-devos`: OpenSpec harness, SuperPowers integration, adapter management, projection, and shared workflow entrypoints
- extension packs: company rules, stack-specific skills, hooks, and additional projection content

## Repository Layout

If you are working on this package itself, the important directories are:

```text
assets/              # Bundled skills and command assets
bin/                 # Published CLI entrypoint
src/core/            # Scaffold orchestration, runtime checks, adapters, constants
src/projection/      # Agent-specific projection logic
src/templates/       # Managed entry templates
test/                # Unit tests and smoke scripts
```

## Development

Run tests locally:

```bash
node --test
```

Install smoke for a packed tarball:

```bash
npm pack
node test/install-smoke-cli.mjs --package ./praxis-devos-<version>.tgz --scenario opencode
node test/install-smoke-cli.mjs --package ./praxis-devos-<version>.tgz --scenario claude
```

## License

Apache-2.0
