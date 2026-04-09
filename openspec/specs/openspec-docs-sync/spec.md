# openspec-docs-sync Specification

## Purpose
TBD - created by archiving change add-openspec-docs-context-routing. Update Purpose after archive.
## Requirements
### Requirement: OpenSpec workflows SHALL support docs context pack consumption

The system SHALL support consuming a docs context pack during OpenSpec-driven work so AI tasks use project docs intentionally instead of ad hoc scanning.

#### Scenario: Propose flow can read docs context pack
- **WHEN** an OpenSpec proposal flow starts for a project that already has docs artifacts
- **THEN** the workflow may build a docs context pack
- **AND** that pack follows the same routing rules as normal task routing
- **AND** proposal flow does not require an immediate docs refresh

#### Scenario: Apply flow builds docs context before implementation
- **WHEN** an OpenSpec apply flow begins
- **THEN** the workflow can build a docs context pack for the active change
- **AND** the pack may include change-aware module routing when change metadata or changed paths make that possible

### Requirement: OpenSpec apply and archive SHALL assess whether docs refresh is needed

The system SHALL define deterministic refresh assessment points in OpenSpec apply and archive stages.

#### Scenario: Apply completion assesses docs refresh need
- **WHEN** implementation work for an OpenSpec change reaches completion or handoff
- **THEN** the workflow performs a docs refresh assessment
- **AND** the assessment determines whether `devos-docs` refresh should run for that change

#### Scenario: Archive preparation assesses docs refresh need
- **WHEN** an OpenSpec change is preparing for archive
- **THEN** the workflow performs a docs refresh assessment
- **AND** the result is used to decide whether docs artifacts must be refreshed before archive

### Requirement: Docs refresh assessment SHALL be deterministic

The system SHALL evaluate docs refresh need using deterministic signals rather than free-form model judgment.

#### Scenario: Surface change triggers refresh assessment
- **WHEN** changed paths or change metadata indicate the primary external surface or its source location has changed
- **THEN** docs refresh assessment reports that refresh is needed

#### Scenario: Module topology change triggers refresh assessment
- **WHEN** changed paths include Maven aggregation `pom.xml` files or other discovered module topology inputs
- **THEN** docs refresh assessment reports that refresh is needed

#### Scenario: Change metadata can trigger refresh assessment
- **WHEN** OpenSpec change metadata or artifacts explicitly indicate project-map, external-surface, or module-structure impact
- **THEN** docs refresh assessment reports that refresh is needed

### Requirement: OpenSpec-linked docs refresh SHALL be change-aware

The system SHALL allow `devos-docs` refresh to consume OpenSpec change context instead of relying only on full-project heuristics.

#### Scenario: Refresh receives change-aware context
- **WHEN** OpenSpec-linked docs refresh is invoked
- **THEN** the input includes the active `changeId`
- **AND** includes the relevant OpenSpec artifact paths for that change
- **AND** includes changed paths or equivalent deterministic change context

#### Scenario: Refresh remains non-destructive under OpenSpec linkage
- **WHEN** OpenSpec-linked docs refresh runs
- **THEN** it still obeys existing docs validation and non-destructive refresh rules
- **AND** it does not implicitly delete, rename, or relocate docs artifacts

### Requirement: OpenSpec linkage SHALL preserve current docs scope

The system SHALL keep OpenSpec-linked docs sync focused on the lightweight docs contract already in use.

#### Scenario: OpenSpec-linked refresh writes only current docs artifacts
- **WHEN** OpenSpec-linked docs refresh completes successfully
- **THEN** any resulting writeback remains limited to `docs/surfaces.yaml`
- **AND** `docs/codemaps/project-overview.md`
- **AND** `docs/codemaps/module-map.md` when applicable
- **AND** `docs/codemaps/modules/<artifactId>.md` when applicable

#### Scenario: OpenSpec linkage does not expand to other docs families
- **WHEN** this capability is implemented
- **THEN** it does not require automatic generation of `reference`, `guides`, or `runbooks`

