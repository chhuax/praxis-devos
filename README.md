# praxis-devos

> The AI-Native Development Framework — Runtime Foundations + [OpenSpec](https://github.com/Fission-AI/OpenSpec) Governance + [SuperPowers](https://github.com/obra/superpowers) Execution + Pluggable Stacks

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## What is this?

Praxis DevOS is a framework for AI coding agents such as OpenCode, Codex, and Claude Code. It combines:

- **Runtime foundations** for the AI engineering operating model
- **OpenSpec** for change governance
- **SuperPowers** for execution quality
- **Pluggable stacks** for technology-specific standards

At the framework layer, Praxis treats the runtime foundation and stack as the default daily execution base. OpenSpec remains available for governance and controlled change flows, but it is not the mandatory front door for every task. Testing strategy is chosen based on change risk.

The framework is now designed as a **multi-agent system**. Project state no longer belongs to one runtime like OpenCode. Instead, Praxis keeps canonical assets in `.praxis/` and syncs agent-specific adapters as needed.

## Why praxis-devos?

| Capability | OpenSpec | SuperPowers | Praxis DevOS |
|---|---|---|---|
| Runtime foundation | ❌ | ❌ | ✅ |
| Specification governance | ✅ | ❌ | ✅ |
| Execution skills | ❌ | ✅ | ✅ |
| Stack standards | ❌ | ❌ | ✅ |
| Multi-agent project layout | ❌ | ❌ | ✅ |

Praxis DevOS = Foundations (BASE) + OpenSpec (GOVERNANCE) + SuperPowers (HOW) + Pluggable Stacks (STANDARD).

## Architecture

Canonical project state lives in `.praxis/`. Agent adapters are projections, not the source of truth.

```text
┌────────────────────────────────────────────────────────────┐
│                      Canonical Layer                        │
│     AGENTS.md + CLAUDE.md + openspec/ + .praxis/           │
├───────────────────────────────┬────────────────────────────┤
│ Runtime Adapters              │ Framework Engine           │
│ OpenCode / Codex / Claude     │ RULES.md + stacks + skills │
└───────────────────────────────┴────────────────────────────┘
```

Project layout after initialization:

```text
your-project/
├── AGENTS.md                  # Universal project context, used by Codex
├── CLAUDE.md                  # Claude Code memory file
├── openspec/                  # OpenSpec structure
└── .praxis/                   # Canonical Praxis state
    ├── manifest.json
    ├── foundation/
    │   ├── README.md
    │   └── profile/
    ├── framework-rules.md
    ├── overlays/
    ├── stack.md
    ├── rules.md
    ├── skills/
    └── adapters/
        └── compiled-rules.md
```

OpenCode compatibility is still supported. `npx praxis-devos sync --agent opencode` now keeps `.opencode/` as a minimal compatibility marker while the plugin prioritizes canonical assets from `.praxis/` and treats `.opencode/skills/` as an optional supplemental layer.

Detailed architecture and migration notes:

- [docs/architecture/multi-agent.md](docs/architecture/multi-agent.md)
- [docs/architecture/foundation-overlays.md](docs/architecture/foundation-overlays.md)
- [docs/architecture/command-scenarios.md](docs/architecture/command-scenarios.md)
- [docs/dependency-management.md](docs/dependency-management.md)
- [docs/migration-guide.md](docs/migration-guide.md)
- [docs/releases/v0.2.0.md](docs/releases/v0.2.0.md)
- [docs/releases/v0.2.1.md](docs/releases/v0.2.1.md)
- [docs/releases/v0.2.2.md](docs/releases/v0.2.2.md)
- [docs/releases/v0.2.3.md](docs/releases/v0.2.3.md)

## Quick Start

Read Quick Start by scenario, not by internal command layering.

Current release target:

- Supported for release: macOS, Linux, Windows PowerShell
- On Windows, use PowerShell for Codex bootstrap so the generated SuperPowers junction commands work as documented

### 1. New project, Codex + Java Spring

```bash
npx praxis-devos setup --agent codex --foundation ecc-foundation --stack java-spring
npx praxis-devos doctor --strict
```

### 2. New project, framework first, stack later

```bash
npx praxis-devos setup --agent codex --foundation ecc-foundation
npx praxis-devos doctor --strict
```

When you are ready to apply or inspect more runtime layers:

```bash
npx praxis-devos list-foundations
npx praxis-devos use-foundation ecc-foundation
npx praxis-devos use-stack java-spring
npx praxis-devos doctor --strict
```

### 3. Existing initialized project, new machine

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
```

### 4. Existing project, add another agent later

```bash
npx praxis-devos setup --agent claude
npx praxis-devos doctor --strict
```

Claude Code still requires one manual marketplace step after `setup`:

```text
/plugin install superpowers@claude-plugins-official
```

### 5. Multi-agent from day one

```bash
npx praxis-devos setup --agents opencode,codex,claude --stack java-spring
npx praxis-devos doctor --strict
```

What `setup` does:

- create or refresh `openspec/`
- create canonical `.praxis/`
- install or reuse OpenSpec
- auto-configure or auto-install supported runtime dependencies for the selected agents
- optionally apply the chosen runtime foundation if `--foundation` is provided
- copy customizable skills into `.praxis/skills/`
- mirror framework gates into `.praxis/framework-rules.md`
- sync adapters for the selected agents
- optionally apply the chosen stack if `--stack` is provided

Important command roles:

- `setup` is the user-facing entrypoint
- `init` is the lower-level framework skeleton command
- `use-foundation` applies a runtime foundation after framework initialization
- `use-stack` applies a stack after framework initialization
- `bootstrap` remains available as an advanced repair/debug command
- `sync` remains available when you want to refresh adapters explicitly after manual edits

`setup` is the recommended onboarding command. It auto-configures OpenCode, auto-installs Codex SuperPowers, and leaves only Claude Code on a manual marketplace path that still needs user confirmation.

### 2. Fill in project context

Edit:

- `AGENTS.md`
- `openspec/project.md`

### 3. Optional: install the OpenCode plugin

Add to your project's `opencode.json`:

```json
{
  "plugin": [
    "praxis-devos",
    "superpowers@git+https://github.com/obra/superpowers.git"
  ]
}
```

Then restart OpenCode.

The plugin no longer owns initialization. It reads `.praxis/` and exposes thin wrappers such as `praxis-init`, `praxis-sync`, `praxis-migrate`, `praxis-change`, `praxis-status`, and `praxis-openspec`.

## How Rule Gating Works

The framework source of truth for gating rules remains `RULES.md`, but each initialized project also gets `.praxis/framework-rules.md`.

`npx praxis-devos sync` then distributes the same rule model through the best adapter for each runtime:

- OpenCode: system prompt injection
- Codex: managed block in `AGENTS.md`
- Claude Code: managed block in `CLAUDE.md`

Before that distribution step, Praxis generates a shared intermediate artifact at `.praxis/adapters/compiled-rules.md`.

That compiled rules artifact also includes a dependency gate summary, so agents can see when `openspec` or the current runtime's `superpowers` installation is missing and stop before implementation.

If `AGENTS.md` or `CLAUDE.md` already exists, Praxis only appends or refreshes the managed block between `<!-- PRAXIS_DEVOS_START -->` and `<!-- PRAXIS_DEVOS_END -->`. User-owned content outside that block is preserved.

Praxis also treats `/change` as the explicit proposal entrypoint, with `/proposal` kept as a compatibility alias. This is a text-level workflow convention, not a guarantee that every agent runtime exposes a native slash command with that exact name. In Codex and Claude, the managed block uses those tokens to mean "enter the proposal path", while the executable scaffold entrypoint remains `npx praxis-devos change` / `npx praxis-devos proposal`. If the request is still ambiguous, agents should enter `brainstorming` before choosing a full or lightweight proposal.

All command examples below assume project-local usage via `npx`; a global install is optional, not required.

## CLI

```bash
npx praxis-devos setup --agent codex --foundation ecc-foundation --stack java-spring
npx praxis-devos use-foundation ecc-foundation
npx praxis-devos use-stack java-spring
npx praxis-devos init
npx praxis-devos sync --agents opencode,codex,claude
npx praxis-devos migrate
npx praxis-devos change --title "Add two factor auth" --capability auth
npx praxis-devos status
npx praxis-devos doctor --strict
npx praxis-devos bootstrap --agents codex
npx praxis-devos openspec list --specs
npx praxis-devos list-foundations
npx praxis-devos list-stacks
```

Notes:

- `setup` is the recommended entrypoint for onboarding, repair, and add-agent scenarios
- `init` is the lower-level framework initialization command
- `use-foundation` applies a runtime foundation profile and overlay set after framework initialization
- `use-stack` applies a stack after framework initialization
- Without `--agent` / `--agents`, Praxis defaults to `opencode,codex,claude`
- You can target a single agent, for example `--agents codex`
- Later expansion is additive: `sync --agent opencode` merges `opencode` into the project's configured agents instead of replacing the existing ones

## Dependency Management

Praxis DevOS has two runtime dependencies:

- `openspec` as a CLI dependency
- `superpowers` as an agent runtime dependency

OpenSpec is invoked through `npx praxis-devos openspec ...`, preferring a project-local installation and falling back to a global install only for compatibility. In the ECC foundation direction, OpenSpec is positioned as a governance layer, not as the default front door for daily implementation work.

Because Superpowers installs differently on OpenCode, Codex, and Claude Code, Praxis does not copy it into `.praxis/`. Instead it exposes dependency commands:

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor
npx praxis-devos bootstrap --agents codex
npx praxis-devos bootstrap --agents claude
```

## Runtime Foundations

Built-in runtime foundations live in `foundations/`, `profiles/`, and `overlays/`.

- A foundation declares a runtime operating model such as `ecc-foundation`
- A profile seeds `.praxis/foundation/profile/`
- Overlays seed `.praxis/overlays/` with extension seams

The first milestone ships `ecc-foundation`, which:

- treats ECC as the runtime base concept
- keeps all internal capabilities as non-proprietary placeholders
- reserves extension seams for future internal MCP, docs, commands, hooks, rules, and skills
- keeps OpenSpec available for governance without making it the mandatory daily workflow path

## Skills

### Framework Skills

Bundled with the framework:

- `openspec`: governance workflow skill
- `git-workflow`: customizable Git lifecycle guidance
- `code-review`: customizable review process

### Project Skills

Installed into `.praxis/skills/` during `init`. These are safe to customize in the target project.
Praxis also generates `.praxis/skills/INDEX.md` so Codex / Claude managed blocks can surface the currently installed project skills instead of only relying on raw file discovery.

### Stack Skills

Each stack can provide domain-specific skills such as database, security, error handling, or testing guidance. These are also installed into `.praxis/skills/`.
Those stack assets are intended as initial baselines. After installation, teams are expected to keep adapting `.praxis/rules.md` and `.praxis/skills/` to their own company or project conventions.

## Stacks

Available stacks live in `stacks/`.

```text
stacks/{stack-name}/
├── stack.md
├── rules.md
└── skills/
```

Create a new stack by copying `stacks/starter/`.

## Migration

Older OpenCode-only projects can migrate in place:

```bash
npx praxis-devos migrate
```

This copies legacy `.opencode` project assets into `.praxis/` and then regenerates adapters.

## Prerequisites

| Requirement | Version | Description |
| :--- | :--- | :--- |
| Node.js | >= 20.19.0 | Runtime for the CLI |
| Git | Any | Repository management |
| AI Agent | Latest | OpenCode, Codex, or Claude Code |

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md).

## Sponsor

Open source is not easy. If this project helps you, consider buying me a coffee ☕

<img src="https://wxma-1254014761.cos.ap-beijing.myqcloud.com/pay.png" alt="WeChat Pay" width="200" />

## License

Copyright 2024-2026 Praxis DevOS Authors.

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).
