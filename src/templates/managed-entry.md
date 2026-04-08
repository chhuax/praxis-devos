> This block is maintained by Praxis DevOS. Run `npx praxis-devos sync` to refresh it.

## Flow Selection

- Enter an OpenSpec proposal flow for medium or large changes, cross-module changes, interface or compatibility changes, architecture or process refactors, or any request with unclear requirements, unresolved `open questions`, or competing solution options.
- In those cases, start with `/opsx:propose` or `/opsx:explore` and finish clarification and option comparison inside the current OpenSpec stage before implementation.
- Use `/opsx:apply` only for small, local implementation work with low ambiguity and no proposal need.
- Reviews and audit-style requests should follow the review flow.

## Project Reading Order

- On first entry, read `docs/codemaps/` before scanning the whole repository.
- Read `contracts/surfaces.yaml` to find the primary external surface and its source location.
- When the primary external surface changes, update `contracts/surfaces.yaml` first.
- When host command wiring exists, prefer `/devos:docs-init` and `/devos:docs-refresh` so a normal sub-agent can run `devos-docs`.
- Treat `praxis-devos docs init|refresh|check` as the compatibility / fallback path rather than the primary AI-first entrypoint.
- Derived docs work may be delegated to a docs sub-agent, but the docs sub-agent should only modify `docs/codemaps/**`.
- The main agent remains responsible for updating `contracts/surfaces.yaml` and running `docs check` before completion.

## OpenSpec + Superpowers Contract

- Inside OpenSpec, `opsx-explore`, `opsx-propose`, `opsx-apply`, and `opsx-archive` are the only visible workflow layer.
- Superpowers may run only as embedded capabilities inside the active OpenSpec stage.
- Do not re-announce `Using [skill]` or `superpowers:<skill>`, and do not create a second workflow, second wrap-up, or separate document tree.
- Keep all stage-local outputs under `openspec/changes/<change>/...`; do not write `docs/superpowers/...`.
- Capability execution is judged by evidence in the user-level Praxis state directory, not by user-visible announcements.

## Stage Gates

- Proposal Gate: do not enter multi-step implementation until Proposal Intake has converged `change target`, `intended behavior`, `scope/risk`, and `open questions`, and the native OpenSpec proposal flow has been executed through `/opsx:propose` or `/opsx:explore` plus native OpenSpec commands.
- Proposal Gate: if `open questions` or competing solution directions remain, stay in propose or explore and finish clarification before implementation.
- Apply Gate: before implementation, check branch safety, use an isolated workspace when needed, and keep any multi-step plan under the approved OpenSpec change.
- Execution Gate: when bugs, failed tests, exceptions, or regressions appear, perform root-cause analysis first; keep all parallel work, subtasks, outputs, and status under the current change.
- Completion Gate: before claiming completion, opening a PR, or merging, run full verification and record the actual verification result. Verification is a pre-completion check, not a second completion workflow.
