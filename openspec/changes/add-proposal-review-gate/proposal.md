## Why

Praxis currently takes a change from proposal artifacts straight into `apply` without a first-class review pass for the proposal itself. That makes it hard to get a second model's critique on scope, design, and task breakdown before implementation, especially in hosts that run the main flow on a single model.

## What Changes

- Add a manual OpenSpec proposal review capability with a host-facing command named `/spec-review`.
- Define a review request contract that identifies the active workspace, change, and required `proposal-review` skill for a reviewer subagent.
- Support optional reviewer agent and model overrides so proposal authoring and proposal review can run on different models.
- Require every review backend to operate against the same active workspace as the main change, including external dispatch paths such as MCP.
- Persist each review run as a change-local artifact so users can trigger review multiple times and compare feedback across runs.
- Keep proposal review advisory only: it does not block `/opsx:apply`, does not auto-run, and does not add a new CLI fallback path.

## Capabilities

### New Capabilities
- `proposal-review`: Manual review of the current OpenSpec change artifacts through `/spec-review`, including cross-model reviewer selection and repeatable review outputs.

### Modified Capabilities
- None.

## Impact

- Affected code:
  - host command assets under `assets/commands/`
  - agent projection wiring in `src/projection/`
  - OpenSpec capability selection / review request helpers in `src/core/praxis-devos.js` and related modules
  - capability evidence / monitoring if review runs are tracked in Praxis state
- Affected systems:
  - OpenSpec proposal workflow
  - host command integrations for supported agents
  - multi-agent or external dispatch integration for cross-model review
  - workspace binding rules for manual review execution
