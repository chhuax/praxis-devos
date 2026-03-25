# Workflow Routing Model

## Purpose

Praxis DevOS needs a routing model that makes framework capabilities easier to trigger reliably across agents.

The main failure mode today is not missing skills. It is weak routing:

- a framework skill exists
- the project rules mention it
- but the agent does not reliably enter that workflow at the right time

This document defines the control-plane routing model for Praxis DevOS.

## Design Principle

Praxis should not rely on skills alone.

Workflow routing should be split into distinct layers:

1. rules decide when a workflow should be considered
2. commands provide explicit workflow entrypoints
3. native projections improve discoverability inside each agent runtime
4. skills define how the workflow is executed
5. evidence rules define what must be visible afterward

This means:

- skill is not the entrypoint
- workflow routing is the entrypoint

## Core Workflow Set

Praxis should standardize a small framework control set before expanding any stack-specific surface.

### `intake`

Purpose:

- normalize ambiguous user intent into a framework-friendly shape
- decide whether the task belongs to proposal, implementation, review, or debugging

Used for:

- new feature requests
- change requests
- unclear asks

Expected output:

- route decision
- target capability or module
- intended behavior
- scope / risk
- open questions

### `plan`

Purpose:

- decompose a multi-step implementation before coding

Used for:

- tasks with multiple files
- tasks with dependencies or phases
- tasks with unclear execution order

Expected output:

- ordered steps
- dependencies
- checkpoints
- testing plan

### `debug`

Purpose:

- drive bug investigation with explicit hypotheses and verification

Used for:

- failing tests
- broken builds
- regressions
- runtime anomalies

Expected output:

- reproduction
- hypothesis
- experiments
- confirmed cause
- fix path

### `review`

Purpose:

- evaluate changes for regressions, risk, and missing coverage

Used for:

- post-implementation review
- PR review
- self-review before completion

Expected output:

- findings ordered by severity
- assumptions
- residual risk

### `verify`

Purpose:

- confirm completion quality and release readiness

Used for:

- before task completion
- before release
- before merge when strict verification is required

Expected output:

- executed checks
- actual results
- remaining gaps

## Routing Inputs

Praxis should route by signal, not by vague subjective judgment.

### Signal categories

- user intent signal
- work-state signal
- failure signal
- completion signal
- platform signal

### Examples

#### Proposal signal

- "add"
- "change"
- "proposal"
- "spec"
- new behavior request

Primary route:

- `intake`

Escalate to:

- `plan` if scope is complex

#### Implementation complexity signal

- touches multiple files
- has multiple dependencies
- needs sequencing
- likely requires tests + code + docs

Primary route:

- `plan`

#### Failure signal

- failing test
- build error
- runtime exception
- flaky behavior

Primary route:

- `debug`

#### Completion signal

- "done"
- "finish"
- "check"
- "ready"
- implementation appears complete

Primary route:

- `review`
- then `verify`

## Routing Layers

## Layer 1: Implicit Rule Routing

Rules define the default routing behavior when the user does not explicitly choose a workflow command.

Examples:

- proposal-like requests should begin with `intake`
- complex implementation should enter `plan`
- bug reports should enter `debug`
- completion should enter `review` and `verify`

This layer belongs in:

- `.praxis/rules.md`
- framework control skills
- agent adapters

## Layer 2: Explicit Command Routing

Commands provide deterministic entrypoints into the same workflows.

Praxis should standardize:

- `npx praxis-devos change`
- `npx praxis-devos plan`
- `npx praxis-devos debug`
- `npx praxis-devos review`
- `npx praxis-devos verify`

These commands are product entrypoints, not just developer convenience helpers.

They should work even when an agent does not expose a native slash-command surface.

## Layer 3: Native Projection Routing

Native projection should improve discoverability for the same workflows.

Examples:

- Claude-native command projection
- Codex-native skill projection
- OpenCode tool/command projection

The goal is not to invent separate behavior. The goal is to map native discovery to the same Praxis workflow model.

## Layer 4: Skill Execution

Once a workflow is entered, the corresponding framework skill defines the concrete method.

Examples:

- `openspec`
- `brainstorming`
- `git-workflow`
- `verification-before-completion`
- future `plan/debug/review/verify` skills

## Layer 5: Evidence Enforcement

Each workflow must leave visible evidence so transcript review and automation can verify that the workflow actually happened.

## Evidence Protocol

Praxis should define minimal visible evidence for each workflow.

### `intake`

- route decision
- change target
- intended behavior
- scope / risk
- open questions

### `plan`

- numbered or ordered steps
- dependencies or phases
- test/check strategy

### `debug`

- reproduction
- hypotheses
- experiment results
- confirmed cause

### `review`

- findings
- assumptions
- residual risk

### `verify`

- executed checks
- pass/fail results
- uncovered risk

These evidence contracts are what `validate-session` and future `audit` should verify.

## Agent Mapping Strategy

Praxis should not force identical native mechanics across agents.

It should force identical workflow semantics.

### Codex

- implicit routing through rules and `AGENTS.md`
- explicit routing through Praxis CLI
- improved discovery through native framework-skill projection

### Claude Code

- implicit routing through rules and CLAUDE instructions
- explicit routing through projected native commands
- native skills/hooks where supported

### OpenCode

- implicit routing through generated rules
- explicit routing through CLI and tool/plugin surfaces
- selective native projection where it improves reliability

## Routing Hierarchy

When multiple routing signals exist, Praxis should apply this precedence:

1. explicit workflow command
2. strong failure signal
3. strong completion signal
4. proposal/intake signal
5. default implementation routing

Examples:

- if the user runs `praxis-devos debug`, use `debug` even if a review signal also exists
- if a task is marked complete but tests are failing, enter `debug` before `verify`

## What Praxis Should Avoid

Praxis should avoid these anti-patterns:

- relying on the agent to remember a skill name without a routing layer
- treating every stack skill as equally discoverable
- using prompt prose as the only trigger mechanism
- inventing different workflow semantics per agent

## Immediate Implementation Plan

### Step 1

- define framework workflow commands:
  - `plan`
  - `debug`
  - `review`
  - `verify`

### Step 2

- map those commands to framework skills and evidence expectations

### Step 3

- project framework-level workflows into native agent surfaces

### Step 4

- extend `validate-session` to detect workflow-evidence compliance for all core workflows

### Step 5

- add `audit` on top of workflow and projection verification
