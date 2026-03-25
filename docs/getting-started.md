# Getting Started

This guide is the shortest path to a working Praxis DevOS project.

## Before You Start

You need:

- Node.js `>= 20.19.0`
- Git
- one supported agent: OpenCode, Codex, or Claude Code

## 1. Run Setup

For most users, `setup` is the only command to remember.

### New or existing repo, Codex first

```bash
npx praxis-devos setup --agent codex --stack java-spring
npx praxis-devos doctor --strict
```

### Framework first, choose a stack later

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
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

## 2. What `setup` Does

`setup` handles the normal out-of-box flow:

- installs or reuses OpenSpec
- installs or configures agent runtime dependencies where possible
- creates `openspec/`
- creates `.praxis/`
- syncs agent adapters such as `AGENTS.md` and `CLAUDE.md`
- applies the selected stack if you pass `--stack`
- applies the built-in runtime baseline automatically on the default path

You do not need to run `init`, `bootstrap`, or `use-foundation` for standard onboarding.

## 3. Add Project Context

After setup, edit these files:

- `AGENTS.md`
- `openspec/project.md`

Keep both concise. A few useful paragraphs are enough:

- what the product does
- core modules
- important commands
- project constraints
- business or governance context that matters for larger changes

## 4. Start Working

For everyday work, start your agent in the repo and work normally.

Praxis is designed so daily implementation starts from the installed project baseline:

- `.praxis/rules.md`
- `.praxis/stack.md`
- installed skills in `.praxis/skills/`

You do not need to learn foundation or ECC internals before using the project.

## 5. When To Use OpenSpec

OpenSpec is included because some changes need governance. It is not the required front door for routine tasks.

Use the normal implementation flow for:

- bug fixes
- routine refactors
- already-approved feature work
- ordinary review and validation

Use OpenSpec when you need:

- a proposal or change record
- spec deltas
- formal validation
- an archive trail

Examples:

```bash
npx praxis-devos change --title "Add two factor auth" --capability auth
npx praxis-devos openspec validate <change-id> --strict --no-interactive
```

## 6. Useful Commands

```bash
npx praxis-devos setup --agent codex --stack java-spring
npx praxis-devos doctor --strict
npx praxis-devos status
npx praxis-devos use-stack java-spring
npx praxis-devos change --title "Add two factor auth" --capability auth
```

Advanced commands:

- `npx praxis-devos bootstrap`: repair-oriented dependency guidance
- `npx praxis-devos init`: lower-level initialization
- `npx praxis-devos use-foundation`: advanced runtime baseline repair/re-apply

## 7. Where To Read Next

- [README.md](../README.md)
- [docs/dependency-management.md](dependency-management.md)
- [docs/architecture/multi-agent.md](architecture/multi-agent.md)
- [docs/migration-guide.md](migration-guide.md)
