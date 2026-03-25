# Native Projection Strategy

## Goal

Praxis DevOS should keep `.praxis/` as the canonical project state while projecting selected framework capabilities into each agent's native discovery surface.

This strategy exists because native placement has a real product advantage:

- agents discover native assets more reliably
- native command / skill / hook systems have better trigger rates
- the framework needs fewer prompt-only reminders to get the right behavior

At the same time, native placement should not become the source of truth. The canonical project state must remain inside the repository.

## Core Rule

Praxis DevOS uses this model:

- `.praxis/` is the canonical source
- native agent directories are delivery targets
- `setup` and `sync` are projection mechanisms
- `doctor` and future `audit` commands verify that projections are present and healthy

## Why This Is Necessary

If Praxis only keeps framework skills under `.praxis/skills/`, agent discovery depends too heavily on adapter instructions and prompt routing.

That creates a weak spot:

- a framework skill may exist
- the agent may be told to use it
- but the agent may still fail to discover or load it at the right time

Native projection improves this by placing framework-level assets where the agent already looks by default.

## Canonical vs Native

### Canonical layer

The repository remains the source of truth for:

- `.praxis/manifest.json`
- `.praxis/rules.md`
- `.praxis/stack.md`
- `.praxis/skills/`
- generated adapter metadata

These files define what the project expects.

### Native projection layer

Each target agent receives a projection of selected framework capabilities into its native discovery model.

These projections are generated artifacts or synchronized copies. They should be treated as runtime delivery, not as canonical authoring surfaces.

## Projection Scope

Praxis should not project everything.

### Projected by default

Only framework-level control capabilities should be projected by default:

- `openspec`
- `brainstorming`
- `git-workflow`
- `verification-before-completion`
- future control workflows such as:
  - `plan`
  - `debug`
  - `review`
  - `verify`

These capabilities are part of the framework control plane and should be highly discoverable.

### Not projected by default

Technology stack skills should remain canonical-first unless there is a specific, proven benefit to native projection.

Examples:

- `java-database`
- `java-security`
- `java-testing`

Reasons not to project stack skills by default:

- they are larger and more numerous
- they are more context-specific
- full projection increases sync complexity and drift risk
- many should still be loaded only on demand

## Target Matrix

## Codex

### Canonical inputs

- `.praxis/rules.md`
- `.praxis/skills/`
- root `AGENTS.md`

### Native projection goals

- project framework skills should be projected into Codex's native skill discovery location when possible
- root `AGENTS.md` remains the project-level routing and instruction surface
- if Codex exposes a discoverable command-like surface, Praxis should project workflow entrypoints there

### Current direction

- keep `AGENTS.md` as the compatibility anchor
- add framework skill projection into Codex-native skill directories
- use CLI-backed workflow commands where true native commands are unavailable

## Claude Code

### Canonical inputs

- `.praxis/rules.md`
- `.praxis/skills/`
- root `CLAUDE.md`

### Native projection goals

- framework skills projected into Claude-native skill directories
- framework commands projected into Claude-native command surfaces
- hooks projected where Claude supports hook lifecycles

### Current direction

- Claude has the strongest native command/skill/hook model
- Praxis should take the fullest advantage of that native model while still keeping `.praxis/` canonical

## OpenCode

### Canonical inputs

- `.praxis/rules.md`
- `.praxis/skills/`
- `opencode.json`
- plugin/tool adapter layer

### Native projection goals

- keep plugin/tool registration as the primary integration surface
- add framework skill projection only where OpenCode benefits from native discovery

### Current direction

- OpenCode should remain tool/plugin first
- skill projection can be incremental rather than immediate

## Command Strategy

Native projection works best when paired with explicit workflow entrypoints.

Praxis should standardize these framework commands:

- `change`
- `plan`
- `debug`
- `review`
- `verify`

The product model should be:

- Praxis CLI provides the stable cross-agent command contract
- agent-native projections provide better discoverability and trigger rates
- both map to the same workflow semantics

## Setup Responsibilities

`setup` should:

1. install or repair strong runtime dependencies
2. initialize canonical project state if missing
3. apply the requested stack if present
4. project framework capabilities into native agent surfaces
5. verify the result well enough that users are not surprised later

This means `setup` is not only a canonical initializer. It is also a native delivery step.

## Sync Responsibilities

`sync` should become the explicit projection repair and refresh command.

Its long-term job is:

- regenerate adapter files
- refresh native framework skill projections
- refresh native command/hook projections
- report what changed and what was skipped

## Doctor Responsibilities

`doctor` should evolve from pure dependency checking into projection-aware verification.

At minimum it should eventually check:

- runtime dependency availability
- native projection presence
- native projection content completeness
- adapter freshness

Examples:

- Codex native framework skill path exists and contains actual skill files
- Claude projected commands exist where expected
- OpenCode plugin/tool wiring is present

## Audit Responsibilities

The future `audit` command should sit above `doctor`.

It should answer:

- is the canonical project state complete?
- are native projections healthy?
- are framework workflows actually discoverable?
- is the project ready, degraded, or blocked?

## Drift Prevention

Projection introduces a risk of drift. Praxis should prevent that with these rules:

1. Native projections are generated or synchronized artifacts.
2. Canonical framework content is authored under `.praxis/`.
3. `sync` is the repair path for projection drift.
4. `doctor` and `audit` must treat missing or incomplete native projection as a product issue, not a cosmetic issue.

## Implementation Order

Praxis should implement this strategy in phases.

### Phase 1

- define the projection matrix
- project framework skills only
- keep stack skills canonical-only

### Phase 2

- add explicit workflow commands:
  - `plan`
  - `debug`
  - `review`
  - `verify`
- project those entrypoints into native agent surfaces where possible

### Phase 3

- upgrade `doctor` to verify native projection health
- add `audit`

### Phase 4

- evaluate selective native projection for high-value stack skills
- keep this whitelist-based, not automatic

## Non-Goals

This strategy does not mean:

- abandoning `.praxis/` as canonical state
- mirroring every stack skill into every agent runtime
- forcing identical native integrations across all agents

The goal is consistent framework behavior, not identical platform mechanics.
