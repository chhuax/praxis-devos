---
name: opsx-apply
description: Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

Implement tasks from an OpenSpec change.

**Input**: Optionally specify a change name. If omitted, check whether it can be inferred from conversation context. If vague or ambiguous, you MUST prompt for available changes.

## PRAXIS_DEVOS_OVERLAY

Framework-specific coordination for embedded Superpowers usage:

- `opsx-apply` remains the only visible flow for this stage.
- If you use planning, debugging, verification, or parallel execution methods internally, do not announce `Using writing-plans`, `Using systematic-debugging`, or `superpowers:...`.
- Plan refinement, task status, and implementation notes must stay in the current change artifacts. Do not create `docs/superpowers/...`.
- Internal methods can help execution, but they do not change the fact that you are still in `apply`.
- When invoking any internal Superpowers capability, pass the current flow type, current change id, current stage goal, current artifact locations, and current output constraints.

Embedded capability contract:

- `mode: embedded`
- `owner_flow: opsx-apply`
- `visibility: internal`
- `artifact_targets: openspec/changes/<change>/...`
- `evidence_target: user-level Praxis state directory`

Internal capabilities must not:

- announce a second workflow
- create `docs/superpowers/...`
- output a second final recap

Stage hooks:

- If a task is clearly multi-step and needs finer breakdown, invoke `writing-plans` internally to expand it into concrete steps. Keep the expansion in context only — do not write it back to `tasks.md`.
- When a task involves new logic with testable behavior, prefer `test-driven-development` internally. Tasks that change config, templates, or docs do not require TDD.
- Before implementation, build a docs context pack when project docs exist:
  - always read `docs/surfaces.yaml`
  - always read `docs/codemaps/project-overview.md`
  - include `docs/codemaps/module-map.md` only for multi-module projects
  - include `docs/codemaps/modules/<artifactId>.md` only when change-aware routing can identify the target module
- Read Docs Impact intent from change artifacts when present and use it as advisory routing context for docs work. `tasks.md` is the authoritative source for which docs tasks to execute.
- When `tasks.md` explicitly lists docs tasks (blackbox, api-doc, etc.), execute them after the relevant implementation has stabilized. Invoke `devos-change-docs` for declared targets.
- If you hit a bug, failed test, regression, exception, or blocker, invoke `systematic-debugging` internally before deciding on a fix.
- After all tasks are complete, consider running `requesting-code-review` internally on the full diff. Address critical issues before proceeding to archive.
- Before completion or handoff, if `tasks.md` includes a docs-refresh task, run the docs refresh assessment and invoke `devos-docs` in `mode=refresh`. If no docs-refresh task is listed, skip this step.
- Before saying work is complete, fixed, or passing, invoke `verification-before-completion` internally and use real verification evidence in the status update.
- When all tasks are complete and verification passes, suggest the user run `finishing-a-development-branch` to handle merge, PR, or worktree cleanup before proceeding to archive.

---

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` and use the **AskUserQuestion tool** to let the user select

   When it helps the user understand the context, keep it inside the single OpenSpec narrative, for example:
   `Currently in opsx-apply, change: <name>`

2. **Check status to understand the schema**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to understand:
   - `schemaName`: the workflow being used
   - which artifact contains the tasks

3. **Get apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns:
   - `contextFiles`: the file paths to read before implementing
   - progress counts
   - task list and status
   - a dynamic instruction

   **Handle states:**
   - If `state: "blocked"`: show the message and suggest `openspec-continue-change`
   - If `state: "all_done"`: show that all tasks are complete and suggest archive
   - Otherwise: proceed to implementation

4. **Read context files**

   Read the files listed in `contextFiles`.
   The exact files depend on the schema:
   - **spec-driven** usually includes `proposal`, `specs`, `design`, and `tasks`
   - other schemas should follow the CLI output

5. **Show current progress**

   Display:
   - The current schema
   - Progress, for example `N/M tasks complete`
   - A brief overview of remaining tasks
   - The dynamic instruction from the CLI

6. **Implement tasks until done or blocked**

   For each pending task:
   - Show which task is being worked on
   - Make the required code changes
   - Keep changes minimal and focused
   - Mark the task complete in the tasks file by changing `- [ ]` to `- [x]`
   - Continue to the next task

   **Pause if:**
   - The task is unclear and needs clarification
   - Implementation reveals a design issue and artifacts should be updated
   - An error or blocker is encountered
   - The user interrupts

7. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress, for example `N/M tasks complete`
   - If all tasks are done, suggest archive
   - If paused, explain why and wait for guidance

**Output During Implementation**

```text
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
```

**Output On Completion**

```text
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! Ready to archive this change.
```

**Output On Pause**

```text
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

**Guardrails**

- Keep going through tasks until done or blocked
- Always read `contextFiles` before starting
- If a task is ambiguous, pause and ask before implementing
- If implementation reveals artifact issues, pause and suggest updates
- Keep code changes minimal and scoped to each task
- Update the task checkbox immediately after completing each task
- Pause on errors, blockers, or unclear requirements. Do not guess
- Use `contextFiles` from CLI output rather than assuming fixed filenames
- Keep only one visible flow for the user rather than exposing a second methodology layer

**Fluid Workflow Integration**

This skill supports an actions-on-a-change model:

- **Can be invoked anytime**: before all artifacts are done if tasks already exist, after partial implementation, or interleaved with other actions
- **Allows artifact updates**: if implementation reveals design issues, suggest updating artifacts rather than treating the workflow as a rigid one-way phase machine
