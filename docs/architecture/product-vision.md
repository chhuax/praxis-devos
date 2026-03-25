# Praxis DevOS Product Vision

## Positioning

Praxis DevOS is a spec-driven AI coding harness for multi-agent software development.

It is not just a skill pack, a plugin, or a project scaffold. It is a runtime and workflow control layer that makes a software project behave consistently across Codex, OpenCode, and Claude Code while preserving a single canonical project state.

## Product Promise

Praxis DevOS should make three things true:

1. A project can be onboarded quickly on a new repository or a new machine.
2. Different AI agents follow the same framework protocol inside the same project.
3. Key development workflows leave evidence that can be verified and audited.

## User Mental Model

Users should only need to understand five product objects:

- Project: the current repository under Praxis control
- Agent: Codex, OpenCode, or Claude Code
- Stack: the selected technology stack such as `java-spring`
- Workflow: proposal, implementation, review, verification
- Audit: whether the project is actually ready and healthy

Everything else should be an implementation detail.

## Primary User Commands

These are the commands Praxis DevOS should emphasize as the public product surface:

- `npx praxis-devos setup`
- `npx praxis-devos use-stack <stack>`
- `npx praxis-devos status`
- `npx praxis-devos doctor`
- `npx praxis-devos audit`
- `npx praxis-devos change ...`
- `npx praxis-devos validate-session --file ...`

These commands are still useful but should be treated as advanced or lower-level operations:

- `init`
- `bootstrap`
- `sync`
- `migrate`

## Core Scenarios

### New project onboarding

```bash
npx praxis-devos setup --agent codex --stack java-spring
```

### New machine onboarding for an existing Praxis project

```bash
npx praxis-devos setup --agent codex
```

### Add another agent to an existing project

```bash
npx praxis-devos setup --agent claude
```

### Apply a stack after framework initialization

```bash
npx praxis-devos use-stack java-spring
```

### Verify overall harness readiness

```bash
npx praxis-devos audit
```

## Product Layers

### Layer 1: Runtime

Examples:

- OpenSpec
- Codex SuperPowers
- OpenCode plugin configuration
- Claude marketplace plugin

Responsibilities:

- Install
- Detect
- Repair
- Handle platform-specific runtime differences

### Layer 2: Project State

Examples:

- `.praxis/manifest.json`
- `.praxis/rules.md`
- `.praxis/stack.md`
- `.praxis/skills/`
- adapter outputs

Responsibilities:

- Persist the canonical project state
- Describe what is configured
- Describe what is missing
- Serve as the source for native projection into agent-specific discovery surfaces

### Layer 3: Workflow Control

Examples:

- Proposal Intake
- OpenSpec workflow
- SuperPowers event hooks
- stack-specific skills

Responsibilities:

- Route agent behavior into the correct framework workflow
- Make process steps explicit
- Keep agent behavior semantically aligned across runtimes

### Layer 4: Verification

Examples:

- `doctor`
- `audit`
- `validate-session`
- install smoke CI

Responsibilities:

- Confirm that dependencies are real, not assumed
- Confirm that workflows leave evidence
- Confirm that the harness is usable, not just initialized

## Product Principles

These principles should guide all future implementation:

1. Strong dependencies that Praxis can install automatically must be installed automatically.
2. Manual steps that Praxis cannot automate must appear in the main README path, not only in troubleshooting output.
3. `setup` must perform real work. It must not only print suggestions and imply completion.
4. `doctor` is a verification and repair tool. It must not be the first place users discover critical onboarding gaps.
5. Key workflows must leave visible evidence that can be checked later.
6. Agent capabilities may differ, but framework semantics should not drift between agents.

## Target Experience

If a user runs:

```bash
npx praxis-devos setup --agent codex --stack java-spring
```

they should be able to verify within a few minutes that:

1. The project is now under Praxis control.
2. The selected agent runtime actually works.
3. The next proposal / implementation / verification path is clear.

If any of those are missing, the product is not yet complete.

## Audit Direction

`doctor` is not enough as the long-term verification surface.

Praxis DevOS should grow a higher-level command:

```bash
npx praxis-devos audit
npx praxis-devos audit --json
npx praxis-devos audit --strict
```

The intended audit scope is:

- runtime readiness
- stack readiness
- adapter completeness
- skill-content completeness
- canonical state consistency
- transcript evidence support
- CI wiring for install smoke and related checks

The audit result should distinguish between at least:

- `ready`
- `degraded`
- `blocked`

## Manifest Evolution

`.praxis/manifest.json` should evolve beyond stack and adapter metadata.

Likely future fields:

- `frameworkVersion`
- `selectedStack`
- `agentsConfigured`
- `runtimeState`
- `adapterState`
- `workflowCapabilities`
- `auditStatus`
- `lastSetupAt`
- `lastAuditAt`

## Documentation Strategy

The documentation system should separate product entrypoints from internal architecture:

- `README.md`
  - Quick Start
  - scenario-based commands
  - agent support matrix
  - explicit manual steps

- `docs/architecture/`
  - internal layering
  - workflow model
  - evidence model
  - native projection model

- future `docs/security/`
  - automatic installs
  - file writes
  - trust boundaries

- future `docs/troubleshooting/`
  - platform issues
  - repair paths
  - runtime failures

## Roadmap

### v0.3.x

- stabilize `setup`
- stabilize Windows support
- stabilize install smoke CI
- add `audit`

### v0.4

- expand manifest/state model
- define an agent parity matrix
- strengthen adapter completeness checks

### v0.5

- standardize workflow evidence
- wire audit into CI gates
- add release readiness checks

### v1.0

Praxis DevOS should behave like a complete multi-agent spec-driven development platform rather than a loose collection of commands.
