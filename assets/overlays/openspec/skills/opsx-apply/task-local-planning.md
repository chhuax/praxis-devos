# Task-Local Planning Contract

Use this contract when the current OpenSpec task is too coarse to execute safely as-is.

This is a stripped-down, embedded planning method for `opsx-apply`. It borrows the strongest parts of `writing-plans` while removing the parts that do not fit OpenSpec apply:

- no separate workflow
- no `docs/superpowers/...` output
- no persistent plan artifact by default
- no automatic handoff to subagent execution

## Overview

Write a concise internal micro-plan as if the executing agent has limited context and should not improvise across unclear boundaries.

The micro-plan must answer:

- what the current OpenSpec task must accomplish before it can be checked off
- which files are expected to change
- which steps must happen in order
- how correctness will be verified
- whether any part is truly safe to parallelize

## Scope Check

Before decomposing, confirm the current OpenSpec task is still one coherent implementation target.

- If the task hides multiple unrelated subsystems, pause and push the issue back to the OpenSpec artifacts instead of forcing a larger internal plan.
- If the task is coherent but too broad to execute directly, decompose it here.
- If the task is already small and obvious, skip the micro-plan and execute directly.

## File Structure First

Before defining steps, map the files involved and what each one is responsible for.

- Prefer exact file paths.
- Distinguish between create, modify, and verify targets.
- Follow existing codebase boundaries instead of inventing a refactor.
- If one step would sprawl across too many unrelated files, that is a signal to pause and reassess the task boundary.

This file map is not documentation for the user. It is a guardrail for execution quality.

## Bite-Sized Step Granularity

Each step should be a small executable action with one clear outcome.

Good step boundaries:

- write the failing test
- run the targeted test and confirm the expected failure
- implement the minimum code path
- run the targeted verification
- update a narrow integration point

Bad step boundaries:

- implement the feature
- add validation and edge cases
- update code and tests
- refactor as needed

If a step contains multiple verbs or outcomes, split it.

## Output Shape

Create the micro-plan in working context only. Keep it compact, but explicit enough to guide execution:

```text
Task intent
- <what this OpenSpec task must accomplish before it can be checked off>

Touched files
- Modify: <exact/path>
- Create: <exact/path>
- Verify: <exact/path or command target>

Execution steps
1. <small concrete step>
2. <small concrete step>
3. <small concrete step>

Verification checkpoints
- <targeted test / command / manual check>

Parallel notes
- Sequential: <steps that must remain ordered>
- Optional parallel: <only if there is a genuinely safe split>
```

## TDD Preference

For code changes with testable behavior, prefer a test-first sequence inside the micro-plan:

1. write the failing test
2. run it and verify the expected failure
3. write the minimal implementation
4. run the targeted test and verify it passes
5. run any required surrounding verification

Configuration-only, template-only, or docs-only changes do not require forced TDD.

## No Placeholders

These are planning failures. Do not write:

- `TBD`, `TODO`, `implement later`, `fill in details`
- `add appropriate error handling`
- `handle edge cases`
- `write tests`
- `update code as needed`
- references to another step without restating the concrete action

The micro-plan does not need full code blocks like the full `writing-plans` skill, but each step must still say what will be done in a way that is executable without guesswork.

## Parallel Decision Rule

Planning does not imply parallel execution.

- Default to sequential execution in the current agent.
- Mark work as optionally parallel only when the split is genuinely safe.
- Safe parallelization requires disjoint ownership boundaries, low coordination cost, and no hidden ordering dependency.
- If you are unsure whether the split is safe, keep it sequential.

## Self-Review

Before executing, quickly review the micro-plan:

1. Does every step serve the current OpenSpec task rather than expanding scope?
2. Are file paths and verification targets concrete enough to execute?
3. Are there any vague or placeholder steps left?
4. Is any claimed parallel split actually safe?

Fix issues inline before starting work.

## Completion Semantics

- Micro-steps are internal execution structure only. They do not become official OpenSpec tasks.
- The OpenSpec task remains unchecked until all required micro-steps are complete and verification passes.
- If any required micro-step is blocked or incomplete, report the outer task as paused or blocked and leave it unchecked.
- If execution reveals missing requirements, design drift, or artifact errors, stop and return to the relevant OpenSpec artifact instead of inventing more micro-steps.
