# Dependency Management

Most users only need two commands:

```bash
npx praxis-devos setup --agent codex --stack java-spring
npx praxis-devos doctor --strict
```

This document explains what Praxis manages behind those commands and when to reach for repair commands.

## What Praxis Depends On

Praxis DevOS needs two kinds of external tooling:

- `openspec`: a CLI dependency used for governance-oriented proposal, validation, and archive workflows
- `superpowers`: an agent runtime dependency used by OpenCode, Codex, and Claude Code

These dependencies are managed differently, so Praxis keeps them separate.

## Recommended Path

For normal onboarding, do this:

```bash
npx praxis-devos setup --agent codex --stack java-spring
npx praxis-devos doctor --strict
```

`setup` is the productized entrypoint. It handles installation, initialization, and agent setup in one flow.

Use `doctor` to confirm the current machine is actually ready to work in the repo.

## OpenSpec

OpenSpec is included because some teams want proposal and governance workflows. It is available through the Praxis wrapper:

```bash
npx praxis-devos openspec list --specs
npx praxis-devos openspec validate <change-id> --strict --no-interactive
npx praxis-devos openspec archive <change-id> --yes
```

Praxis resolves OpenSpec in this order:

1. project-local `node_modules/.bin/openspec`
2. global `openspec`

For most users, no separate install step is needed because `setup` installs project-local OpenSpec automatically when required.

OpenSpec is governance-oriented. It is not the required starting point for ordinary implementation, debugging, or review work.

## SuperPowers

SuperPowers provides runtime skills such as debugging, planning, verification, and review support.

Its installation differs by agent:

- OpenCode: project plugin configuration
- Codex: local skills install/link
- Claude Code: marketplace install

Because of that, Praxis does not copy SuperPowers into `.praxis/`. Instead it detects and configures it per agent where possible.

## What `setup` Covers

`setup` is the default answer for:

- first-time onboarding
- setting up a new machine
- adding another agent
- fixing missing OpenSpec or SuperPowers dependencies

It will:

- install or reuse OpenSpec
- configure OpenCode plugin settings
- install Codex SuperPowers automatically when possible
- leave Claude Code on an explicit manual marketplace step
- initialize or refresh project files

## What `doctor` Checks

Examples:

```bash
npx praxis-devos doctor
npx praxis-devos doctor --strict
npx praxis-devos status
```

`doctor` focuses on dependency readiness:

- whether OpenSpec is callable through Praxis
- whether each selected agent has the expected SuperPowers dependency state

`status` is broader project state. `doctor` is the readiness gate.

## When To Use `bootstrap`

Examples:

```bash
npx praxis-devos bootstrap --agent codex
npx praxis-devos bootstrap --agents opencode,codex,claude
```

Use `bootstrap` when you need lower-level repair guidance or want to inspect dependency setup without relying on the higher-level `setup` flow.

In practice:

- `setup`: primary user path
- `doctor`: verification
- `bootstrap`: advanced repair and debugging

## Agent Notes

### OpenCode

Praxis manages OpenCode via project plugin configuration in `opencode.json`.

### Codex

Praxis can install the required SuperPowers layout automatically on the standard path.

### Claude Code

Claude Code still needs a manual marketplace action:

```text
/plugin install superpowers@claude-plugins-official
```

That step should be treated as part of onboarding.
