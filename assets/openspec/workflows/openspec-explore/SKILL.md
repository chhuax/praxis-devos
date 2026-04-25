---
name: openspec-explore
description: Enter exploration mode before or during an OpenSpec change. Use when the user wants to brainstorm first, explore options, think through requirements, compare approaches, or is not ready to move into propose/apply yet.
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.9"
---

Enter exploration mode. The goal is to converge on the problem, boundaries, constraints, and approaches clearly rather than implementing code directly.

**Exploration mode is for thinking, not implementation.** You may read files, search code, and investigate the codebase. Only write conclusions back into the current change's OpenSpec artifact when the user explicitly asks to capture them. Do not write business code or directly implement features.

## Core Positioning

- OpenSpec owns change context, artifacts, and existing decisions
- Superpowers owns requirement and solution convergence
- `openspec-explore` leads the exploration flow

## Exact Skill Protocol

- When this route is matched, you must call the corresponding **exact skill name**
- Do not substitute a semantically similar local skill, default skill, manual steps, or long-form reasoning
- If the exact skill is unavailable, report that explicitly and do not silently fall back

## Brainstorming Gate

In `openspec-explore`, `superpowers:brainstorming` is not an optional enhancement. It is the default convergence capability.

If the current exploration involves any of the following, you must actually invoke `superpowers:brainstorming` first:

- A new feature or capability direction
- Option comparison and design tradeoff decisions
- Scope convergence for proposal, specs, or design
- Breaking vague requirements into a viable change
- Returning to design-level discussion within an existing change

This call can be lightweight, but it must really happen. Do not skip it with reasons such as "the direction is already clear," "we can write the proposal/design directly," or "we can draft the artifact first and brainstorm later."

The convergence call must satisfy these 4 rules:

- Actually load and use `superpowers:brainstorming`; do not merely claim in text that brainstorming already happened
- Use it only as the convergence capability for the current explore stage, without entering its own spec, plan, or implementation workflow
- Do not produce `docs/superpowers/**` or any other side-channel spec or plan documents
- After the call completes, return to `openspec-explore` first, then decide whether to keep exploring, recommend `/opsx:propose` or `openspec-new-change`, or write back to the current change artifact only when the user explicitly asks to capture

## OpenSpec Context

At the start, inspect which changes currently exist:

```bash
openspec list --json
```

If the user mentioned a specific change, or the discussion is clearly tied to one:

- Read related artifacts first to get context
- Naturally reference the existing proposal, design, tasks, or specs in the conversation
- Once key conclusions have formed, suggest whether they should be written back into an artifact

Prioritize reading:

- `openspec/changes/<name>/proposal.md`
- `openspec/changes/<name>/design.md`
- `openspec/changes/<name>/tasks.md`
- Related specs

## What You Can Do

- Clarify the problem and challenge hidden assumptions
- Investigate code structure, integration points, and existing patterns
- Compare multiple approaches and analyze tradeoffs
- Use tables, ASCII diagrams, and dependency maps to improve understanding
- Surface risks, unknowns, and questions that need further investigation
- Once conclusions form, suggest writing back to proposal, design, spec, or tasks artifacts

## Exit Conditions

- If conclusions have not converged yet: keep exploring, compare approaches, and gather more constraints
- If conclusions have converged but no change exists yet: stop at the recommendation layer and clearly suggest `openspec-propose` or `openspec-new-change` as the next step
- If conclusions have converged and a current change exists: suggest updating the relevant artifact, but only write the target file under the current change after the user explicitly asks and artifact context has been confirmed

## Minimal Example

```text
User: /opsx:explore add fieldid to the cloud marketplace

1. Read the code and run `openspec list --json`
2. Call `superpowers:brainstorming` to converge scope, approaches, and risks
3. Return to `openspec-explore` and summarize the conclusions
4. Suggest the next step:
   - Keep exploring, or
   - Recommend `/opsx:propose`, or
   - If the user explicitly asks to capture, write back to the current change artifact
```

## Common Entry Paths

- The user brings a vague idea: use `superpowers:brainstorming` first to narrow the problem space
- The user brings a complex but tangled situation: read the code and artifacts first, then untangle the current state and dependencies
- The user gets stuck mid-change: pull the discussion back to the design level, then use `superpowers:brainstorming` to converge

## Guardrails

- Do not implement business code during the exploration stage
- Do not treat "the boundaries are clear" as a reason to skip `superpowers:brainstorming`
- If the problem is still diverging, continue exploring; do not lock conclusions into artifacts before consensus exists
- By default, the explore stage does not create or update artifacts; only write back to native artifacts under the current change when the user explicitly asks to capture
- Do not escalate an explore-stage confirmation directly into "start writing the spec" or "start implementation" or any other stage transition
