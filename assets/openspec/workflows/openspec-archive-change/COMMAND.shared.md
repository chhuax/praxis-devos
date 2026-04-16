Use this command to archive a completed or intentionally concluded OpenSpec change.

Expect an optional change name. If none is provided, list active changes and let the user choose.

Shared workflow expectations:

- Check artifact completion and task completion before archiving.
- Warn clearly when archiving with incomplete work, then require confirmation.
- Summarize spec-sync implications before moving the change into archive.
- Archive to `openspec/changes/archive/YYYY-MM-DD-<change>/`.
- Report the archive result, schema, and any skipped sync work.
