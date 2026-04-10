## ADDED Requirements

### Requirement: Users can manually review the current OpenSpec change through `/spec-review`
The system SHALL provide a host-facing command named `/spec-review` that reviews the current OpenSpec change artifacts and returns advisory review feedback before or between proposal revisions.

#### Scenario: Manual review targets the active change
- **WHEN** a user invokes `/spec-review` while working in an active OpenSpec change
- **THEN** the system reviews the current change rather than asking for a separate review target
- **AND** the review input includes the change's available `proposal.md`, `design.md`, `specs/**/*.md`, and `tasks.md` artifacts

#### Scenario: Review reports missing proposal artifacts
- **WHEN** a user invokes `/spec-review` for a change that does not yet contain all expected proposal artifacts
- **THEN** the system still reviews the available artifacts
- **AND** the review result explicitly lists any expected artifacts that were missing from the review set

### Requirement: Proposal review SHALL stay bound to the active workspace
The system SHALL run proposal review against the same active workspace that contains the current OpenSpec change, regardless of whether review is executed by a native subagent or an external dispatch backend.

#### Scenario: Native subagent review uses the current workspace
- **WHEN** the current host can execute `/spec-review` through a native subagent path
- **THEN** the reviewer runs against the same active workspace as the main proposal flow
- **AND** any resulting review artifact is written under that same workspace's change directory

#### Scenario: External dispatch review preserves workspace identity
- **WHEN** `/spec-review` is executed through an external dispatch backend such as MCP
- **THEN** the dispatched reviewer receives the active workspace identity for the current change
- **AND** it does not create a separate repository clone or independent worktree for that review run

### Requirement: Proposal review SHALL dispatch an explicit reviewer skill
The system SHALL identify the reviewer skill explicitly when dispatching proposal review so every backend evaluates the same artifact type with the same review intent.

#### Scenario: Default review request includes the proposal review skill
- **WHEN** a user invokes `/spec-review`
- **THEN** the review request includes the `proposal-review` skill identifier
- **AND** the reviewer uses that skill to inspect the active change artifacts

#### Scenario: Reviewer resolves artifacts from the current workspace
- **WHEN** the reviewer receives a workspace-bound proposal review request with a `changeId` and skill identifier
- **THEN** it reads `openspec/changes/<changeId>/` from the bound workspace
- **AND** it does not require the caller to inline every reviewed artifact in the request payload

### Requirement: `/spec-review` supports optional reviewer agent and model overrides
The system SHALL allow users to request a reviewer agent and reviewer model that differ from the main proposal flow.

#### Scenario: Default review uses the current host reviewer path
- **WHEN** a user invokes `/spec-review` without reviewer overrides
- **THEN** the system selects the default reviewer path available to the current host environment

#### Scenario: Explicit override must be honored or rejected
- **WHEN** a user invokes `/spec-review` with an explicit reviewer agent or reviewer model
- **THEN** the system either dispatches review using that requested agent or model
- **AND** or returns an actionable error explaining why that request is unsupported

### Requirement: Proposal review results are advisory and repeatable
The system SHALL treat proposal review as non-blocking guidance and preserve each review run as a separate change-local artifact.

#### Scenario: Review does not block apply
- **WHEN** a proposal review run completes with warnings or blocking findings in the review content
- **THEN** the system does not prevent the user from entering `/opsx:apply`
- **AND** it does not change the OpenSpec apply-required artifact set

#### Scenario: Repeat reviews preserve history
- **WHEN** a user runs `/spec-review` multiple times for the same change
- **THEN** the system stores each run as a separate artifact under that change
- **AND** it does not overwrite a previous review result by default

### Requirement: Review artifacts capture reviewer identity and disposition
The system SHALL persist enough metadata with each review result to explain how the review was produced.

#### Scenario: Review artifact records reviewer metadata
- **WHEN** a proposal review artifact is written
- **THEN** it includes the requested reviewer agent if one was provided
- **AND** it includes the requested reviewer model if one was provided
- **AND** it includes the resolved review backend used to execute the review

#### Scenario: Review artifact records disposition and findings
- **WHEN** a proposal review artifact is written
- **THEN** it includes a final disposition for the review run
- **AND** it includes the findings produced for the reviewed change artifacts
