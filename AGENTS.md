<!-- PRAXIS_DEVOS_START -->
> This block is maintained by Praxis DevOS. Run `npx praxis-devos sync` to refresh it.

## Flow Selection

- Enter an OpenSpec proposal flow for medium or large changes, cross-module changes, interface or compatibility changes, architecture or process refactors, or any request with unclear requirements, unresolved `open questions`, or competing solution options.
- In those cases, start with `opsx-propose` or `opsx-explore` and finish clarification and option comparison inside the current OpenSpec stage before implementation.
- Use `opsx-apply` only for small, local implementation work with low ambiguity and no proposal need.
- Reviews and audit-style requests should follow the review flow.

## Project Reading Order

- On first entry, read `docs/surfaces.yaml` first.
- Read `docs/codemaps/project-overview.md` if needed.
- Read other `docs/codemaps/**` artifacts on demand rather than by default.

## OpenSpec + Superpowers Contract

- Inside OpenSpec, `opsx-explore`, `opsx-propose`, `opsx-apply`, and `opsx-archive` are the only visible workflow layer.
- Superpowers may run only as embedded capabilities inside the active OpenSpec stage.
- Do not re-announce `Using [skill]` or `superpowers:<skill>`, and do not create a second workflow, second wrap-up, or separate document tree.
- Keep all stage-local outputs under `openspec/changes/<change>/...`; do not write `docs/superpowers/...`.
- Capability execution is judged by evidence in the user-level Praxis state directory, not by user-visible announcements.

## Stage Gates

- Proposal Gate: do not enter multi-step implementation until Proposal Intake has converged `change target`, `intended behavior`, `scope/risk`, and `open questions`, and the native OpenSpec proposal flow has been executed through `opsx-propose` or `opsx-explore` plus native OpenSpec actions.
- Proposal Gate: if `open questions` or competing solution directions remain, stay in propose or explore and finish clarification before implementation.
- Apply Gate: before implementation, check branch safety, use an isolated workspace when needed, and keep any multi-step plan under the approved OpenSpec change.
- Execution Gate: when bugs, failed tests, exceptions, or regressions appear, perform root-cause analysis first; keep all parallel work, subtasks, outputs, and status under the current change.
- Completion Gate: before claiming completion, opening a PR, or merging, run full verification and record the actual verification result. Verification is a pre-completion check, not a second completion workflow.
<!-- PRAXIS_DEVOS_END -->

# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests
node --test

# Run a single test file
node --test test/praxis-devos.test.js

# Run the CLI locally
node bin/praxis-devos.js --help
node bin/praxis-devos.js setup --project-dir /tmp/test-project
node bin/praxis-devos.js sync --project-dir /tmp/test-project
```

No build step — pure ESM, runs directly with Node >=20.19.0.

## Release safety rules

- Never publish a new npm version, push release tags, or perform other release actions before explicitly confirming the release order with the user.
- For release work, confirm whether the intended order is PR first, merge first, publish first, and tag before taking any release action.
- Do not assume publish-before-merge is acceptable.

## Architecture

`praxis-devos` is a CLI tool that installs OpenSpec governance + SuperPowers execution rules into a user's project, then projects skills into agent-specific directories so each coding agent (Codex, OpenCode, Claude Code) discovers them natively.

### Core flow (`src/core/`)

The scaffold core is now split by responsibility:

- `src/core/praxis-devos.js` — CLI parsing, command routing, and top-level orchestration
- `src/core/runtime/` — command execution, OpenSpec runtime checks, agent dependency bootstrap/doctor logic
- `src/core/project/` — project adapter sync, managed blocks, project state helpers
- `src/core/constants/` — shared scaffold constants

The current CLI surface is: `setup`, `init`, `sync`, `status`, `doctor`, `bootstrap`.

**Boundary rule:** `src/core/praxis-devos.js` is scaffold/orchestration code. It may manage projection, installation, command routing, and deterministic checks, but it must not participate in generating human-facing content. Content generation for docs, proposals, API references, codemaps, or other narrative artifacts belongs to skills/prompts, not to JS helpers in the core scaffold.

### Projection layer (`src/projection/`)

Each agent has its own projector:
- `Codex.js` → writes `~/.Codex/skills/<name>/SKILL.md` (skill dirs)
- `opencode.js` → writes `~/.Codex/skills/<name>/SKILL.md` (skill dirs)
- `codex.js` → writes `~/.codex/skills/<name>/SKILL.md` (skill dirs)
- `index.js` — dispatches to the right projector based on selected agents
- `markers.js` — injects/parses `<!-- PRAXIS_PROJECTION ... -->` markers so projections can be identified and cleaned up later

### Key design decisions
- Skills are stamped with a version marker on write. On `sync`, stale projections (marker present but name no longer in the skill set) are removed.
- `src/templates/managed-entry.md` is the template injected into a user project's `AGENTS.md`/`AGENTS.md` during `setup`. It contains the OpenSpec flow gating rules.
- `opencode-plugin.js` is the package entry for OpenCode's plugin system.
- When adding new capabilities, prefer skill- or prompt-driven generation. Only add JS when the work is purely mechanical, deterministic, and not itself content generation.
