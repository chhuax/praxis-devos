<!-- PRAXIS_DEVOS_START -->
@AGENTS.md

> Claude Code 通过 `CLAUDE.md` 读取项目指令；共享项目规则统一维护在 `AGENTS.md`。
> 如需 Claude 专属补充，请只在此文件追加少量差异内容，不要复制 `AGENTS.md` 全文。
<!-- PRAXIS_DEVOS_END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

`praxis-devos` is a CLI tool that installs OpenSpec governance + SuperPowers execution rules into a user's project, then projects skills into agent-specific directories so each coding agent (Claude Code, OpenCode, Codex) discovers them natively.

### Core flow (`src/core/praxis-devos.js`)

All CLI commands are handled here: `setup`, `sync`, `teardown`, `migrate`. This file parses args, resolves skill sources from `src/`, and orchestrates projection.

### Projection layer (`src/projection/`)

Each agent has its own projector:
- `claude.js` → writes `~/.claude/skills/<name>/SKILL.md` (skill dirs)
- `opencode.js` → writes `~/.claude/skills/<name>/SKILL.md` (skill dirs)
- `codex.js` → writes `~/.codex/skills/<name>/SKILL.md` (skill dirs)
- `index.js` — dispatches to the right projector based on selected agents
- `markers.js` — injects/parses `<!-- PRAXIS_PROJECTION ... -->` markers so projections can be identified and cleaned up later

### Key design decisions
- Skills are stamped with a version marker on write. On `sync`, stale projections (marker present but name no longer in the skill set) are removed.
- `src/templates/managed-entry.md` is the template injected into a user project's `AGENTS.md`/`CLAUDE.md` during `setup`. It contains the OpenSpec flow gating rules.
- OpenCode integration relies on projected skills/commands plus runtime config cleanup; do not reintroduce a Praxis OpenCode plugin entrypoint.
