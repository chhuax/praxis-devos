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
- If `api-doc.md` exists for an API change with compatibility or migration risk, verify that the warning/compatibility section is present before archiving or syncing stable API docs.
- If delta specs still need syncing, provide the sync assessment first and let the user decide whether to sync before archive.
- Task-completion checks are part of the same internal verification pass before archive.
