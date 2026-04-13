## PRAXIS_DEVOS_OVERLAY

Framework-specific coordination for embedded Superpowers usage:

- `opsx-propose` remains the only visible flow for this stage.
- If you invoke `brainstorming` internally to resolve ambiguity or compare approaches, do not announce `Using brainstorming` or start a second workflow.
- Proposal, design, and task output must stay under `openspec/changes/<name>/...`. Do not create `docs/superpowers/...`.
- Internal methods can help clarify and structure the proposal, but they do not replace the native OpenSpec proposal flow.
- When invoking any internal Superpowers capability, pass the current flow type, current change id, current stage goal, current artifact locations, and current output constraints.

Embedded capability contract:

- `mode: embedded`
- `owner_flow: opsx-propose`
- `visibility: internal`
- `artifact_targets: openspec/changes/<change>/...`
- `evidence_target: user-level Praxis state directory`

Internal capabilities must not:

- announce a second workflow
- create `docs/superpowers/...`
- output a second final recap

Stage hooks:

- At propose entry, check the current branch. If on main or master, suggest invoking `using-git-worktrees` to create an isolated workspace before generating any artifacts. Do not block if the user declines, but note that all change artifacts will be written to the current branch.
- If the request is still vague or there are many open questions, invoke `brainstorming` internally to narrow scope, compare options, and clarify constraints.
- If project docs already exist, read the docs context pack before broad repository scanning:
  - always `docs/surfaces.yaml`
  - always `docs/codemaps/project-overview.md`
  - `docs/codemaps/module-map.md` only for multi-module projects
  - `docs/codemaps/modules/<artifactId>.md` only when module routing is deterministic
- When generating or revising OpenSpec artifacts, honor the project artifact language policy from `openspec/config.yaml` when present.
- Read docs task policy from `openspec/config.yaml` when present. The current policy source is `praxis_devos.docs_tasks`.
- When `praxis_devos.docs_tasks.change_blackbox: true`, inject a `blackbox-test.md` task into `tasks.md` under a dedicated docs delivery section.
- Treat `praxis_devos.docs_tasks.change_api: auto` as: add an `api-doc.md` task only when proposal/design/spec context indicates externally visible API changes. If the policy is `true`, always add the task for API-touching changes. If it is `false`, skip it.
- Treat `praxis_devos.docs_tasks.project_api_sync: auto` as: when API changes require `api-doc.md`, also inject the later stable sync task for `docs/reference/api.md`. If the policy is `false`, do not add the sync task.
- When proposal or design artifacts are generated, include a short `Docs Impact` section as informational context and keep it aligned with injected docs tasks.
- When API changes are compatibility-sensitive, migration-sensitive, or breaking for callers, record that explicitly in `Docs Impact` so later `api-doc.md` generation includes a visible warning section.
- If the request is clear enough, return to the native proposal flow and generate the required change artifacts.
- Design decisions, task breakdowns, and scope changes must be written back into the current change instead of creating a parallel document set.
- If the initial request still has critical ambiguity, invoke `brainstorming` internally before proceeding.
- If an artifact requires extra user input because of scope disagreement, solution disagreement, or missing context, invoke `brainstorming` internally, capture the result in the current change artifacts, and then continue.
