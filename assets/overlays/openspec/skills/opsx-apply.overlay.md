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

- If the current OpenSpec task is too coarse to execute safely, create a task-local micro-plan before coding. Follow `./task-local-planning.md` for the decomposition contract.
- Keep task-local micro-plans ephemeral by default. Do not write them to `tasks.md`, do not create `docs/superpowers/...`, and do not create a second visible workflow.
- Execute task-local micro-plans inline in the current agent by default. Only consider parallel execution when `./task-local-planning.md` identifies clearly independent sub-steps with clean file ownership boundaries and low merge risk.
- OpenSpec task state remains authoritative. A coarse task stays incomplete until every required micro-step is finished and verification passes; if any micro-step is incomplete or blocked, keep the outer task unchecked.
- When a task involves new logic with testable behavior, prefer `test-driven-development` internally. Tasks that change config, templates, or docs do not require TDD.
- Before implementation, build a docs context pack when project docs exist:
  - always read `docs/surfaces.yaml`
  - always read `docs/codemaps/project-overview.md`
  - include `docs/codemaps/module-map.md` only for multi-module projects
  - include `docs/codemaps/modules/<artifactId>.md` only when change-aware routing can identify the target module
- Read docs task policy from `openspec/config.yaml` when present. `tasks.md` remains authoritative for execution, but the policy explains why blackbox/API doc tasks were or were not injected.
- Read Docs Impact intent from change artifacts when present and use it as advisory routing context for docs work. `tasks.md` is the authoritative source for which docs tasks to execute.
- When `tasks.md` explicitly lists docs tasks, execute them after the relevant implementation has stabilized:
  - `blackbox-test.md` -> invoke `devos-change-docs` with `mode=change-blackbox`
  - `api-doc.md` -> invoke `devos-change-docs` with `mode=change-api`
- If `api-doc.md` is generated for a breaking, migration-sensitive, or compatibility-risky API change, preserve an explicit compatibility warning section in the final document instead of hiding the risk in prose.
- If you hit a bug, failed test, regression, exception, or blocker, invoke `systematic-debugging` internally before deciding on a fix.
- After all tasks are complete, consider running `requesting-code-review` internally on the full diff. Address critical issues before proceeding to archive.
- Before completion or handoff, if `tasks.md` includes a docs-refresh task, invoke `devos-docs` in `mode=refresh`. If no docs-refresh task is listed, skip this step.
- Before saying work is complete, fixed, or passing, invoke `verification-before-completion` internally and use real verification evidence in the status update.
- When all tasks are complete and verification passes, suggest the user run `finishing-a-development-branch` to handle merge, PR, or worktree cleanup before proceeding to archive.
