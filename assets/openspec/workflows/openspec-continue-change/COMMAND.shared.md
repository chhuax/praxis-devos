Use this command to continue an existing OpenSpec change by creating the next ready artifact.

Expect an optional change name. If omitted, list recent active changes and let the user choose instead of guessing.

Shared workflow expectations:

- Inspect change status before deciding the next artifact.
- Create at most one ready artifact per invocation.
- Read dependency artifacts before writing the next one.
- Show what unlocked after the artifact was created.
- If the change is already complete, say so and point to implementation or archive.
