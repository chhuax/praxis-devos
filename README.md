# praxis-devos

> OpenSpec governance + SuperPowers execution for OpenCode, Codex, and Claude Code.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## What It Does

`praxis-devos` prepares a user project so different coding agents follow the same workflow rules:

- OpenSpec for proposal, spec, validation, and archive flows
- SuperPowers for execution skills such as planning, debugging, and completion verification
- Agent-specific adapters for OpenCode, Codex, and Claude Code

This package is meant to be installed into the user project and then run there with `npx praxis-devos ...`.

## Project Layout

After `setup`, a user project typically contains:

```text
your-project/
├── AGENTS.md          # Managed Codex entry block
├── CLAUDE.md          # Managed Claude Code entry block
├── openspec/          # OpenSpec workspace
├── .opencode/         # OpenCode compatibility marker when selected
└── opencode.json      # OpenCode plugin config when selected
```

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

Praxis now uses the Claude CLI to install SuperPowers automatically:

```bash
claude plugin install superpowers@claude-plugins-official --scope user
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
| `init` | Lower-level project skeleton initialization |
| `sync` | Refresh managed adapter outputs |
| `migrate` | Legacy compatibility command; currently re-syncs adapters |
| `status` | Show current project/runtime state |
| `doctor` | Check OpenSpec and SuperPowers dependencies |
| `bootstrap` | Print repair/install guidance without full setup |
| `openspec` | Pass through to the resolved OpenSpec runtime |
| `validate-session` | Validate a transcript against Praxis hook evidence |

## Runtime Behavior

`setup` currently does the following:

- ensure OpenSpec is available, installing it locally when needed
- install or configure SuperPowers for the selected agents when the runtime supports automation
- create or refresh `openspec/`
- write managed entry blocks into `AGENTS.md` and `CLAUDE.md`
- create the minimal `.opencode/README.md` compatibility marker for OpenCode
- run dependency checks after setup

Agent-specific runtime behavior:

- OpenCode: writes plugin declarations into `opencode.json`
- Codex: clones SuperPowers into `~/.codex/superpowers` and links skills into `~/.agents/skills/superpowers`
- Claude Code: runs `claude plugin install superpowers@claude-plugins-official --scope user`

## OpenSpec + SuperPowers Contract

Praxis does not replace OpenSpec or SuperPowers. It binds them together.

Managed entry blocks tell agents to:

- use `/opsx:propose` or `/opsx:explore` for proposal/exploration flow
- perform Proposal Intake before implementation
- load `superpowers:brainstorming` when proposal scope is still unclear
- load `superpowers:writing-plans` before multi-step implementation
- load `superpowers:subagent-driven-development` when parallel execution is appropriate
- load `superpowers:systematic-debugging` before fixing a bug or failed test
- load `superpowers:verification-before-completion` before claiming work is done
- use `npx praxis-devos openspec ...` for OpenSpec operations

## Enterprise Extension Packs

Praxis is intentionally kept as the core framework layer. Enterprise-specific assets are expected to live in separate extension packages rather than being hardcoded into this repository.

That extension-pack model is meant for assets such as:

- company rules
- company skills
- company hooks
- language- or domain-specific standards
- common layer + stack layer packaging

One example is an external rules pack such as `iuap-rules-pack`, which organizes:

- `common/` shared enterprise assets
- `stacks/<stack>/` stack-specific assets
- `rules/`, `skills/`, and `hooks/` as separate deliverable types
- target-specific projection into Claude, Codex, and OpenCode native surfaces

That gives Praxis a useful split of responsibilities:

- `praxis-devos`: OpenSpec governance, SuperPowers runtime setup, agent adapter management, unified workflow entrypoints
- enterprise extension pack: enterprise rules/skills/hooks content and target-specific projection logic

The next planned step is for `praxis-devos` to expose a unified extension-pack entrypoint such as `praxis-devos install-rules`. That integration is close and should be understood as the near-term product direction, but it is not yet a finished command in this repository today.

## Repository Layout

This repository itself is a package source repo. The important directories are:

```text
assets/            # Bundled OpenSpec skill assets
bin/               # Published CLI entrypoint
src/core/          # Main setup/doctor/sync CLI logic
src/projection/    # Agent-specific projection logic
src/templates/     # Managed entry block templates
test/              # Unit tests and install smoke scripts
```

## Development

Run tests locally:

```bash
npm test
```

Install smoke for a packed tarball:

```bash
npm pack
node test/install-smoke-cli.mjs --package ./praxis-devos-<version>.tgz --scenario opencode
node test/install-smoke-cli.mjs --package ./praxis-devos-<version>.tgz --scenario claude
```

`codex` install smoke is also supported, but it exercises the Codex clone/link path and is more environment-sensitive.

## License

Apache-2.0
