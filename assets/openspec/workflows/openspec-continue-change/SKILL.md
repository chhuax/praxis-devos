---
name: openspec-continue-change
description: Continue an OpenSpec change by creating the next ready artifact. Use when the user wants to keep advancing proposal, specs, design, tasks, or similar artifacts without entering code implementation yet.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.2"
  generatedBy: "custom"
---

Continue an OpenSpec change, but create only the **next ready artifact** each time.

## Core Positioning

- OpenSpec owns change selection, artifact dependencies, status, and instructions
- Superpowers owns requirement convergence and task decomposition
- Advance only one artifact at a time
- The continue stage does not implement business code

## Exact Skill Protocol

- When this route is matched, you must call the corresponding **exact skill name**
- Do not substitute a similar local skill, todo list, manual breakdown, or long-form reasoning
- If the exact skill is unavailable, report that explicitly and pause the current routing

## Capability Routing

- If the current artifact depends on unclear goals, boundaries, or approaches, use `superpowers:brainstorming` first
- If the current artifact is `tasks.md`, call `superpowers:writing-plans` by default
- In the continue stage, `writing-plans` only serves the **entire `tasks.md`**
- Do not generate `docs/superpowers/plans/...` or any extra master plan

## Input

You may specify a change name. If none is given, first determine which change should be continued.

## Execution Steps

### 1. Select the change

- If the user provided a change name, use it directly
- Otherwise, run `openspec list --json`
- If multiple candidates exist, do not guess; let the user choose

### 2. Check status

Run:

```bash
openspec status --change "<name>" --json
```

Read:

- `schemaName`
- `artifacts`
- `isComplete`

If `isComplete: true`, show the final status and stop.

### 3. Choose the current ready artifact

- If any artifact has `status: "ready"`, create only the first one
- If there is no `ready` artifact, show the current status and explain that progress cannot continue yet

### 4. Read instructions and generate the artifact

Run:

```bash
openspec instructions <artifact-id> --change "<name>" --json
```

Then:

1. Read dependency artifacts
2. Write the file using the `template` structure
3. Treat `context` and `rules` as constraints
4. Do not copy those constraint blocks verbatim into the artifact

### 5. Apply routing based on artifact type

- proposal / specs / design: if continuing to write would create false certainty, call `superpowers:brainstorming` first
- tasks: draft it first, then call `superpowers:writing-plans` to refine the full `tasks.md` into an executable task structure

Apply these explicit constraints to `writing-plans`:

- Improve only the current change's `tasks.md`
- Do not pre-split the apply stage into per-task micro-plans
- Do not generate a separate master plan file
- Keep the task list concise by default

### 6. Show progress

After creating one artifact, run again:

```bash
openspec status --change "<name>"
```

Show:

- Which artifact was created this round
- The current schema
- The current completion progress
- Which artifacts were unlocked next

## Guardrails

- Create only one artifact at a time
- Always read dependency artifacts before creating a new artifact
- Do not skip artifacts or create them out of order
- If the context is unclear, converge first instead of forcing a write
- Verify the file was written to the correct location before reporting progress
- Do not implement business code during the continue stage
- In the continue stage, `writing-plans` is only for the full `tasks.md`
