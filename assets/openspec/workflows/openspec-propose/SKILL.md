---
name: openspec-propose
description: Use when a rough change request needs to be turned into structured OpenSpec proposal-stage artifacts such as a change proposal, RFC, architecture or design doc, spec, and task breakdown before implementation.
compatibility: Requires openspec CLI. Works best with Superpowers skills.
metadata:
  author: openspec
  version: "1.3"
---

Create a new OpenSpec change and push it toward **apply-ready** whenever possible.

## Core Positioning

- OpenSpec owns the change, schema, artifact dependencies, status, instructions, and readiness
- Superpowers owns requirement convergence and task breakdown
- Final outputs must remain only inside the current change directory

## Capability Routing

- If the input is still vague, the boundaries are unstable, or multiple reasonable approaches exist, use `superpowers:brainstorming` first
- When generating `tasks.md`, default to `superpowers:writing-plans`
- In the propose stage, `writing-plans` is only for the **entire `tasks.md`**

## Input

The user should provide at least one of the following:

- A change name
- A description of what they want to build or fix

If they only provide a description, derive a kebab-case name from it.

Common trigger phrases include:

- "Write an OpenSpec proposal / change proposal"
- "Help me fill in the spec / design doc / tasks"
- "Break this change request into executable tasks"
- "Complete the OpenSpec artifacts so implementation can begin"

## Execution Steps

### 1. Determine the change name

- If the name and goal are already clear, use them directly
- Otherwise, first decide whether `superpowers:brainstorming` is needed
- After convergence, determine the kebab-case change name

### 2. Check whether a change with the same name already exists

If a change with the same name already exists:

- Do not overwrite it
- Let the user decide whether to continue the existing change or use a new name

### 3. Enter an isolated workspace

Before creating the change, prefer calling `superpowers:using-git-worktrees`.

If you are already in a suitable isolated worktree, continue directly.

### 4. Create the change and read its status

Run:

```bash
openspec new change "<name>"
openspec status --change "<name>" --json
```

Read:

- `applyRequires`
- `artifacts`

The goal is to prioritize the artifact set required to make the change apply-ready.

### 5. Generate artifacts in dependency order

Only process artifacts whose dependencies are satisfied and whose status is `ready`:

```bash
openspec instructions <artifact-id> --change "<name>" --json
```

For each artifact:

1. Read `instruction`, `template`, `outputPath`, and `dependencies`
2. Read completed dependency artifacts first
3. Write content using the template structure
4. Treat `context` and `rules` as constraints; do not copy them verbatim into the file
5. After writing, confirm the file exists on disk, then refresh `openspec status`

After the change reaches apply-ready, continue generating any remaining non-blocking `ready` artifacts by default unless the user asks you to stop.

Keep even minimal artifact examples concrete, actionable, and verifiable, for example:

```md
# Requirement
- Users can refresh the managed block through `praxis-devos update`

# Acceptance
- When the template version changes, the command updates the managed block in the target file
- When the template has not changed, the command remains idempotent and does not write unnecessary changes
```

Avoid vague statements such as "support updates" or "complete the capability" that cannot be implemented or verified directly.

### 6. Special handling when generating `tasks.md`

If the current artifact is `tasks`:

1. Draft the task list based on `specs` and `design`
2. Then call `superpowers:writing-plans`
3. Use it to refine the entire `tasks.md` into an executable task structure

Apply these explicit constraints to `writing-plans`:

- Run only as an embedded capability inside the current OpenSpec propose stage
- Improve only the full `tasks.md`
- Do not generate extra plan files
- Do not enter a separate Superpowers documentation, approval, wrap-up, or secondary workflow
- Stay concise by default; do not expand every task into a heavyweight plan
- Only add a few sub-bullets when necessary, such as `Validation` or `Related Requirements`

### 7. Output status

After completion, summarize:

- The change name and path
- The artifacts that were generated
- The current readiness state
- The next action

## Guardrails

- The goal is to make the change apply-ready, not merely create an empty directory
- Always read dependency artifacts before generating a new artifact
- Do not copy `context` or `rules` blocks verbatim into artifacts
- Do not generate an extra parallel Superpowers documentation system
- Do not enter a second visible workflow; Superpowers may only operate as an embedded capability inside the current OpenSpec propose stage
- All stage outputs must stay under `openspec/changes/<change>/...`; do not write to `docs/superpowers/...`
- Do not implement business code during the propose stage
- In the propose stage, `writing-plans` is only for the full `tasks.md`
- If you need external capabilities, use `superpowers:brainstorming`, `superpowers:writing-plans`, and `superpowers:using-git-worktrees` exactly, and keep them limited to embedded use within the current stage rather than substituting similar methods
