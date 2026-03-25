# praxis-devos

> Productized project bootstrap for Codex, Claude Code, and OpenCode.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## What It Does

Praxis DevOS prepares an AI-friendly project workspace with:

- a canonical `.praxis/` directory for shared project rules and skills
- agent adapters such as `AGENTS.md` and `CLAUDE.md`
- an optional technology stack baseline such as `java-spring`
- OpenSpec available for proposal and governance workflows when you need it

The default install path is simple: run `setup`, confirm with `doctor`, add a small amount of project context, and start working with your agent. You do not need to understand foundations, overlays, or ECC internals to get value on day one.

## Quick Start

Prerequisites:

- Node.js `>= 20.19.0`
- Git
- one supported agent: OpenCode, Codex, or Claude Code

### New repo or existing repo, Codex first

```bash
npx praxis-devos setup --agent codex --stack java-spring
npx praxis-devos doctor --strict
```

If you want the framework first and will choose a stack later:

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
```

Then add a stack when you are ready:

```bash
npx praxis-devos use-stack java-spring
```

### Existing Praxis project on a new machine

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
```

### Add another agent later

```bash
npx praxis-devos setup --agent claude
npx praxis-devos doctor --strict
```

Claude Code still needs one manual marketplace step:

```text
/plugin install superpowers@claude-plugins-official
```

## First Use

After `setup`, make two quick edits:

- `AGENTS.md`: project purpose, architecture, key commands, constraints
- `openspec/project.md`: business context and governance context for changes that need a proposal trail

Then start your agent in the repo and work normally.

For day-to-day implementation, debugging, and review, Praxis is designed to feel lightweight:

- start with `setup`
- follow `.praxis/rules.md` and any installed stack skills
- use OpenSpec only when the work needs explicit proposal, review, validation, or archival governance

Detailed onboarding examples live in [docs/getting-started.md](docs/getting-started.md).

## Daily Workflow

Most teams will mainly use these commands:

```bash
npx praxis-devos setup --agent codex --stack java-spring
npx praxis-devos doctor --strict
npx praxis-devos status
npx praxis-devos use-stack java-spring
```

`setup` is the primary entrypoint for:

- first-time onboarding
- setting up a new machine
- adding another agent
- repairing missing OpenSpec or SuperPowers dependencies

`bootstrap`, `init`, and `use-foundation` still exist, but they are advanced repair or internal-facing commands.

## OpenSpec Is Optional For Daily Work

Praxis installs and wraps OpenSpec because some teams want proposal-driven governance. That does not mean every task starts in OpenSpec.

Use normal implementation flow for:

- bug fixes
- agreed feature work
- refactors within an approved scope
- routine review and validation

Use OpenSpec when you need:

- a formal proposal or change record
- spec deltas for behavior changes
- explicit validation or archive steps
- governance-heavy review flows

Examples:

```bash
npx praxis-devos change --title "Add two factor auth" --capability auth
npx praxis-devos openspec validate <change-id> --strict --no-interactive
```

## Project Layout

After setup, the main files are:

```text
your-project/
├── AGENTS.md
├── CLAUDE.md
├── openspec/
└── .praxis/
    ├── manifest.json
    ├── framework-rules.md
    ├── stack.md
    ├── rules.md
    ├── skills/
    └── adapters/
```

`.praxis/` is the canonical project layer. Agent-specific directories are generated adapters, not the source of truth.

## Focused Docs

- [docs/getting-started.md](docs/getting-started.md): install, first use, and common onboarding scenarios
- [docs/dependency-management.md](docs/dependency-management.md): what `setup`, `doctor`, and `bootstrap` handle
- [docs/architecture/command-scenarios.md](docs/architecture/command-scenarios.md): command design model
- [docs/architecture/multi-agent.md](docs/architecture/multi-agent.md): canonical layout and adapter model
- [docs/migration-guide.md](docs/migration-guide.md): migrating older OpenCode-only projects

## Advanced Internals

Praxis automatically applies its built-in runtime baseline on the default path. If you need to inspect that layer, the advanced references are:

- [foundations/README.md](foundations/README.md)
- [profiles/README.md](profiles/README.md)
- [overlays/README.md](overlays/README.md)

Most users do not need these docs to get started.

## Migration

Older OpenCode-only projects can migrate in place:

```bash
npx praxis-devos migrate
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Sponsor

Open source is not easy. If this project helps you, consider buying me a coffee ☕

<img src="https://wxma-1254014761.cos.ap-beijing.myqcloud.com/pay.png" alt="WeChat Pay" width="200" />

## License

Copyright 2024-2026 Praxis DevOS Authors.

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).
