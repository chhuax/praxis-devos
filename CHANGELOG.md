# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.1] - 2026-04-10

### Added
- Improved AI-first docs routing within OpenSpec capability specs and codemap skill guidance

### Fixed
- Codemap skill heading structure for better documentation navigation
- Release-only test coverage handling to improve CI reliability

## [0.5.0] - 2026-04-09

### Added
- `devos-docs` AI-first docs skill plus shared host command assets for `/devos-docs-init` and `/devos-docs-refresh`
- a lightweight docs contract centered on `docs/surfaces.yaml` and `docs/codemaps/**`, including docs-lite templates and refresh/check flows
- OpenSpec capability specs for `docs-context-routing` and `openspec-docs-sync`

### Changed
- unified bundled asset layout under `assets/skills/<skill>/` and `assets/commands/` so projected skills and host commands share one source structure
- moved the canonical docs surface contract under `docs/surfaces.yaml` and aligned routing, validation, and generated codemap guidance around that path
- OpenSpec apply/archive docs handling now uses deterministic docs context packing and refresh assessment instead of ad hoc repository scanning

### Fixed
- shared managed host commands now refresh safely across projects without overwriting user-owned same-name commands
- docs context path handling now ignores change inputs outside the repository root
- codemap links and bundle fixtures are aligned with the current docs contract and bundled asset structure

## [0.4.9] - 2026-04-08

### Changed
- `setup` now treats OpenSpec as a user-level global CLI by default and installs it with `npm install -g` when missing

### Fixed
- Windows command discovery now prefers real executable shims for `openspec`, avoiding invalid extensionless paths that caused `setup` to fail with `ENOENT`
- `init` continues to work when only a project-local OpenSpec runtime is present, while still keeping global OpenSpec as the required steady-state runtime

## [0.4.8] - 2026-04-07

### Fixed
- normalized quoted Windows command paths before invoking `npm.cmd` and `claude.cmd` during `setup`, so automatic installs no longer fail when the resolved executable path contains spaces
- added a Windows install-smoke variant that simulates quoted command paths with spaces to catch this regression in CI before release

## [0.4.7] - 2026-03-31

### Changed
- Claude native OpenSpec projection now writes bundled `opsx-*` skills to `~/.claude/skills/` as `SKILL.md` directories instead of duplicating them into `~/.claude/commands/`
- Claude and OpenCode now share the same `~/.claude/skills/` projection surface for bundled OpenSpec skills

### Fixed
- OpenCode global config updates now preserve existing `plugin` entries and top-level settings instead of overwriting user-owned configuration during `setup` and `bootstrap`
- OpenCode global config rewrites now create a backup first and fail safe when the existing `~/.config/opencode/config.json` cannot be safely merged

## [0.4.6] - 2026-03-30

### Fixed
- OpenCode plugin configuration now writes to the global `~/.config/opencode/config.json` instead of the project-level `opencode.json`; detection and bootstrap logic updated accordingly

## [0.4.5] - 2026-03-28

### Added
- introduced a separate monitoring module for optional OpenSpec capability instrumentation, including user-level evidence storage and projected-skill monitoring overlays
- added `validate-change` and instrumentation command coverage for embedded capability evidence and projected skill monitoring state

### Changed
- restored the bundled `opsx-explore`, `opsx-propose`, `opsx-apply`, and `opsx-archive` skills to English-first OpenSpec bodies while isolating Praxis-specific coordination in explicit overlay sections
- aligned bundled OpenSpec skill frontmatter names with their shipped `opsx-*` command and folder names
- simplified the managed AI entry contract into a shorter English-only routing and gate model while preserving proposal, execution, and completion hard gates

### Fixed
- prevented native skill projection from overwriting user-authored same-name skills unless they already carry a Praxis projection marker
- moved embedded capability evidence out of project directories and into a user-level Praxis state directory so target repositories stay clean

## [0.4.4] - 2026-03-27

### Changed
- aligned the project entry-file model so `AGENTS.md` is the shared project rules file and `CLAUDE.md` stays a thin `@AGENTS.md` wrapper for Claude Code
- refreshed the English and Chinese README wording around shared rules, agent entry files, and native projection surfaces
- renamed the agent-surface reference note under `docs/` to an English filename

### Fixed
- aligned Codex native skill projection and SuperPowers detection with `~/.codex/skills` instead of the previous `~/.agents/skills` path
- added OpenCode native projection for bundled `opsx-*` skills under the shared user-home skills surface and included it in dependency doctor coverage
- updated smoke and unit coverage to validate the revised Codex, Claude, and OpenCode projection model

## [0.4.3] - 2026-03-27

### Changed
- redefined the OpenSpec/SuperPowers contract so OpenSpec remains the only visible workflow and SuperPowers runs as embedded stage-local sub-skills
- translated the bundled `opsx-explore`, `opsx-propose`, `opsx-apply`, and `opsx-archive` skills into Chinese and documented how they internally invoke `brainstorming`, `writing-plans`, `systematic-debugging`, `subagent-driven-development`, and `verification-before-completion`
- tightened managed entry guidance so it stays at the governance layer instead of routing agent-visible `superpowers:*` workflows

### Fixed
- `validate-session` now rejects duplicate OpenSpec stage recaps in addition to duplicate SuperPowers workflow announcements and `docs/superpowers/...` outputs
- embedded SuperPowers sub-skill usage now explicitly inherits OpenSpec stage context, current change ownership, artifact paths, and output constraints

### Removed
- removed the `praxis-devos openspec` wrapper command and all related AI-facing/documented guidance in favor of calling the OpenSpec CLI directly

## [0.4.2] - 2026-03-27

### Changed
- tightened managed entry routing so only clearly small, low-risk work can skip OpenSpec proposal flow
- clarified that `superpowers:brainstorming` is a proposal-prep aid, not a replacement for native OpenSpec proposal execution
- clarified that `superpowers:writing-plans` must attach to an approved OpenSpec change instead of creating a parallel planning document flow

### Fixed
- `validate-session` now rejects transcripts that enter `writing-plans` before Proposal Intake and native OpenSpec proposal execution evidence
- added regression coverage for the planning-before-proposal failure path

## [0.4.1] - 2026-03-27

### Fixed
- preserved YAML frontmatter at the top of projected OpenSpec skill files so Codex can load `opsx-*` skills after `setup` or `sync`
- made projection marker detection compatible with marker placement after frontmatter instead of only at the first line
- resolved projection adapter path handling so runtime home-directory resolution is not frozen at module load time

## [0.4.0] - 2026-03-27

### Added
- automatic Claude Code SuperPowers installation through `claude plugin install ... --scope user`
- install smoke coverage aligned with the current project structure and agent setup paths
- README positioning for near-term enterprise extension pack integration such as `praxis-devos install-rules`

### Changed
- simplified project model around `openspec/`, `AGENTS.md`, `CLAUDE.md`, `.opencode/`, and runtime-managed SuperPowers installs
- tightened managed entry blocks so OpenSpec flow gates now explicitly bind to SuperPowers skills such as `brainstorming`, `writing-plans`, `systematic-debugging`, and `verification-before-completion`
- rewrote tests and CI to match the current CLI and runtime behavior
- moved install smoke tooling under `test/`
- rewrote English and Chinese README content around the current product contract

### Removed
- stale `.praxis`-centric project model, historical docs, release notes, stack scaffolding, and legacy repository-only adapter files
- deprecated `change` / `proposal` CLI entrypoints from the public command surface
- root repository `AGENTS.md`, `CLAUDE.md`, and `RULES.md` artifacts that were no longer part of the shipped product model

## [0.2.7] - 2026-03-25

### Added
- `praxis-devos setup` as the user-facing onboarding, repair, and add-agent entrypoint
- `praxis-devos use-stack <name>` so framework initialization and stack application can happen in two explicit phases
- Scenario-driven command documentation in `docs/architecture/command-scenarios.md`

### Changed
- Quick Start now routes users by scenario instead of exposing the old `bootstrap` + `init` layering first
- `init` can now initialize the framework skeleton without immediately applying a stack
- `doctor` now recommends `setup` as the primary fix path and keeps `bootstrap` as an advanced repair command
- Current release guidance now explicitly targets macOS and Linux first, with Windows tracked as follow-up compatibility work

### Fixed
- `bootstrap --openspec` is no longer accepted as a dead parameter; `bootstrap` now always includes OpenSpec and reports a migration error if the removed flag is used

## [0.2.6] - 2026-03-25

### Added
- `praxis-devos validate-session` for evidence-based transcript validation against Praxis event hooks
- Transcript fixtures and regression coverage for both passing and missing-hook session flows
- Dedicated release notes for the new SuperPowers hook and transcript validation workflow

### Changed
- Managed AI entry blocks are now rendered from an external template instead of hardcoded JS text
- Proposal routing now uses a lightweight `Proposal Intake` step before escalating to `brainstorming`
- Framework rules now model SuperPowers as event-driven hooks for planning, debugging, parallel work, and completion verification
- User-facing command examples are normalized to `npx praxis-devos ...` so local CLI usage is the documented default

### Fixed
- `init` now repairs incomplete `.praxis/skills/` installs instead of skipping pre-existing empty skill directories
- Documentation no longer implies that bare `praxis-devos ...` commands work without a global install

## [0.2.5] - 2026-03-25

### Changed
- Managed AI entry gates no longer assume the current runtime can reliably self-identify as Codex, Claude Code, or OpenCode
- Managed blocks now describe `.praxis/` as the canonical source while explicitly keeping `.opencode/skills/` as an OpenCode supplemental layer
- Dependency gate guidance now uses agent-agnostic bootstrap instructions with explicit per-agent commands instead of embedding runtime-specific wording in the generated entry block

### Fixed
- Downstream managed blocks no longer risk implying that `.opencode/skills/` is disabled just because it is not part of the canonical project state
- Generated AI entry wording now avoids brittle runtime-specific statements such as "current entry is codex", which were too fragile for a multi-agent setup

## [0.2.4] - 2026-03-25

### Changed
- Shrunk the Praxis-managed block in `AGENTS.md` / `CLAUDE.md` into a routing summary instead of inlining full framework and stack rule bodies
- Tightened gate semantics so proposal work must read `openspec/AGENTS.md`, code work must read `.praxis/rules.md`, and skill selection must read `.praxis/skills/INDEX.md`

### Fixed
- Downstream projects no longer get several-hundred-line managed blocks filled with full stack rule text such as Spring Boot conventions

## [0.2.3] - 2026-03-25

### Added
- Regression tests covering `syncProject`, `migrateProject`, `bootstrapProject`, `bootstrapOpenSpec`, and `runOpenSpecCommand`

### Changed
- GitHub Actions CLI smoke checks now include `praxis-devos status`
- `0.2.x` stability coverage now reaches adapter sync, migration, dependency bootstrap, and OpenSpec runtime resolution
- OpenSpec bootstrap guidance now recommends `npx praxis-devos ...` for one-shot usage and only suggests bare `praxis-devos ...` when it is actually installed on PATH

## [0.3.0] - 2026-03-25

### Added
- `praxis-devos setup` as the primary onboarding command for new projects, new machines, and add-agent repair flows
- `praxis-devos use-stack <stack>` for applying a technology stack after framework initialization
- Automatic OpenSpec installation during `setup` when neither a project-local nor global runtime is available
- Automatic Codex SuperPowers installation during `setup`, including skills link/junction creation
- Cross-platform install smoke CI covering Codex, OpenCode, and Claude scenarios, including Windows runners
- Product contract documentation for CLI onboarding and manual-step disclosure in `docs/architecture/command-scenarios.md`

### Changed
- Quick Start documentation now follows scenario-based `setup` flows instead of low-level bootstrap-first instructions
- `init` can now initialize the framework skeleton without requiring a stack up front
- `doctor` now recommends `setup` as the primary fix path
- OpenCode and Codex runtime setup now validate stronger post-install signals instead of only checking for a path
- Windows command execution now resolves `npm.cmd`/batch wrappers correctly for OpenSpec setup flows

### Fixed
- Removed the no-op `--openspec` path from the main CLI surface
- Fixed Windows OpenSpec invocation and automatic install flows
- Fixed install smoke CI tarball resolution in temporary projects
- Codex runtime validation now requires actual installed skill content instead of treating an empty skills path as healthy

## [0.2.2] - 2026-03-25

### Added
- `praxis-devos status` for current project initialization, adapters, active changes, and dependency summary
- OpenCode tool `praxis-status`
- Generated `.praxis/skills/INDEX.md` for project-installed skill discovery across agents
- Regression tests covering `initProject`, strict `doctor`, and project status output

### Changed
- `0.2.x` verification now covers more of the real project lifecycle instead of only scaffold helpers
- Codex / Claude managed blocks now include a summary of currently installed project skills

## [0.2.1] - 2026-03-25

### Added
- Deterministic `praxis-devos change` / `praxis-devos proposal` scaffold command for the explicit proposal path
- OpenCode plugin tools `praxis-change` and `praxis-proposal`
- Base regression tests with `node --test`
- Top-level published OpenCode plugin entrypoint at `opencode-plugin.js`

### Changed
- npm package metadata now points `main` to the top-level OpenCode plugin entrypoint
- CLI help now exposes `change` and `proposal` commands explicitly
- `skills/openspec` and README examples now show the executable proposal scaffold path
- package metadata is aligned with npm's publish-time normalization

### Fixed
- published tarball no longer depends on the hidden `.opencode/` directory as the primary entrypoint
- `bin` metadata now uses the normalized executable path expected by npm

## [0.2.0] - 2026-03-25

### Added
- External CLI entry `praxis-devos` with `init`, `sync`, `migrate`, and `list-stacks` commands
- Shared multi-agent core in `src/core/praxis-devos.js`
- Canonical project state under `.praxis/`
- `.praxis/framework-rules.md` as the project-installed mirror of framework gating rules
- `.praxis/adapters/compiled-rules.md` as the shared cross-agent rules artifact
- Dependency management commands: `doctor` and `bootstrap`
- `docs/dependency-management.md` for openspec/superpowers setup guidance
- Codex adapter via managed blocks in root `AGENTS.md`
- Claude Code adapter via managed blocks in root `CLAUDE.md`
- OpenCode compatibility projection generated by `praxis-devos sync --agent opencode`
- `.praxis/manifest.json` for installed stack and adapter metadata
- Chinese architecture documentation in `docs/architecture/multi-agent.md`
- Chinese migration guide in `docs/migration-guide.md`
- `skills/code-review/` universal code review workflow skill
- `stacks/java-spring/` generic Java + Spring Boot reference stack with 4 domain skills:
  - `java-database`: table design, SQL safety, JPA/MyBatis, pagination
  - `java-error-handling`: BusinessException, RFC 7807, `@RestControllerAdvice`
  - `java-security`: Spring Security, input validation, password hashing
  - `java-testing`: JUnit 5, Mockito, Spring Boot Test, coverage targets
- `stacks/README.md` guide for creating and managing technology stacks
- English and Chinese root README documentation
- Community files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`

### Changed
- Project architecture from OpenCode-only initialization to a multi-agent model centered on `.praxis/`
- OpenCode plugin now acts as a thin adapter over the shared core instead of owning initialization logic
- OpenSpec is now treated as a hard dependency and invoked through `praxis-devos openspec ...`
- Stack installation target changed from `.opencode/` to `.praxis/`
- User-customizable skills now install into `.praxis/skills/`
- Framework documentation rewritten to explain the canonical layer, migration path, and adapter strategy
- `CONTRIBUTING.md` rewritten to align with the multi-agent architecture and Chinese `docs/` policy
- Skills architecture clarified: universal skills remain process-only; technology-specific skills live in `stacks/{stack}/skills/`
- `AGENTS.md` generation now preserves a managed Praxis block for downstream projects
- Rule gating is now distributed across agents from the same canonical rule source
- `manifest.json` now declares required `openspec` and `superpowers` dependencies

### Deprecated
- Treating `.opencode/` as the source of truth for project-installed Praxis assets
- Relying on plugin-only `praxis-init` as the primary initialization path

### Removed
- Requirement that project initialization must happen from inside OpenCode after plugin reload
- Framework-level technology skills from `skills/` that were replaced by stack-specific skills:
  - `database-guidelines`
  - `error-handling`
  - `security`
  - `redis-guidelines`
