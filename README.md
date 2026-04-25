# praxis-devos

> A lightweight harness that connects OpenSpec governance, SuperPowers skills, and agent-specific adapters inside a user project.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## What It Is

`praxis-devos` prepares a project so OpenCode, Codex, Claude Code, and GitHub Copilot can follow the same outer workflow:

- OpenSpec stays the visible governance flow for propose, apply, validate, and archive
- SuperPowers stays the execution layer for planning, debugging, verification, and similar skills
- agent-specific adapters make those rules discoverable in each tool's native entrypoints

`praxis-devos` is intentionally thin. It is a scaffold and orchestration harness, not a content generator.

## Quick Start

Use `npx` so each run resolves the requested package version directly:

```bash
npx praxis-devos@latest setup --agent codex
npx praxis-devos@latest doctor --strict
```

Choose the agent you actually use:

```bash
# Codex
npx praxis-devos@latest setup --agent codex

# Claude Code
npx praxis-devos@latest setup --agent claude

# OpenCode
npx praxis-devos@latest setup --agent opencode

# GitHub Copilot
npx praxis-devos@latest setup --agent copilot
```

For a shared project used by multiple agents:

```bash
npx praxis-devos@latest setup --agents opencode,codex,claude,copilot
npx praxis-devos@latest doctor --strict
```

## What `setup` Does

Running `npx praxis-devos@latest setup ...` can touch both the project and the local user environment.

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

- install or refresh the bundled `spec-super` company schema in the OpenSpec user-level schema directory
- repair the user's OpenSpec config to `profile: custom`, `delivery: both`, and workflows `propose`, `explore`, `new`, `continue`, `apply`, `ff`, `archive`
- adopt OpenSpec-generated workflow skills and, on supported hosts, thin workflow-entry commands from the project into the selected agent's native discovery location
- project Praxis-owned skills and commands into the selected agent's native discovery location
- repair the user's OpenCode runtime config to remove legacy Praxis plugin entries and keep required runtime plugins
- install or validate OpenSpec availability
- install or validate agent-specific SuperPowers integration

## Core Commands

Most users only need these entrypoints:

| Command | Purpose |
|---|---|
| `setup` | Primary onboarding and repair entrypoint |
| `doctor` | Check OpenSpec, agent dependencies, and projections |
| `install-pack <path-or-git-url>` | Install a local or git-backed extension pack into user-level supported assets |

## Extension Packs

Praxis is meant to stay small at the framework layer. Company-specific skills, commands, stack conventions, and future resource types are better shipped as separate extension packs instead of being hardcoded into this repository.

That split keeps responsibilities clean:

- `praxis-devos`: OpenSpec harness, SuperPowers integration, adapter management, projection, and shared workflow entrypoints
- extension packs: company rules, stack-specific skills, commands, hooks, and additional projection content

### Install a Pack Directly

Use `install-pack` when you want to install a pack explicitly without mutating project configuration:

```bash
npx praxis-devos@latest install-pack ../company-devos-pack --agent codex
npx praxis-devos@latest install-pack git+https://example.com/company/devos-pack.git --stack java --agent claude
```

For packs that use `common/` plus `stacks/`, pass at least one stack:

```bash
npx praxis-devos@latest install-pack ../company-devos-pack --stacks java,golang --agents codex,claude
```

### Project-Declared Packs

Projects can also declare packs in `package.json` so `setup` and `doctor` include them in normal project projection:

```json
{
  "praxis-devos": {
    "skillPacks": [
      "../company-devos-pack",
      {
        "path": "git+https://example.com/company/devos-pack.git",
        "stacks": ["java", "golang"]
      }
    ]
  }
}
```

Use project-declared packs when the pack is part of the project contract. Use `install-pack` for explicit user-level installation.

## Advanced

### Docs Workflows

Praxis treats codemaps and API docs as harnessed workflows rather than hardcoded JS generation. The scaffold routes, projects, validates, and constrains these workflows. It does not generate the human-facing document content itself.

- `devos-docs`: project-wide codemap and surface docs such as `docs/surfaces.yaml` and `docs/codemaps/project-overview.md`
- `devos-change-docs`: change-scoped docs such as `openspec/changes/<change>/blackbox-test.md` and `api-doc.md`
- `project-api-sync`: updates `docs/reference/api.md` after stable API changes land

### How Agent Setup Works

- OpenSpec workflow assets are generated inside the project first, then adopted into user-level agent discovery directories
- OpenCode projects bundled skills and commands and cleans legacy Praxis plugin entries from runtime config
- Codex validates or installs the SuperPowers clone/link layout under `~/.codex/`
- Claude Code validates or installs the official SuperPowers plugin through the Claude CLI
- GitHub Copilot projects bundled skills to the shared Claude-compatible discovery surface at `~/.claude/skills/`

### Repository Layout

If you are working on this package itself, the main directories are:

```text
assets/              # Bundled skills, command assets, overlays, and company schema assets
bin/                 # Published CLI entrypoint
release-kit/         # Maintainer-only release workflow boundary
src/core/            # Scaffold orchestration, runtime checks, adapters, constants
src/projection/      # Agent-specific projection logic
src/templates/       # Managed entry templates
test/                # Unit tests and smoke scripts
```

### Development

```bash
node --test
```

## License

Apache-2.0
