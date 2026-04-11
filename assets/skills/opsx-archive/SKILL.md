---
name: opsx-archive
description: Archive a completed change in the experimental workflow. Use when the user wants to finalize and archive a change after implementation is complete.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

Archive a completed change in the experimental workflow.

**Input**: Optionally specify a change name. If omitted, check whether it can be inferred from conversation context. If vague or ambiguous, you MUST prompt for available changes.

## PRAXIS_DEVOS_OVERLAY

Framework-specific coordination for embedded Superpowers usage:

- `opsx-archive` remains the only visible flow for this stage.
- If you use verification methods internally before archiving, do not announce `Using verification-before-completion`.
- Archive explanations, verification results, and sync conclusions must stay attached to the current change or archive flow. Do not create `docs/superpowers/...`.
- Internal verification methods help determine whether archiving is safe, but they do not create a second completion flow.
- When invoking any internal Superpowers capability, pass the current flow type, current change id, current stage goal, current artifact locations, and current output constraints.

Embedded capability contract:

- `mode: embedded`
- `owner_flow: opsx-archive`
- `visibility: internal`
- `artifact_targets: openspec/changes/<change>/...`
- `evidence_target: user-level Praxis state directory`

Internal capabilities must not:

- announce a second workflow
- create `docs/superpowers/...`
- output a second final recap

Stage hooks:

- Before saying a change is ready to archive, invoke `verification-before-completion` internally and confirm artifacts, tasks, and validation evidence are sufficient.
- If `tasks.md` listed docs tasks (blackbox, api-doc, docs-refresh), verify they were completed. Missing docs that were never planned in `tasks.md` do not block archive.
- If delta specs still need syncing, provide the sync assessment first and let the user decide whether to sync before archive.
- Task-completion checks are part of the same internal verification pass before archive.

---

**Steps**

1. **If no change name is provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show only active changes, not archived ones.
   Include the schema for each change if available.

   **IMPORTANT**: Do not guess or auto-select a change. Always let the user choose.

2. **Check artifact completion status**

   Run:
   ```bash
   openspec status --change "<name>" --json
   ```

   Parse the JSON to understand:
   - `schemaName`
   - `artifacts` and their status

   **If any artifacts are not `done`:**
   - Display a warning listing incomplete artifacts
   - Use **AskUserQuestion tool** to confirm that the user wants to proceed
   - Proceed if the user confirms

3. **Check task completion status**

   Read the tasks file, typically `tasks.md`, and check for incomplete tasks.

   Count:
   - `- [ ]` for incomplete
   - `- [x]` for complete

   **If incomplete tasks are found:**
   - Display a warning showing the count
   - Use **AskUserQuestion tool** to confirm that the user wants to proceed
   - Proceed if the user confirms

   **If no tasks file exists:** proceed without a task warning.

4. **Assess delta spec sync state**

   Check for delta specs at `openspec/changes/<name>/specs/`. If none exist, continue without a sync prompt.

   **If delta specs exist:**
   - Compare each delta spec with its corresponding main spec at `openspec/specs/<capability>/spec.md`
   - Determine what changes would be applied
   - Show a combined summary before prompting

   **Prompt options:**
   - If changes are needed: `Sync now (recommended)` or `Archive without syncing`
   - If already synced: `Archive now`, `Sync anyway`, or `Cancel`

   If the user chooses sync, use Task tool with:
   `Use Skill tool to invoke openspec-sync-specs for change '<name>'. Delta spec analysis: <include the analyzed delta spec summary>`

   Proceed to archive regardless of whether the user syncs.

5. **Perform the archive**

   Create the archive directory if it does not exist:
   ```bash
   mkdir -p openspec/changes/archive
   ```

   Generate the target name using the current date: `YYYY-MM-DD-<change-name>`

   **Check whether the target already exists:**
   - If yes: fail with an error and suggest renaming the existing archive or using a different date
   - If no: move the change directory to archive

   ```bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   ```

6. **Display summary**

   Show:
   - Change name
   - Schema
   - Archive location
   - Whether specs were synced
   - Any warnings that were acknowledged

**Output On Success**

```text
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs (or "No delta specs" or "Sync skipped")

All artifacts complete. All tasks complete.
```

**Guardrails**

- Always prompt for change selection if no name is provided
- Use the artifact graph from `openspec status --json` for completion checks
- Do not block archive on warnings. Inform and confirm instead
- Preserve `.openspec.yaml` when moving to archive
- Show a clear summary of what happened
- If sync is requested, use the `openspec-sync-specs` path
- If delta specs exist, always run the sync assessment and show the combined summary before prompting
