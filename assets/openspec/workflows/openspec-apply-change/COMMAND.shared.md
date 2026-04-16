Use this command to implement tasks for an existing OpenSpec change.

Expect an optional change name. If none is provided, resolve it from active changes or clarify with the user before editing code.

Shared workflow expectations:

- Check `openspec status --change "<name>" --json` and `openspec instructions apply --change "<name>" --json` before implementation.
- Read all required context artifacts before touching code.
- Work task by task and update task checkboxes as each task completes.
- Pause and surface blockers instead of guessing through ambiguity.
- When all tasks are done, suggest `/opsx:archive`.
