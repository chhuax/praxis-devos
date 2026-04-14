## PRAXIS_DEVOS_OVERLAY

Framework-specific coordination for embedded Superpowers usage:

- `opsx-explore` remains the only visible flow for this stage.
- If you invoke `brainstorming` internally, do not announce `Using brainstorming` or start a second workflow.
- If discussion is already tied to a change, keep conclusions and notes in the current change artifacts instead of creating `docs/superpowers/...`.
- Superpowers methods affect how you think, not the fact that you are still in `explore`.
- When invoking any internal Superpowers capability, pass the current flow type, current stage goal, current artifact locations, and current output constraints. If a change is already active, also pass the current change id.

Embedded capability contract:

- `mode: embedded`
- `owner_flow: opsx-explore`
- `visibility: internal`
- `artifact_targets: current change artifacts only`
- `evidence_target: user-level Praxis state directory`

Internal capabilities must not:

- announce a second workflow
- create `docs/superpowers/...`
- output a second final recap

Stage hooks:

- If scope is unclear, open questions remain, or multiple approaches need comparison, invoke `brainstorming` internally to clarify constraints and compare options.
- If the discussion becomes concrete enough to capture, write conclusions back to the current change artifacts such as `proposal.md`, `design.md`, `tasks.md`, or a relevant spec.
- When writing back to change artifacts, honor the project artifact language policy from `openspec/config.yaml` when present.
- If `openspec/config.yaml` does not declare an artifact language policy, continue in the dominant language already present in that change and do not switch languages mid-change unless the user explicitly requests it.
- If the user is still exploring, stay in `explore` and do not force a transition to proposal or implementation.
- After `openspec list --json`, if the main issue is still ambiguity, disagreement, or missing constraints, invoke `brainstorming` internally and continue exploring inside the same visible flow.
