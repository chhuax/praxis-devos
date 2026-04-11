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

- Before executing a pending task, if the task description is high-level or ambiguous, invoke `writing-plans` internally to expand it into concrete steps with exact file paths, code, and verification commands. Keep the expansion in context only — do not write it back to `tasks.md`. Execute immediately after expansion.
- When implementing any task that involves writing code, follow `test-driven-development` internally: write a failing test first, verify it fails, write minimal code to pass, verify it passes. Do not write production code before a failing test exists.
- When executing a task, invoke `subagent-driven-development` internally when needed for context isolation or parallel execution. If subagent capability is not available, fall back to `executing-plans` instead. When invoked: dispatch a fresh implementer subagent, then a spec-reviewer subagent, then a code-quality-reviewer subagent. Do not mark the task complete until both review stages pass. Keep all outputs under the current change.
- Before implementation, build a docs context pack when project docs exist:
  - always read `docs/surfaces.yaml`
  - always read `docs/codemaps/project-overview.md`
  - include `docs/codemaps/module-map.md` only for multi-module projects
  - include `docs/codemaps/modules/<artifactId>.md` only when change-aware routing can identify the target module
- Read Docs Impact intent from change artifacts when present and treat it as the primary signal for docs refresh routing, with changed paths only as a fallback signal.
- Read `Docs Impact` declarations for `change-blackbox`, `change-api`, and `project-api-sync` when present and treat them as the primary signal for change-doc work.
- Complete change-local docs tasks after the relevant implementation has stabilized, not before.
- When change-local docs are required, invoke `devos-change-docs` to produce a structured result for:
  - `openspec/changes/<change>/blackbox-test.md`
  - `openspec/changes/<change>/api-doc.md`
  - `docs/reference/api.md` when stable sync is due
- Sidecar subagents may draft the `devos-change-docs` structured result, but final validation and writeback remain with the main flow.
- Before completion, do an AI self-check on change-doc coverage. If the implementation now clearly introduces API behavior changes but `tasks.md` or `Docs Impact` still do not declare the related API doc obligations, pause and update the change artifacts instead of silently finishing apply.
- If you hit a bug, failed test, regression, exception, or blocker, invoke `systematic-debugging` internally before deciding on a fix.
- After all tasks are complete, invoke `requesting-code-review` internally to review the full code diff for this change (from the commit before apply started to HEAD). Critical or Important issues must be resolved before proceeding to archive.
- Before completion or handoff, run a deterministic docs refresh assessment using changed paths, change artifacts, and Docs Impact intent. If refresh is needed, invoke `devos-docs` in `mode=refresh` with change-aware context and any target-module hints from Docs Impact, or explicitly record why refresh is deferred.
- Before completion or handoff, ensure change-doc obligations from `Docs Impact` have either been fulfilled or explicitly deferred with a reason in the current change artifacts.
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
