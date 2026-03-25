# Contributing to Praxis DevOS

We're excited to have you contribute to Praxis DevOS. This guide explains the architectural boundaries contributors should preserve.

## Project Architecture

Praxis DevOS is built around four layers:

- **Framework rules** (`RULES.md`): global workflow and dispatch rules
- **Universal skills** (`skills/`): technology-agnostic process skills
- **Technology stacks** (`stacks/`): `stack.md`, `rules.md`, and optional domain skills
- **Canonical project state** (`.praxis/` in downstream projects): the only source of truth for installed project assets

OpenCode, Codex, and Claude Code must be treated as adapter targets, not as owners of the project state.

## How to Contribute

### Adding a Universal Skill

Universal skills should remain PROCESS-focused and stack-neutral.

1. Create `skills/{skill-name}/SKILL.md`
2. Follow the standard skill format
3. Avoid language-specific examples unless the skill is explicitly stack-bound

### Adding a Technology Stack

1. Copy `stacks/starter/` into `stacks/{new-stack}/`
2. Complete `stack.md` with runtime versions, build tools, and commands
3. Define coding constraints in `rules.md`
4. Add domain-specific skills under `skills/`
5. Update documentation when the stack becomes public

### Improving Existing Content

- Fix clarity, examples, and terminology
- Keep universal skills technology-neutral
- Keep stack skills scoped to their stack
- Preserve the multi-agent architecture boundaries

## Development Setup

You will need:

- **Node.js >= 20.19.0**
- **Git**

Use the external CLI for project initialization and migration:

```bash
node bin/praxis-devos.js init --stack starter
node bin/praxis-devos.js sync
```

## Coding and Documentation Guidelines

- **Code Identifiers**: English only
- **Language Policy**: `docs/` 下文档默认可使用中文；面向国际读者的根文档保持英文或中英双语
- **Commit Messages**: Conventional Commits, e.g. `feat(cli): add migrate command`
- **Focus**: Keep pull requests granular

### CLI Product Contract

Contributors changing onboarding, dependency handling, or CLI UX must preserve these rules:

1. Strong dependencies that Praxis can install automatically must be installed automatically
2. Manual user actions must appear in the main README path, not be hidden behind a later `doctor` run
3. `setup` is the user-facing onboarding contract and must not pretend a runtime is ready if Praxis only printed instructions
4. `doctor` is for verification and debugging, not for revealing the first critical missing step
5. If a runtime still requires manual action, `setup` output must say so explicitly

Current expectation:

- OpenSpec: automatic
- Codex SuperPowers: automatic
- OpenCode project config: automatic
- Claude Code marketplace install: manual, but documented and explicitly surfaced

## Pull Request Process

1. Fork the repository
2. Create a branch from `main`
3. Implement and verify your changes
4. Commit with Conventional Commits
5. Push and open a Pull Request
6. Link related issues or discussions

Pull requests are validated by GitHub Actions CI. At minimum, contributors should expect:

- `npm test`
- CLI smoke checks (`help`, `list-stacks`)
- `npm pack --dry-run`

## What NOT to Submit

- Enterprise-specific content that belongs in private stacks
- Hardcoded assumptions that canonical project state lives in `.opencode/`
- Changes that bypass the shared core and reintroduce agent-specific init logic
- Manual edits to the managed `<!-- PRAXIS_DEVOS_START -->` blocks in generated project files unless you are changing the generator itself

## Managed Blocks

Praxis may write managed blocks into downstream `AGENTS.md` and `CLAUDE.md`.

- Content inside `<!-- PRAXIS_DEVOS_START -->` and `<!-- PRAXIS_DEVOS_END -->` is framework-managed
- Content outside those markers is user-owned
- Sync logic must preserve user-owned content and only replace the managed block

## Code of Conduct

All contributors are expected to uphold the standards outlined in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
