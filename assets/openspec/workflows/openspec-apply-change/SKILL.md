---
name: openspec-apply-change
description: Implement tasks inside an OpenSpec change. Use when the user wants to start implementation, continue implementation, or advance a change task by task. Prefer using Superpowers to refine and complete one or more unlocked tasks in the current implementation slice.
license: MIT
compatibility: Requires openspec CLI. Works best with Superpowers skills.
metadata:
  author: openspec
  version: "1.3"
  generatedBy: "custom"
---

Implement tasks within an OpenSpec change. You may advance through one or more unlocked tasks in `tasks.md` order until they are completed, blocked, or the user asks you to pause.

## Core Positioning

- OpenSpec owns change selection, reading `contextFiles`, identifying the current implementation slice, and maintaining `tasks.md` status
- Superpowers owns slice refinement, execution mode, TDD, debugging, and verification
- `tasks.md` is the default source of truth for tasks
- Do not generate a second master plan for the entire change

## Exact Skill Protocol

- When this route is matched, you must call the corresponding **exact skill name**
- Do not substitute a similar local skill, TodoWrite, manual task breakdown, or long-form reasoning
- If the exact skill is unavailable, report that explicitly and pause the current routing
- Before the current change and implementation slice are locked, do not create TodoWrite items, list execution todos, or enter implementation planning

## Capability Routing

### 1. Task refinement

By default, call `superpowers:writing-plans` first for the **current implementation slice**.

You may skip this only when the task is a very small change such as pure wording edits, mechanical renames, or formatting cleanup.

The scope of `writing-plans` is limited to the current implementation slice, not the whole change and not a separate plan file.

### 2. Execution mode routing

After `writing-plans`, do not jump straight into implementation. You must choose one of these two paths:

- If there is independent sub-work that can run in parallel: `superpowers:subagent-driven-development`
- Otherwise: `superpowers:executing-plans`

Unless you have clearly identified independent sub-work that can run in parallel, default to `superpowers:executing-plans`.

Before execution mode is confirmed, do not:

- Create TodoWrite entries
- Run test commands
- Start patching or coding
- Call implementation-oriented helper skills

Before starting implementation, you must explicitly output an "execution mode confirmation" that includes at least:

- The current task
- The chosen execution mode
- The reason for that choice

### 3. TDD

If the current implementation slice includes feature work, a bug fix, behavior changes, or test-code changes, you must call `superpowers:test-driven-development` before writing production code.

### 4. Debugging

If implementation or verification hits unclear failures, repeated failures, or the urge to patch by guessing, you must switch to `superpowers:systematic-debugging`.

### 5. Completion verification

Before claiming the current task is complete or updating its checkbox, you must call `superpowers:verification-before-completion`.

Without fresh verification evidence, you may not:

- Check off the current completed task
- Claim the current completed task is done
- Continue checking off additional tasks

## Input

You may specify a change name. If none is provided:

- First try to infer it from conversation context
- If the user mentioned a task number or title, use that to trace back to the current change first
- If there is no active change in the repo root, keep checking whether a change is in progress inside a worktree
- If there is only one active change, you may select it automatically
- If ambiguity remains, run `openspec list --json` to get candidates

In all cases, explicitly announce first:

```text
Current change in use: <name>
If you want to switch, explicitly specify another change.
```

## Execution Steps

### 1. Identify the current change

- If the user provided a change name, use it directly
- If the user mentioned a task number like `3.1`, search matching `tasks.md` files in the current workspace and worktrees first
- If `openspec list --json` returns empty but the user is clearly continuing an existing change, you must keep checking `.worktrees/*/openspec/changes/*/tasks.md`
- Once a unique match is found, switch into the corresponding worktree context and continue

### 2. Read apply context

Run:

```bash
openspec status --change "<name>" --json
openspec instructions apply --change "<name>" --json
```

Read:

- `schemaName`
- `contextFiles`
- `tasks`
- `state`

If `state: "blocked"`, tell the user to use `openspec-continue-change` first. If `state: "all_done"`, tell them the change can be archived.

### 3. Determine the current implementation slice

- By default, start from the next pending task
- If subsequent tasks are naturally continuous with the current work, dependencies are satisfied, and no context switch is needed, you may advance multiple tasks in the same apply run
- Clearly show the starting task and how far this implementation slice is intended to cover
- Check whether the slice contains any unmet prerequisite dependencies
- Before the current implementation slice is locked, do not create TodoWrite or expand into execution todos

### 4. Generate the current implementation-slice brief

First generate a brief focused only on the current implementation slice, covering at least:

- Which tasks are being advanced in this pass
- Relevant spec, design, and task context
- Main constraints
- What must be verified for each completed task

Do not write it to disk by default. Only write back into sub-bullets under the current task when necessary.

### 5. Refine the current implementation slice

Call `superpowers:writing-plans` by default, with these explicit constraints:

- Refine only the current implementation slice
- Do not write another master plan for the whole change
- Do not generate a separate plan file by default
- Stay concise by default
- If there is independent sub-work that can run in parallel, simply mark it explicitly
- Even if the slice contains only one task, do not inflate it into a heavyweight plan

### 6. Confirm execution mode and enter implementation

After `writing-plans` completes, first explicitly output the execution mode confirmation, then immediately call one of:

- `superpowers:subagent-driven-development`, or
- `superpowers:executing-plans`

The following sequences are forbidden:

- `writing-plans -> TodoWrite -> implementation`
- `writing-plans -> test-driven-development -> implementation`
- `writing-plans -> direct testing/patching/coding`

### 7. Complete implementation through the routed flow

- When implementation code is involved, go through `superpowers:test-driven-development` first
- Implement only the tasks inside the current implementation slice
- If later tasks are still inside the current slice and dependencies are satisfied, you may continue advancing them
- Do not jump to blocked tasks, unrelated tasks, or a new scope that has not been restated
- If work is parallelized, it may only happen inside the current implementation slice
- If implementation reveals inconsistency between the design and artifacts, pause immediately and report it

### 8. Verify and update status

After calling `superpowers:verification-before-completion`, you may change `- [ ]` to `- [x]` only when the key verification for that task has passed.

You may complete multiple tasks in one apply run, but each task must have fresh verification evidence before it is checked off, and `tasks.md` must be updated promptly after completion.

## Guardrails

- You must read `contextFiles` before starting
- Do not assume fixed artifact names; use the CLI output as the source of truth
- If `openspec list --json` returns empty, do not claim there is no active change until you have checked worktrees
- In the apply stage, `writing-plans` is only for the current implementation slice
- After `writing-plans`, you must enter execution-mode routing first
- If there is no clearly parallel sub-work, default to `superpowers:executing-plans`
- Before execution mode is confirmed, TodoWrite, testing, patching, and coding are not allowed
- If failures become unclear, you must enter `superpowers:systematic-debugging`
- Without `superpowers:verification-before-completion`, you may not check off the corresponding task
- One apply run does not need to be limited to a single task, but do not cross into blocked or unrelated tasks
