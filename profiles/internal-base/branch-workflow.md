# Branch Workflow Baseline

Use a short-lived branch per unit of change.

Recommended prefixes:

- `feat/<scope>` for user-visible behavior or capability additions
- `fix/<scope>` for defect correction
- `chore/<scope>` for maintenance, tooling, or low-risk housekeeping
- `change/<change-id>` when implementation is tied to an approved OpenSpec change

Operating expectations:

- Confirm the current branch matches the work before editing code.
- Do not mix unrelated changes on the same branch.
- Keep branch names stable after review starts unless the branch was created incorrectly.
- Merge or rebase from the trunk branch often enough to keep verification signal current.
- If the task is governed by OpenSpec, keep one implementation branch per approved `change-id`.
