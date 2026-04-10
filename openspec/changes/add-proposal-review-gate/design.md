## Context

The current Praxis OpenSpec flow has no dedicated proposal review step between proposal completion and `/opsx:apply`. The repository already has one relevant pattern: host commands such as `devos-docs-init` and `devos-docs-refresh` act as thin wrappers over a structured request contract, while the core repository owns the contract, validation boundaries, and projection rules.

This request needs the same separation, but with one extra constraint: the reviewer may need to run on a different model than the main proposal flow. OpenCode can do that natively in-host, while Codex and Claude may need an external dispatcher path. The design therefore has to separate "proposal review as a workflow capability" from "how a particular host obtains the reviewer."

## Goals / Non-Goals

**Goals:**
- Introduce a manual proposal review command named `/spec-review`.
- Review the current change artifact set, not only `specs/**/*.md`.
- Allow optional reviewer `agent` and `model` overrides so review can run on a different model than the main flow.
- Keep every review run bound to the same active workspace as the proposal flow.
- Make review output advisory, repeatable, and non-blocking for `/opsx:apply`.
- Reuse the existing host-command-plus-contract pattern instead of inventing a separate review CLI.

**Non-Goals:**
- Do not auto-trigger review when proposal artifacts are completed.
- Do not make review a hard gate before `/opsx:apply`.
- Do not add a compatibility CLI such as `praxis-devos review ...`.
- Do not require every host to support every dispatch backend in this change.

## Decisions

### 1. Canonical entrypoint is a host command named `/spec-review`

`/spec-review` is the single user-facing trigger for this capability. The command name is intentionally short, but the command semantics cover the full OpenSpec change artifact set:

- `proposal.md`
- `design.md`
- `specs/**/*.md`
- `tasks.md`

The command targets the active change by default. Optional parameters allow the user to request a reviewer agent and a reviewer model. If no overrides are provided, the runtime requests a reviewer in the current host environment.

Alternatives considered:
- `/devos-proposal-review`
  - Rejected because the name is longer without adding meaningful distinction inside an OpenSpec-centric workflow.
- A CLI fallback command
  - Rejected because the user explicitly wants this to remain a host-triggered review capability rather than another Praxis CLI surface.

### 2. Proposal review is a workflow contract, not a hard-coded dispatch mechanism

The repository will define a normalized review request contract that contains:

- active workspace identity
- active `changeId`
- required reviewer skill id (`proposal-review`)
- optional `requestedAgent`
- optional `requestedModel`
- any deterministic context needed to explain missing or skipped artifacts

Execution is split into backends:

- native host subagent review when the current host can spawn a reviewer directly
- external dispatch review when the host must hand off to another agent runtime

This keeps the behavior stable even when host capabilities differ. OpenCode can satisfy more requests natively, while Codex or Claude can satisfy cross-agent review through a dispatcher integration such as MCP without changing the review contract itself.

The reviewer does not need a pre-packed copy of every artifact as long as it is attached to the same workspace. In that case the contract can stay minimal:

- workspace identity
- `changeId`
- reviewer skill id (`proposal-review`)
- optional reviewer agent override
- optional reviewer model override

The reviewer resolves `openspec/changes/<changeId>/` inside that same workspace and reads the current artifacts in place. This keeps the request smaller and ensures the reviewer sees the same files the user is editing.

Alternatives considered:
- Encode review behavior directly as "call MCP"
  - Rejected because MCP is one backend, not the capability boundary.
- Force same-host same-model review everywhere
  - Rejected because it does not solve the user's main requirement of cross-model proposal review.

### 3. All review backends must stay in the active workspace

Proposal review must not create a second repository copy or run against a detached filesystem snapshot. Every backend receives and uses the active workspace identity for the current change.

That means:

- native subagent review runs in the same workspace as the main flow
- external dispatch review receives the same workspace path or equivalent bound workspace handle
- every backend receives an explicit reviewer skill to execute in that workspace
- review artifacts are written back into the same active change directory
- backends must not silently `clone`, create a temporary checkout, or switch to a different worktree

This avoids a class of review drift where the reviewer sees a different repository state than the proposal author. It also keeps repeated review runs attached to the exact change directory the user is editing.

Alternative considered:
- allow dispatch backends to create their own temporary clone or checkout
  - Rejected because review findings and review artifacts would no longer be tied to the same working context as the proposal under review.

### 4. The reviewer skill is explicit and stable

`/spec-review` is only the host command. The dispatched reviewer should receive an explicit skill identifier so every backend runs the same review rubric.

The default contract should reference a dedicated proposal review skill named `proposal-review` rather than reuse a general code review skill. Proposal review needs to critique:

- scope clarity
- design coherence
- spec completeness
- task breakdown readiness

This is adjacent to code review, but it is not the same artifact type or stage gate. A dedicated skill keeps the review prompt and expected output aligned with proposal-stage concerns.

Alternatives considered:
- reuse `requesting-code-review`
  - Rejected because that skill is oriented around implemented code and task-boundary review rather than proposal artifacts.
- infer the skill from the command name
  - Rejected because cross-backend dispatch should not depend on host-specific command parsing.

### 5. Explicit overrides are strict, defaults are flexible

The runtime should behave differently for default review and explicit override review:

- default invocation: choose the best available reviewer path for the current host
- explicit `agent` or `model`: either honor the request or fail with an actionable error

This avoids silent degradation. If a user asks for `claude` or a specific GPT model, Praxis must not quietly run the review on something else and present it as equivalent.

### 6. Each review run is stored as a change-local artifact

Manual review is repeatable, so a single `review.md` file would destroy history. Each invocation should write a new review artifact under the active change, for example in:

- `openspec/changes/<change>/reviews/<timestamp>-spec-review.md`

The artifact should record:

- requested reviewer agent and model
- resolved reviewer backend
- reviewed artifact list
- blocking findings
- non-blocking suggestions
- final disposition such as `advisory`, `needs-attention`, or `request-followup`

This keeps review history attached to the change and gives the user a stable place to compare subsequent review runs.

Alternative considered:
- write only to transient session output
  - Rejected because repeated manual review needs durable history.

### 7. Review remains advisory and does not alter apply readiness

Proposal review is a soft gate. It may surface blocking findings in the review content, but it does not mutate OpenSpec apply requirements and does not prevent the user from moving to `/opsx:apply`.

The command should therefore:

- return findings and disposition
- preserve the review artifact
- avoid changing `applyRequires`
- avoid auto-editing proposal artifacts

This keeps proposal review aligned with the user's desired workflow: ask for critique, decide manually, then either revise or continue.

## Risks / Trade-offs

- [Host capability mismatch] Different hosts expose different command and agent-dispatch surfaces. → Mitigation: keep the review request and review artifact contract host-agnostic; let each adapter opt into supported backends.
- [Workspace drift across backends] A dispatcher-backed review could inspect a different checkout than the active proposal workspace. → Mitigation: make same-workspace binding part of the review contract and reject backends that cannot honor it.
- [Naming ambiguity] `/spec-review` could be misread as reviewing only `specs/**/*.md`. → Mitigation: define the command contract and generated review artifact to always enumerate the full reviewed artifact set.
- [False confidence from silent fallback] A requested cross-model review could degrade to a same-model review without the user noticing. → Mitigation: explicit overrides must be strict and error visibly when unsupported.
- [Review clutter] Repeatable manual review can produce many artifacts. → Mitigation: isolate outputs under a `reviews/` directory and include timestamped filenames and concise dispositions.
